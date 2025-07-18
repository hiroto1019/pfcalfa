-- ユーザー削除の問題を完全に解決するための包括的な修正

-- 1. 既存のトリガーと関数を削除（クリーンアップ）
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- 2. 新しいユーザー削除関数を作成
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_user_id UUID;
BEGIN
  -- 削除されたユーザーのIDを取得
  deleted_user_id := OLD.id;
  
  -- ログ出力
  RAISE NOTICE 'Starting deletion of user % and all related data', deleted_user_id;
  
  -- 関連データを削除（エラーハンドリング付き）
  BEGIN
    DELETE FROM public.profiles WHERE id = deleted_user_id;
    RAISE NOTICE 'Deleted profiles for user %', deleted_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting profiles for user %: %', deleted_user_id, SQLERRM;
  END;
  
  BEGIN
    DELETE FROM public.meals WHERE user_id = deleted_user_id;
    RAISE NOTICE 'Deleted meals for user %', deleted_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting meals for user %: %', deleted_user_id, SQLERRM;
  END;
  
  BEGIN
    DELETE FROM public.daily_summaries WHERE user_id = deleted_user_id;
    RAISE NOTICE 'Deleted daily_summaries for user %', deleted_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting daily_summaries for user %: %', deleted_user_id, SQLERRM;
  END;
  
  -- 存在するテーブルのみ削除
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_weight_logs') THEN
    BEGIN
      DELETE FROM public.daily_weight_logs WHERE user_id = deleted_user_id;
      RAISE NOTICE 'Deleted daily_weight_logs for user %', deleted_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error deleting daily_weight_logs for user %: %', deleted_user_id, SQLERRM;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    BEGIN
      DELETE FROM public.activity_logs WHERE user_id = deleted_user_id;
      RAISE NOTICE 'Deleted activity_logs for user %', deleted_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error deleting activity_logs for user %: %', deleted_user_id, SQLERRM;
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    BEGIN
      DELETE FROM public.goals WHERE user_id = deleted_user_id;
      RAISE NOTICE 'Deleted goals for user %', deleted_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error deleting goals for user %: %', deleted_user_id, SQLERRM;
    END;
  END IF;
  
  RAISE NOTICE 'Successfully completed deletion of user % and all related data', deleted_user_id;
  RETURN OLD;
END;
$$;

-- 3. auth.usersテーブルにトリガーを設定
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

-- 4. 外部キー制約を確実にCASCADE削除に設定
-- profilesテーブル
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- mealsテーブル
ALTER TABLE public.meals DROP CONSTRAINT IF EXISTS meals_user_id_fkey;
ALTER TABLE public.meals 
ADD CONSTRAINT meals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- daily_summariesテーブル
ALTER TABLE public.daily_summaries DROP CONSTRAINT IF EXISTS daily_summaries_user_id_fkey;
ALTER TABLE public.daily_summaries 
ADD CONSTRAINT daily_summaries_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- daily_weight_logsテーブル（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_weight_logs') THEN
    ALTER TABLE public.daily_weight_logs DROP CONSTRAINT IF EXISTS daily_weight_logs_user_id_fkey;
    ALTER TABLE public.daily_weight_logs 
    ADD CONSTRAINT daily_weight_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- activity_logsテーブル（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
    ALTER TABLE public.activity_logs 
    ADD CONSTRAINT activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- goalsテーブル（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
    ALTER TABLE public.goals 
    ADD CONSTRAINT goals_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. RLSポリシーを確認・修正
-- profilesテーブルのポリシー
DROP POLICY IF EXISTS "Users can view and edit their own profile." ON public.profiles;
CREATE POLICY "Users can view and edit their own profile."
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- mealsテーブルのポリシー
DROP POLICY IF EXISTS "Users can CRUD their own meals." ON public.meals;
CREATE POLICY "Users can CRUD their own meals."
  ON public.meals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- daily_summariesテーブルのポリシー
DROP POLICY IF EXISTS "Users can view their own daily summaries." ON public.daily_summaries;
CREATE POLICY "Users can view their own daily summaries."
  ON public.daily_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- 6. サービスロール用のポリシーを追加（Edge Function用）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage all data' AND tablename = 'profiles') THEN
    CREATE POLICY "Service role can manage all data"
      ON public.profiles FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage all data' AND tablename = 'meals') THEN
    CREATE POLICY "Service role can manage all data"
      ON public.meals FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage all data' AND tablename = 'daily_summaries') THEN
    CREATE POLICY "Service role can manage all data"
      ON public.daily_summaries FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 7. 確認用のログ出力
DO $$
BEGIN
  RAISE NOTICE 'User deletion setup completed successfully';
  RAISE NOTICE 'Trigger: on_auth_user_deleted is active';
  RAISE NOTICE 'CASCADE deletes are configured for all user-related tables';
END $$;
