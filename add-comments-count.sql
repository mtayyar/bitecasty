-- Add comments_count column to audio_posts table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audio_posts' AND column_name = 'comments_count'
    ) THEN
        ALTER TABLE audio_posts ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create or replace function to update comments_count
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE audio_posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE audio_posts
        SET comments_count = comments_count - 1
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS comments_count_trigger ON comments;

-- Create trigger for comments table
CREATE TRIGGER comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();

-- Also create trigger for audio_comments table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'audio_comments'
    ) THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS audio_comments_count_trigger ON audio_comments;
        
        -- Create trigger for audio_comments table
        CREATE TRIGGER audio_comments_count_trigger
        AFTER INSERT OR DELETE ON audio_comments
        FOR EACH ROW
        EXECUTE FUNCTION update_comments_count();
    END IF;
END $$;

-- Update existing counts based on current data
UPDATE audio_posts
SET comments_count = (
    SELECT COUNT(*) FROM comments WHERE post_id = audio_posts.id
);

-- Also update counts from audio_comments if the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'audio_comments'
    ) THEN
        UPDATE audio_posts ap
        SET comments_count = comments_count + (
            SELECT COUNT(*) FROM audio_comments WHERE post_id = ap.id
        );
    END IF;
END $$; 