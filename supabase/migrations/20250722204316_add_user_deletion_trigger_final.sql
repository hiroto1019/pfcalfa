-- 20250722204316_add_user_deletion_trigger_final.sql

-- ユーザー削除時に自動的に関連データを削除するトリガー

-- 1. トリガー関数を作成
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- ユーザーが削除される前に、関連データを削除
    DELETE FROM exercise_logs WHERE user_id = OLD.id;
    DELETE FROM goals WHERE user_id = OLD.id;
    DELETE FROM daily_weight_logs WHERE user_id = OLD.id;
    DELETE FROM daily_summaries WHERE user_id = OLD.id;
    DELETE FROM meals WHERE user_id = OLD.id;
    DELETE FROM daily_activity_logs WHERE user_id = OLD.id;
    DELETE FROM daily_exercise_summaries WHERE user_id = OLD.id;
    DELETE FROM profiles WHERE id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. トリガーを作成（auth.usersテーブルに対して）
DROP TRIGGER IF EXISTS user_deletion_trigger ON auth.users;
CREATE TRIGGER user_deletion_trigger
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- 3. サービスロールに権限を付与
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO service_role;

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE 'User deletion trigger has been created';
    RAISE NOTICE 'Trigger will automatically delete related data when a user is deleted';
END $$;
