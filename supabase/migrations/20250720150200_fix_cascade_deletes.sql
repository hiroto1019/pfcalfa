-- 外部キー制約にCASCADE削除を追加して、Supabase管理者画面での削除を可能にする

-- 既存の外部キー制約を削除
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.meals DROP CONSTRAINT IF EXISTS meals_user_id_fkey;
ALTER TABLE public.daily_summaries DROP CONSTRAINT IF EXISTS daily_summaries_user_id_fkey;

-- CASCADE削除付きの外部キー制約を再作成
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.meals 
ADD CONSTRAINT meals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.daily_summaries 
ADD CONSTRAINT daily_summaries_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 存在するテーブルにもCASCADE削除を設定
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_weight_logs') THEN
    ALTER TABLE public.daily_weight_logs DROP CONSTRAINT IF EXISTS daily_weight_logs_user_id_fkey;
    ALTER TABLE public.daily_weight_logs 
    ADD CONSTRAINT daily_weight_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
    ALTER TABLE public.activity_logs 
    ADD CONSTRAINT activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
    ALTER TABLE public.goals 
    ADD CONSTRAINT goals_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$; 