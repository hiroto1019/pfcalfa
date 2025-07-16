-- Fix daily_summaries table policies to allow INSERT from trigger function
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view their own daily summaries." ON public.daily_summaries;

-- Create new policy that allows both SELECT and INSERT
CREATE POLICY "Users can view and insert their own daily summaries."
  ON public.daily_summaries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to the trigger function
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON public.daily_summaries TO postgres;
GRANT ALL ON public.meals TO postgres;

-- Ensure the trigger function has proper permissions
ALTER FUNCTION public.update_daily_summary() SECURITY DEFINER;
