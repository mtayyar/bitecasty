import { supabase } from '../lib/supabaseClient';

/**
 * Utility function to add the comments_count column to the audio_posts table
 */
export async function addCommentsCountColumn() {
  try {
    console.log('Adding comments_count column to audio_posts table...');
    
    // Check if the column already exists
    const { data: columnExists, error: checkError } = await supabase.rpc(
      'column_exists',
      { table_name: 'audio_posts', column_name: 'comments_count' }
    );
    
    if (checkError) {
      console.error('Error checking if column exists:', checkError);
      
      // Create the function if it doesn't exist
      await supabase.rpc('create_column_exists_function');
      
      // Try again
      const { data: retryColumnExists, error: retryCheckError } = await supabase.rpc(
        'column_exists',
        { table_name: 'audio_posts', column_name: 'comments_count' }
      );
      
      if (retryCheckError) {
        throw new Error(`Failed to check if column exists: ${retryCheckError.message}`);
      }
      
      if (retryColumnExists) {
        console.log('comments_count column already exists');
        return true;
      }
    } else if (columnExists) {
      console.log('comments_count column already exists');
      return true;
    }
    
    // Add the column
    const { error: addColumnError } = await supabase.rpc(
      'add_column_if_not_exists',
      { 
        p_table: 'audio_posts', 
        p_column: 'comments_count', 
        p_type: 'integer',
        p_default: '0'
      }
    );
    
    if (addColumnError) {
      console.error('Error adding comments_count column:', addColumnError);
      
      // Create the function if it doesn't exist
      await supabase.rpc('create_add_column_function');
      
      // Try again
      const { error: retryAddColumnError } = await supabase.rpc(
        'add_column_if_not_exists',
        { 
          p_table: 'audio_posts', 
          p_column: 'comments_count', 
          p_type: 'integer',
          p_default: '0'
        }
      );
      
      if (retryAddColumnError) {
        throw new Error(`Failed to add comments_count column: ${retryAddColumnError.message}`);
      }
    }
    
    console.log('Successfully added comments_count column');
    return true;
  } catch (error) {
    console.error('Error in addCommentsCountColumn:', error);
    return false;
  }
}

/**
 * Alternative approach using raw SQL
 */
export async function addCommentsCountColumnRawSql() {
  try {
    console.log('Adding comments_count column using raw SQL...');
    
    // Add the column if it doesn't exist
    const { error: sqlError } = await supabase.from('_exec_sql').select('*').eq('query', `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'audio_posts' AND column_name = 'comments_count'
        ) THEN
          ALTER TABLE audio_posts ADD COLUMN comments_count INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);
    
    if (sqlError) {
      console.error('Error executing raw SQL:', sqlError);
      throw new Error(`Failed to execute raw SQL: ${sqlError.message}`);
    }
    
    console.log('Successfully executed raw SQL');
    return true;
  } catch (error) {
    console.error('Error in addCommentsCountColumnRawSql:', error);
    return false;
  }
} 