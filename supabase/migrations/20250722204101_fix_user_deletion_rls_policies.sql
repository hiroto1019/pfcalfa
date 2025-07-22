-- 20250722204101_fix_user_deletion_rls_policies.sql

-- RLSポリシーを修正して、サービスロールがユーザー削除時にデータを削除できるようにする

-- 1. サービスロール用のポリシーを追加（既存ポリシーを削除してから再作成）

-- profiles テーブル
DROP POLICY IF EXISTS "profiles_service_role_policy" ON "public"."profiles";
CREATE POLICY "profiles_service_role_policy" ON "public"."profiles"
    FOR ALL USING (auth.role() = 'service_role');

-- meals テーブル
DROP POLICY IF EXISTS "meals_service_role_policy" ON "public"."meals";
CREATE POLICY "meals_service_role_policy" ON "public"."meals"
    FOR ALL USING (auth.role() = 'service_role');

-- daily_summaries テーブル
DROP POLICY IF EXISTS "daily_summaries_service_role_policy" ON "public"."daily_summaries";
CREATE POLICY "daily_summaries_service_role_policy" ON "public"."daily_summaries"
    FOR ALL USING (auth.role() = 'service_role');

-- goals テーブル
DROP POLICY IF EXISTS "goals_service_role_policy" ON "public"."goals";
CREATE POLICY "goals_service_role_policy" ON "public"."goals"
    FOR ALL USING (auth.role() = 'service_role');

-- daily_activity_logs テーブル
DROP POLICY IF EXISTS "daily_activity_logs_service_role_policy" ON "public"."daily_activity_logs";
CREATE POLICY "daily_activity_logs_service_role_policy" ON "public"."daily_activity_logs"
    FOR ALL USING (auth.role() = 'service_role');

-- daily_weight_logs テーブル
DROP POLICY IF EXISTS "daily_weight_logs_service_role_policy" ON "public"."daily_weight_logs";
CREATE POLICY "daily_weight_logs_service_role_policy" ON "public"."daily_weight_logs"
    FOR ALL USING (auth.role() = 'service_role');

-- exercise_logs テーブル
DROP POLICY IF EXISTS "exercise_logs_service_role_policy" ON "public"."exercise_logs";
CREATE POLICY "exercise_logs_service_role_policy" ON "public"."exercise_logs"
    FOR ALL USING (auth.role() = 'service_role');

-- daily_exercise_summaries テーブル
DROP POLICY IF EXISTS "daily_exercise_summaries_service_role_policy" ON "public"."daily_exercise_summaries";
CREATE POLICY "daily_exercise_summaries_service_role_policy" ON "public"."daily_exercise_summaries"
    FOR ALL USING (auth.role() = 'service_role');

-- 2. 既存のユーザーポリシーも保持（サービスロールポリシーと共存）

-- 確認メッセージ
DO $$
BEGIN
    RAISE NOTICE 'Service role policies have been added to all user-related tables';
    RAISE NOTICE 'Supabase Auth can now delete users with CASCADE deletes';
END $$;
