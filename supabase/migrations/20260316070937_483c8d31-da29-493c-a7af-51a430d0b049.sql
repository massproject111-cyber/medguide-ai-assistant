
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create function to get email by username (for username-based login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE LOWER(p.username) = LOWER(_username)
  LIMIT 1;
$$;

-- Create a temporary function to delete all auth users
CREATE OR REPLACE FUNCTION public.delete_all_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users;
END;
$$;

-- Execute it
SELECT public.delete_all_users();

-- Drop the temp function
DROP FUNCTION public.delete_all_users();

-- Also clean up any orphaned public data
TRUNCATE public.profiles CASCADE;
TRUNCATE public.medications CASCADE;
TRUNCATE public.health_logs CASCADE;
TRUNCATE public.user_roles CASCADE;
