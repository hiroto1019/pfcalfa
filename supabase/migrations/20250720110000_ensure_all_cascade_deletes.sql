-- This script ensures all tables related to a user are correctly set up with ON DELETE CASCADE.
-- It attempts to drop existing constraints and re-add them correctly.

-- For profiles table
ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_id_fkey";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

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