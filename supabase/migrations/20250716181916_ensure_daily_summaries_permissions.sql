-- Ensure daily_summaries table has proper permissions for trigger function
-- Drop all existing policies on daily_summaries
DROP POLICY IF EXISTS "Users can view their own daily summaries." ON public.daily_summaries;
DROP POLICY IF EXISTS "Users can view and insert their own daily summaries." ON public.daily_summaries;

-- Grant all permissions to authenticated users for daily_summaries
GRANT ALL ON public.daily_summaries TO authenticated;
GRANT ALL ON public.daily_summaries TO anon;

-- Create a more permissive policy that allows the trigger function to work
CREATE POLICY "Allow all operations on daily_summaries"
  ON public.daily_summaries FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ensure the trigger function has proper permissions
ALTER FUNCTION public.update_daily_summary() SECURITY DEFINER;

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION public.update_daily_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_summary() TO anon;

-- Ensure meals table also has proper permissions
GRANT ALL ON public.meals TO authenticated;
GRANT ALL ON public.meals TO anon;

-- Recreate meals policy to be more permissive
DROP POLICY IF EXISTS "Users can CRUD their own meals." ON public.meals;
CREATE POLICY "Allow all operations on meals"
  ON public.meals FOR ALL
  USING (true)
  WITH CHECK (true);
