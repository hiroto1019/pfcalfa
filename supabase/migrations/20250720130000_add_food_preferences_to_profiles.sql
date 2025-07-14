-- Add food_preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN food_preferences JSONB; 