-- Add target_weight_kg and goal_type to profiles table
ALTER TABLE public.profiles
ADD COLUMN target_weight_kg NUMERIC(5, 2),
ADD COLUMN goal_type TEXT; 