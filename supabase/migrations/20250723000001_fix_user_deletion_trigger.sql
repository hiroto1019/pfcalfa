-- ユーザー削除時のトリガーを修正

-- まず、既存のトリガーを削除（もし存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion();

-- 新しいトリガー関数を作成
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- 関連データを削除（順序が重要）
    DELETE FROM exercise_logs WHERE user_id = OLD.id;
    DELETE FROM goals WHERE user_id = OLD.id;
    DELETE FROM activity_logs WHERE user_id = OLD.id;
    DELETE FROM daily_weight_logs WHERE user_id = OLD.id;
    DELETE FROM daily_summaries WHERE user_id = OLD.id;
    DELETE FROM meals WHERE user_id = OLD.id;
    DELETE FROM profiles WHERE user_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion(); 