-- First, let's check if the audio_posts table exists and drop it if it does
DROP TABLE IF EXISTS public.audio_posts CASCADE;

-- Now recreate the audio_posts table with all required columns
CREATE TABLE public.audio_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  image_url TEXT,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant necessary permissions
GRANT ALL ON public.audio_posts TO authenticated;
GRANT ALL ON public.audio_posts TO service_role;
GRANT SELECT ON public.audio_posts TO anon;

-- Set up RLS policies for audio_posts
ALTER TABLE public.audio_posts ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view all audio posts" ON public.audio_posts;
DROP POLICY IF EXISTS "Users can create their own audio posts" ON public.audio_posts;
DROP POLICY IF EXISTS "Users can update their own audio posts" ON public.audio_posts;
DROP POLICY IF EXISTS "Users can delete their own audio posts" ON public.audio_posts;

-- Create policies
CREATE POLICY "Users can view all audio posts"
  ON public.audio_posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own audio posts"
  ON public.audio_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio posts"
  ON public.audio_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio posts"
  ON public.audio_posts FOR DELETE
  USING (auth.uid() = user_id); 