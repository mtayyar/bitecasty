-- Create tables
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE audio_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration NUMERIC NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  post_id UUID REFERENCES audio_posts(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, post_id)
);

CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  post_id UUID REFERENCES audio_posts(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES users(id) NOT NULL,
  following_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create audio_comments table for audio-based comments
CREATE TABLE audio_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  audio_url TEXT NOT NULL,
  duration NUMERIC NOT NULL CHECK (duration <= 10), -- Enforce 10-second limit
  user_id UUID REFERENCES users(id) NOT NULL,
  post_id UUID REFERENCES audio_posts(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public users are viewable by everyone." ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile." ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public audio posts are viewable by everyone." ON audio_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own audio posts." ON audio_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio posts." ON audio_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio posts." ON audio_posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public likes are viewable by everyone." ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes." ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes." ON likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public comments are viewable by everyone." ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments." ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments." ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments." ON comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public follows are viewable by everyone." ON follows
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own follows." ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows." ON follows
  FOR DELETE USING (auth.uid() = follower_id);

CREATE POLICY "Public audio comments are viewable by everyone." ON audio_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own audio comments." ON audio_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio comments." ON audio_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio comments." ON audio_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_posts_updated_at
BEFORE UPDATE ON audio_posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_comments_updated_at
BEFORE UPDATE ON audio_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to enforce the 100 comments per post limit
CREATE OR REPLACE FUNCTION check_comment_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM audio_comments WHERE post_id = NEW.post_id) >= 100 THEN
    RAISE EXCEPTION 'Maximum of 100 comments per post reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to enforce the comment limit
CREATE TRIGGER enforce_comment_limit
BEFORE INSERT ON audio_comments
FOR EACH ROW
EXECUTE FUNCTION check_comment_limit(); 