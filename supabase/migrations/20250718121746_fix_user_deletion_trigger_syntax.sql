-- 構文エラーを修正したユーザー削除トリガー関数

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- 修正されたユーザー削除時に関連データを削除する関数
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
  
  -- 関連データを削除（CASCADEにより関連データも削除される）
  DELETE FROM public.profiles WHERE id = deleted_user_id;
  DELETE FROM public.meals WHERE user_id = deleted_user_id;
  DELETE FROM public.daily_summaries WHERE user_id = deleted_user_id;
  
  -- 存在するテーブルのみ削除
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_weight_logs') THEN
    DELETE FROM public.daily_weight_logs WHERE user_id = deleted_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    DELETE FROM public.activity_logs WHERE user_id = deleted_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    DELETE FROM public.goals WHERE user_id = deleted_user_id;
  END IF;
  
  -- ログ出力
  RAISE NOTICE 'User % and all related data have been deleted', deleted_user_id;
  
  RETURN OLD;
END;
$$;

-- auth.usersテーブルにトリガーを設定
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();
