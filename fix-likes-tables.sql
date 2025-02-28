-- Check if post_likes table exists, if not create it
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.audio_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Check if likes table exists, if not create it (as a fallback)
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.audio_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Add likes_count column to audio_posts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audio_posts' 
    AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE public.audio_posts ADD COLUMN likes_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Set up RLS policies for post_likes table
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Allow users to see likes on posts
CREATE POLICY IF NOT EXISTS "Users can see likes on posts" ON public.post_likes
  FOR SELECT USING (true);

-- Allow users to like posts
CREATE POLICY IF NOT EXISTS "Users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to unlike posts
CREATE POLICY IF NOT EXISTS "Users can unlike posts" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Set up RLS policies for likes table
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Allow users to see likes on posts
CREATE POLICY IF NOT EXISTS "Users can see likes on posts" ON public.likes
  FOR SELECT USING (true);

-- Allow users to like posts
CREATE POLICY IF NOT EXISTS "Users can like posts" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to unlike posts
CREATE POLICY IF NOT EXISTS "Users can unlike posts" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update likes_count on audio_posts for post_likes table
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.audio_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.audio_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for likes count on post_likes table
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON public.post_likes;
CREATE TRIGGER update_post_likes_count_trigger
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Create function to update likes_count on audio_posts for likes table
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.audio_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.audio_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for likes count on likes table
DROP TRIGGER IF EXISTS update_likes_count_trigger ON public.likes;
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- Migrate data from likes to post_likes if needed
INSERT INTO public.post_likes (post_id, user_id, created_at)
SELECT post_id, user_id, created_at
FROM public.likes
WHERE NOT EXISTS (
  SELECT 1 FROM public.post_likes
  WHERE post_likes.post_id = likes.post_id
  AND post_likes.user_id = likes.user_id
);

-- Update likes_count for all posts to ensure accuracy
UPDATE public.audio_posts
SET likes_count = (
  SELECT COUNT(*) FROM public.post_likes
  WHERE post_likes.post_id = audio_posts.id
);

-- Add a comment to confirm the script ran
COMMENT ON TABLE public.post_likes IS 'Likes table for audio posts, fixed by script on ' || NOW(); 