-- 20250722204711_fix_trigger_permissions.sql

-- トリガー関数の権限を修正し、より確実に動作するようにする

-- 1. 既存のトリガー関数を削除
DROP TRIGGER IF EXISTS user_deletion_trigger ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- 2. 新しいトリガー関数を作成（より確実な権限設定）
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
BEGIN
    user_id := OLD.id;
    
    -- ログ出力
    RAISE NOTICE 'Deleting user data for user_id: %', user_id;
    
    -- 関連データを削除（エラーハンドリング付き）
    BEGIN
        DELETE FROM exercise_logs WHERE user_id = user_id;
        RAISE NOTICE 'Deleted exercise_logs for user: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting exercise_logs: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM goals WHERE user_id = user_id;
        RAISE NOTICE 'Deleted goals for user: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting goals: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM daily_weight_logs WHERE user_id = user_id;
        RAISE NOTICE 'Deleted daily_weight_logs for user: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting daily_weight_logs: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM daily_summaries WHERE user_id = user_id;
        RAISE NOTICE 'Deleted daily_summaries for user: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting daily_summaries: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM meals WHERE user_id = user_id;
        RAISE NOTICE 'Deleted meals for user: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting meals: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM daily_activity_logs WHERE user_id = user_id;
        RAISE NOTICE 'Deleted daily_activity_logs for user: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting daily_activity_logs: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM daily_exercise_summaries WHERE user_id = user_id;
        RAISE NOTICE 'Deleted daily_exercise_summaries for user: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting daily_exercise_summaries: %', SQLERRM;
    END;
    
    BEGIN
        DELETE FROM profiles WHERE id = user_id;
        RAISE NOTICE 'Deleted profile for user: %', user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting profile: %', SQLERRM;
    END;
    
    RAISE NOTICE 'User deletion trigger completed for user: %', user_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. トリガーを再作成
CREATE TRIGGER user_deletion_trigger
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- 4. 権限を設定
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO service_role;
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO postgres;
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_deletion() TO anon;

-- 5. 関数の所有者をpostgresに変更
ALTER FUNCTION handle_user_deletion() OWNER TO postgres;

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE 'User deletion trigger has been recreated with improved permissions';
    RAISE NOTICE 'Trigger function owner: postgres';
    RAISE NOTICE 'All necessary permissions have been granted';
END $$;
