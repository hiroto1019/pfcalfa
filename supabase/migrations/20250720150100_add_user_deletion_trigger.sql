-- Supabase管理者画面でユーザーを削除した際に、関連データも自動削除されるトリガー

-- ユーザー削除時に関連データを削除する関数
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 削除されたユーザーのIDを取得
  DECLARE
    deleted_user_id UUID;
  BEGIN
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
END;
$$;

-- auth.usersテーブルにトリガーを設定
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion(); 