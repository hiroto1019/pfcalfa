-- 20250723040000_remove_deletion_trigger.sql

-- ユーザー削除トリガーと関連関数を完全に削除する
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP FUNCTION IF EXISTS handle_user_deletion(); 