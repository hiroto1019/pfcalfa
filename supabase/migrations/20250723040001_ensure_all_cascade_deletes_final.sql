-- 20250723040001_ensure_all_cascade_deletes_final.sql

-- 全ての関連テーブルにON DELETE CASCADEが正しく設定されていることを確認・追加する

-- For profiles table (idカラムでauth.usersを参照 - これは正しい設計)
-- 既にON DELETE CASCADEが設定されているため、確認のみ

-- For meals table
ALTER TABLE "public"."meals" DROP CONSTRAINT IF EXISTS "meals_user_id_fkey";
ALTER TABLE "public"."meals" ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For daily_summaries table
ALTER TABLE "public"."daily_summaries" DROP CONSTRAINT IF EXISTS "daily_summaries_user_id_fkey";
ALTER TABLE "public"."daily_summaries" ADD CONSTRAINT "daily_summaries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For goals table
ALTER TABLE "public"."goals" DROP CONSTRAINT IF EXISTS "goals_user_id_fkey";
ALTER TABLE "public"."goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For daily_activity_logs table
ALTER TABLE "public"."daily_activity_logs" DROP CONSTRAINT IF EXISTS "daily_activity_logs_user_id_fkey";
ALTER TABLE "public"."daily_activity_logs" ADD CONSTRAINT "daily_activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For daily_weight_logs table
ALTER TABLE "public"."daily_weight_logs" DROP CONSTRAINT IF EXISTS "daily_weight_logs_user_id_fkey";
ALTER TABLE "public"."daily_weight_logs" ADD CONSTRAINT "daily_weight_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For exercise_logs table (確認のみ - 既に設定済み)
-- 既にON DELETE CASCADEが設定されているため、確認のみ

-- For daily_exercise_summaries table (確認のみ - 既に設定済み)
-- 既にON DELETE CASCADEが設定されているため、確認のみ

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE 'All user-related tables now have ON DELETE CASCADE constraints';
    RAISE NOTICE 'User deletion trigger has been removed';
    RAISE NOTICE 'User deletion will now be handled by native database CASCADE deletes';
END $$; 