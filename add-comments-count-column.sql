-- Add comments_count column to audio_posts table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audio_posts' AND column_name = 'comments_count'
    ) THEN
        ALTER TABLE audio_posts ADD COLUMN comments_count INTEGER DEFAULT 0;
        
        -- Update the column with current comment counts
        UPDATE audio_posts ap
        SET comments_count = COALESCE(c.comment_count, 0)
        FROM (
            SELECT 
                post_id, 
                COUNT(*) AS comment_count
            FROM 
                comments
            GROUP BY 
                post_id
        ) c
        WHERE ap.id = c.post_id;
        
        RAISE NOTICE 'Added comments_count column and updated values';
    ELSE
        RAISE NOTICE 'comments_count column already exists';
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
        
        RAISE NOTICE 'Created trigger for audio_comments table';
    END IF;
END $$; 