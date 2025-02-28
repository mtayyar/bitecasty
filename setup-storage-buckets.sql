-- Create storage buckets for audio files and images
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('audio', 'audio', true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('images', 'images', true, false)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the audio bucket
CREATE POLICY "Audio files are publicly accessible."
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

CREATE POLICY "Users can upload audio files."
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own audio files."
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own audio files."
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up security policies for the images bucket
CREATE POLICY "Images are publicly accessible."
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "Users can upload images."
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own images."
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images."
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Make sure the audio_posts table exists
CREATE TABLE IF NOT EXISTS public.audio_posts (
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