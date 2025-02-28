import { supabase } from '../lib/supabaseClient';

/**
 * Utility function to fix the likes tables in the database
 * This should be called once to ensure the database has the correct tables and triggers
 */
export async function fixLikesTables() {
  try {
    console.log('Fixing likes tables...');
    
    // Check if post_likes table exists
    const { data: postLikesExists, error: postLikesError } = await supabase
      .from('post_likes')
      .select('count(*)', { count: 'exact', head: true });
    
    if (postLikesError) {
      console.log('post_likes table does not exist or is not accessible');
    } else {
      console.log('post_likes table exists');
    }
    
    // Check if likes table exists
    const { data: likesExists, error: likesError } = await supabase
      .from('likes')
      .select('count(*)', { count: 'exact', head: true });
    
    if (likesError) {
      console.log('likes table does not exist or is not accessible');
    } else {
      console.log('likes table exists');
    }
    
    // Create post_likes table if it doesn't exist
    if (postLikesError) {
      const { error: createError } = await supabase.rpc('create_post_likes_table');
      if (createError) {
        console.error('Error creating post_likes table:', createError);
      } else {
        console.log('Created post_likes table');
      }
    }
    
    // Create likes table if it doesn't exist (as fallback)
    if (likesError) {
      const { error: createError } = await supabase.rpc('create_likes_table');
      if (createError) {
        console.error('Error creating likes table:', createError);
      } else {
        console.log('Created likes table');
      }
    }
    
    // Add likes_count column to audio_posts if it doesn't exist
    const { error: addColumnError } = await supabase.rpc('add_likes_count_column');
    if (addColumnError) {
      console.error('Error adding likes_count column:', addColumnError);
    } else {
      console.log('Added likes_count column if it didn\'t exist');
    }
    
    // Create triggers for post_likes table
    const { error: triggerError } = await supabase.rpc('create_post_likes_trigger');
    if (triggerError) {
      console.error('Error creating post_likes trigger:', triggerError);
    } else {
      console.log('Created post_likes trigger');
    }
    
    // Create triggers for likes table
    const { error: likesTriggerError } = await supabase.rpc('create_likes_trigger');
    if (likesTriggerError) {
      console.error('Error creating likes trigger:', likesTriggerError);
    } else {
      console.log('Created likes trigger');
    }
    
    // Migrate data from likes to post_likes if needed
    const { error: migrateError } = await supabase.rpc('migrate_likes_data');
    if (migrateError) {
      console.error('Error migrating likes data:', migrateError);
    } else {
      console.log('Migrated likes data if needed');
    }
    
    // Update likes_count for all posts to ensure accuracy
    const { error: updateCountsError } = await supabase.rpc('update_all_likes_counts');
    if (updateCountsError) {
      console.error('Error updating likes counts:', updateCountsError);
    } else {
      console.log('Updated all likes counts');
    }
    
    console.log('Likes tables fix completed');
    return true;
  } catch (error) {
    console.error('Error fixing likes tables:', error);
    return false;
  }
}

/**
 * Execute a SQL query directly
 * Note: This requires appropriate permissions and may not work in all environments
 */
export async function executeSql(sql: string) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql });
    if (error) {
      console.error('Error executing SQL:', error);
      return false;
    }
    console.log('SQL executed successfully:', data);
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    return false;
  }
} 