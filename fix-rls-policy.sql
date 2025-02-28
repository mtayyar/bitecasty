-- Drop the existing policies on the users table
DROP POLICY IF EXISTS "Public users are viewable by everyone." ON users;
DROP POLICY IF EXISTS "Users can update their own profile." ON users;

-- Create new policies that allow user creation
CREATE POLICY "Public users are viewable by everyone." 
  ON users FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile." 
  ON users FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- Enable the service role to bypass RLS for user creation during signup
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a policy for the service role to manage all users
CREATE POLICY "Service role can manage all users" 
  ON users 
  USING (auth.jwt() ->> 'role' = 'service_role'); 