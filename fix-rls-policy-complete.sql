-- First, let's completely disable RLS on the users table temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Then let's grant all privileges to the authenticated role
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Let's also check if there are any existing policies and drop them
DROP POLICY IF EXISTS "Public users are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;

-- Now let's create a more permissive policy for user creation
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies with broader permissions
CREATE POLICY "Public users are viewable by everyone" 
  ON public.users FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert rows" 
  ON public.users FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update own data" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Service role has full access" 
  ON public.users
  USING (true)
  WITH CHECK (true);

-- Let's also make sure our trigger function has the right permissions
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER; 