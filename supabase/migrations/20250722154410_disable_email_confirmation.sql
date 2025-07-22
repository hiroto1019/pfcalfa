-- 既存のユーザーのメール確認を完了状態にする
UPDATE auth.users 
SET email_confirmed_at = created_at 
WHERE email_confirmed_at IS NULL;
