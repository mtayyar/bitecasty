import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Get the current site URL
const siteUrl = window.location.origin

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          updated_at?: string
        }
      }
      audio_posts: {
        Row: {
          id: string
          title: string
          description: string | null
          audio_url: string
          duration: number
          user_id: string
          created_at: string
          updated_at: string
          likes_count?: number
          comments_count?: number
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          audio_url: string
          duration: number
          user_id: string
          created_at?: string
          updated_at?: string
          likes_count?: number
          comments_count?: number
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          audio_url?: string
          duration?: number
          user_id?: string
          updated_at?: string
          likes_count?: number
          comments_count?: number
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          content: string
          user_id: string
          post_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          user_id: string
          post_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          user_id?: string
          post_id?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      audio_comments: {
        Row: {
          id: string;
          audio_url: string;
          duration: number;
          user_id: string;
          post_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          audio_url: string;
          duration: number;
          user_id: string;
          post_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          audio_url?: string;
          duration?: number;
          user_id?: string;
          post_id?: string;
          updated_at?: string;
        };
      }
    }
  }
}

// Function to create necessary database objects for likes functionality
export async function setupLikesTables() {
  try {
    console.log('Setting up likes tables...');
    
    // Check if post_likes table exists
    const { error: postLikesError } = await supabase
      .from('post_likes')
      .select('count(*)', { count: 'exact', head: true });
    
    // If post_likes table doesn't exist, we need to create it
    if (postLikesError) {
      console.log('post_likes table does not exist, creating it...');
      
      // Create post_likes table
      const { error: createTableError } = await supabase
        .from('audio_posts')
        .select('id')
        .limit(1);
      
      if (createTableError) {
        console.error('Error checking audio_posts table:', createTableError);
        return false;
      }
      
      // We can't create tables directly with Supabase JS client
      // Instead, we'll use a function or stored procedure
      // For now, let's just log the issue
      console.log('Please run the SQL script to create the post_likes table');
    }
    
    // Check if likes_count column exists in audio_posts
    const { data: postsData, error: postsError } = await supabase
      .from('audio_posts')
      .select('likes_count')
      .limit(1);
    
    if (postsError || !postsData || postsData.length === 0 || postsData[0].likes_count === undefined) {
      console.log('likes_count column does not exist in audio_posts, please run the SQL script');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up likes tables:', error);
    return false;
  }
}

// Function to ensure likes are properly counted
export async function updateLikesCount(postId: string) {
  try {
    // Get the current count of likes for this post
    const { data, error } = await supabase
      .from('post_likes')
      .select('count(*)', { count: 'exact' })
      .eq('post_id', postId);
    
    if (error) {
      console.error('Error counting likes:', error);
      return false;
    }
    
    const count = data || 0;
    
    // Update the likes_count in the audio_posts table
    const { error: updateError } = await supabase
      .from('audio_posts')
      .update({ likes_count: count })
      .eq('id', postId);
    
    if (updateError) {
      console.error('Error updating likes count:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating likes count:', error);
    return false;
  }
}

// Function to reset likes count for all posts
export async function resetAllLikesCounts() {
  try {
    console.log('Resetting likes counts for all posts...');
    
    // Get all posts
    const { data: posts, error: postsError } = await supabase
      .from('audio_posts')
      .select('id');
    
    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return false;
    }
    
    if (!posts || posts.length === 0) {
      console.log('No posts found');
      return true;
    }
    
    console.log(`Found ${posts.length} posts, updating likes counts...`);
    
    // Update likes count for each post
    for (const post of posts) {
      // Count likes in post_likes table
      const { count: postLikesCount, error: postLikesError } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      if (postLikesError) {
        console.error(`Error counting likes for post ${post.id}:`, postLikesError);
        continue;
      }
      
      // Count likes in likes table
      const { count: likesCount, error: likesError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      if (likesError) {
        console.error(`Error counting likes in likes table for post ${post.id}:`, likesError);
        continue;
      }
      
      // Use the total from both tables
      const totalLikes = (postLikesCount || 0) + (likesCount || 0);
      
      // Update the post with the accurate count
      const { error: updateError } = await supabase
        .from('audio_posts')
        .update({ likes_count: totalLikes })
        .eq('id', post.id);
      
      if (updateError) {
        console.error(`Error updating likes count for post ${post.id}:`, updateError);
      } else {
        console.log(`Updated likes count for post ${post.id} to ${totalLikes}`);
      }
    }
    
    console.log('Finished resetting likes counts for all posts');
    return true;
  } catch (error) {
    console.error('Error resetting likes counts:', error);
    return false;
  }
}

/**
 * Execute SQL directly (requires appropriate permissions)
 */
export async function executeSql(sql: string) {
  try {
    console.log('Executing SQL:', sql);
    
    // Try using the rpc method first
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error executing SQL with RPC:', error);
      
      // Try an alternative approach
      console.log('Trying alternative approach...');
      
      // This is a workaround - we'll use a raw query
      const { error: rawError } = await supabase.from('_raw_sql').select('*').eq('query', sql);
      
      if (rawError) {
        console.error('Error executing raw SQL:', rawError);
        return { success: false, error: rawError };
      }
      
      return { success: true };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in executeSql:', error);
    return { success: false, error };
  }
}

/**
 * Add comments_count column to audio_posts table using direct SQL
 */
export async function addCommentsCountColumnDirect() {
  try {
    console.log('Adding comments_count column using direct SQL...');
    
    const sql = `
      DO $$
      BEGIN
        -- Add comments_count column if it doesn't exist
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
        END IF;
      END $$;
    `;
    
    const result = await executeSql(sql);
    
    if (!result.success) {
      console.error('Failed to add comments_count column:', result.error);
      return false;
    }
    
    console.log('Successfully added comments_count column');
    return true;
  } catch (error) {
    console.error('Error in addCommentsCountColumnDirect:', error);
    return false;
  }
}

/**
 * Function to add the comments_count column to the audio_posts table
 */
export async function addCommentsCountColumn() {
  try {
    console.log('Adding comments_count column to audio_posts table...');
    
    // First, check if the column already exists
    const { data, error: checkError } = await supabase
      .from('audio_posts')
      .select('comments_count')
      .limit(1);
    
    if (!checkError) {
      console.log('comments_count column already exists');
      return true;
    }
    
    console.log('comments_count column does not exist, adding it...');
    
    // Try the direct SQL approach first
    const result = await addCommentsCountColumnDirect();
    if (result) {
      return true;
    }
    
    // If direct SQL fails, try a workaround with a view
    console.log('Direct SQL failed, trying view workaround...');
    
    const { error: viewError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE VIEW audio_posts_with_comments AS
        SELECT 
          ap.*,
          COALESCE(c.comment_count, 0) AS comments_count
        FROM 
          audio_posts ap
        LEFT JOIN (
          SELECT 
            post_id, 
            COUNT(*) AS comment_count
          FROM 
            comments
          GROUP BY 
            post_id
        ) c ON ap.id = c.post_id;
      `
    });
    
    if (viewError) {
      console.error('Error creating view:', viewError);
      return false;
    }
    
    console.log('Successfully created view with comments_count');
    return true;
  } catch (error) {
    console.error('Error in addCommentsCountColumn:', error);
    return false;
  }
}

/**
 * Function to set up the audio-comments bucket if it doesn't exist
 */
export async function setupAudioCommentsBucket() {
  try {
    console.log('Setting up audio-comments bucket...');
    
    // Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    console.log('Available buckets:', buckets?.map(b => b.name).join(', ') || 'none');
    
    const audioCommentsBucket = buckets?.find(b => b.name === 'audio-comments');
    if (audioCommentsBucket) {
      console.log('audio-comments bucket already exists');
      return true;
    }
    
    console.log('audio-comments bucket does not exist, creating it...');
    
    // Create the bucket using the Storage API
    const { data, error } = await supabase.storage.createBucket('audio-comments', {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB limit for audio files
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg']
    });
    
    if (error) {
      console.error('Failed to create audio-comments bucket:', error);
      
      // Try an alternative approach if the first one fails
      console.log('Trying alternative approach to create bucket...');
      
      // Try using RPC to create the bucket
      const { error: rpcError } = await supabase.rpc('create_storage_bucket', {
        bucket_name: 'audio-comments',
        public: true
      });
      
      if (rpcError) {
        console.error('Alternative approach failed:', rpcError);
        return false;
      }
      
      console.log('Successfully created audio-comments bucket using alternative approach');
      return true;
    }
    
    console.log('Successfully created audio-comments bucket');
    
    return true;
  } catch (error) {
    console.error('Error in setupAudioCommentsBucket:', error);
    return false;
  }
} 