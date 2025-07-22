-- Fix username constraint to allow multiple users with same username
-- Drop the unique constraint on username
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Add a comment to explain the change
COMMENT ON COLUMN profiles.username IS 'Username field - no longer unique to allow multiple users with same username'; 