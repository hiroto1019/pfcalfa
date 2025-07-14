-- Drop the existing policy on the profiles table
DROP POLICY IF EXISTS "Users can view and edit their own profile." ON public.profiles;

-- Create a new, more comprehensive policy for profiles
CREATE POLICY "Users can perform all actions on their own profile."
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); 