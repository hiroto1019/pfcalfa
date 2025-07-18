-- 管理者画面でのユーザー削除時に確実に動作するトリガー関数の改善

-- 既存のトリガーと関数を削除
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- 改善されたユーザー削除時に関連データを削除する関数
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_user_id UUID;
  error_message TEXT;
BEGIN
  -- 削除されたユーザーのIDを取得
  deleted_user_id := OLD.id;
  
  -- ログ出力
  RAISE NOTICE 'Starting deletion of user % and related data', deleted_user_id;
  
  BEGIN
    -- 関連データを削除（CASCADEにより関連データも削除される）
    DELETE FROM public.profiles WHERE id = deleted_user_id;
    RAISE NOTICE 'Deleted profiles for user %', deleted_user_id;
  EXCEPTION WHEN OTHERS THEN
    error_message := 'Error deleting profiles: ' || SQLERRM;
    RAISE WARNING '%', error_message;
  END;
  
  BEGIN
    DELETE FROM public.meals WHERE user_id = deleted_user_id;
    RAISE NOTICE 'Deleted meals for user %', deleted_user_id;
  EXCEPTION WHEN OTHERS THEN
    error_message := 'Error deleting meals: ' || SQLERRM;
    RAISE WARNING '%', error_message;
  END;
  
  BEGIN
    DELETE FROM public.daily_summaries WHERE user_id = deleted_user_id;
    RAISE NOTICE 'Deleted daily_summaries for user %', deleted_user_id;
  EXCEPTION WHEN OTHERS THEN
    error_message := 'Error deleting daily_summaries: ' || SQLERRM;
    RAISE WARNING '%', error_message;
  END;
  
  -- 存在するテーブルのみ削除
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_weight_logs') THEN
      DELETE FROM public.daily_weight_logs WHERE user_id = deleted_user_id;
      RAISE NOTICE 'Deleted daily_weight_logs for user %', deleted_user_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    error_message := 'Error deleting daily_weight_logs: ' || SQLERRM;
    RAISE WARNING '%', error_message;
  END;
  
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
      DELETE FROM public.activity_logs WHERE user_id = deleted_user_id;
      RAISE NOTICE 'Deleted activity_logs for user %', deleted_user_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    error_message := 'Error deleting activity_logs: ' || SQLERRM;
    RAISE WARNING '%', error_message;
  END;
  
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
      DELETE FROM public.goals WHERE user_id = deleted_user_id;
      RAISE NOTICE 'Deleted goals for user %', deleted_user_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    error_message := 'Error deleting goals: ' || SQLERRM;
    RAISE WARNING '%', error_message;
  END;
  
  -- 完了ログ
  RAISE NOTICE 'Completed deletion of user % and all related data', deleted_user_id;
  
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- エラーが発生しても削除処理を続行
  RAISE WARNING 'Unexpected error in handle_user_deletion: %', SQLERRM;
  RETURN OLD;
END;
$$;

-- auth.usersテーブルにトリガーを設定
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();
