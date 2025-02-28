-- Create the audio_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audio_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_url TEXT NOT NULL,
  duration NUMERIC NOT NULL CHECK (duration <= 10), -- Enforce 10-second limit
  user_id UUID REFERENCES public.users(id) NOT NULL,
  post_id UUID REFERENCES public.audio_posts(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to enforce the 100 comments per post limit
CREATE OR REPLACE FUNCTION check_comment_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.audio_comments WHERE post_id = NEW.post_id) >= 100 THEN
    RAISE EXCEPTION 'Maximum of 100 comments per post reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to enforce the comment limit
CREATE TRIGGER enforce_comment_limit
BEFORE INSERT ON public.audio_comments
FOR EACH ROW
EXECUTE FUNCTION check_comment_limit();

-- Create a trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audio_comments_updated_at
BEFORE UPDATE ON public.audio_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create the audio-comments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-comments', 'audio-comments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for audio-comments bucket
-- Allow public read access to audio comments
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-comments');

-- Allow authenticated users to upload audio comments
CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-comments');

-- Allow users to update their own audio comments
CREATE POLICY "Users Can Update Own Audio Comments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audio-comments' AND owner = auth.uid());

-- Allow users to delete their own audio comments
CREATE POLICY "Users Can Delete Own Audio Comments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-comments' AND owner = auth.uid()); 