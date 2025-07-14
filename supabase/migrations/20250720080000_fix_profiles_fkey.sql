-- First, drop the existing foreign key constraint
ALTER TABLE "public"."profiles" DROP CONSTRAINT "profiles_id_fkey";

-- Then, add the new foreign key constraint with ON DELETE CASCADE
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey"
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; 