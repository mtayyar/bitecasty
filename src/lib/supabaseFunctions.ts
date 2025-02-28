import { supabase } from './supabaseClient';

/**
 * Creates SQL functions needed for database operations
 */
export async function setupSqlFunctions() {
  try {
    console.log('Setting up SQL functions...');
    
    // Create function to check if a column exists
    await createColumnExistsFunction();
    
    // Create function to add a column if it doesn't exist
    await createAddColumnFunction();
    
    console.log('SQL functions set up successfully');
    return true;
  } catch (error) {
    console.error('Error setting up SQL functions:', error);
    return false;
  }
}

/**
 * Creates a function to check if a column exists in a table
 */
export async function createColumnExistsFunction() {
  try {
    console.log('Creating column_exists function...');
    
    const { error } = await supabase.rpc('create_column_exists_function');
    
    if (error) {
      // Function might already exist or we don't have permissions
      console.log('Error creating column_exists function (might already exist):', error);
      
      // Try creating it directly with SQL
      const { error: sqlError } = await supabase.from('_exec_sql').select('*').eq('query', `
        CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
        RETURNS boolean AS $$
        DECLARE
          exists boolean;
        BEGIN
          SELECT COUNT(*) > 0 INTO exists
          FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2;
          
          RETURN exists;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
      
      if (sqlError) {
        console.error('Error creating column_exists function with SQL:', sqlError);
      } else {
        console.log('Successfully created column_exists function with SQL');
      }
    } else {
      console.log('Successfully created column_exists function');
    }
    
    return true;
  } catch (error) {
    console.error('Error in createColumnExistsFunction:', error);
    return false;
  }
}

/**
 * Creates a function to add a column to a table if it doesn't exist
 */
export async function createAddColumnFunction() {
  try {
    console.log('Creating add_column_if_not_exists function...');
    
    const { error } = await supabase.rpc('create_add_column_function');
    
    if (error) {
      // Function might already exist or we don't have permissions
      console.log('Error creating add_column_if_not_exists function (might already exist):', error);
      
      // Try creating it directly with SQL
      const { error: sqlError } = await supabase.from('_exec_sql').select('*').eq('query', `
        CREATE OR REPLACE FUNCTION add_column_if_not_exists(
          p_table text,
          p_column text,
          p_type text,
          p_default text DEFAULT NULL
        )
        RETURNS void AS $$
        DECLARE
          column_exists boolean;
          alter_statement text;
        BEGIN
          -- Check if column already exists
          SELECT COUNT(*) > 0 INTO column_exists
          FROM information_schema.columns
          WHERE table_name = p_table AND column_name = p_column;
          
          -- Add column if it doesn't exist
          IF NOT column_exists THEN
            alter_statement := 'ALTER TABLE ' || p_table || ' ADD COLUMN ' || p_column || ' ' || p_type;
            
            -- Add default value if provided
            IF p_default IS NOT NULL THEN
              alter_statement := alter_statement || ' DEFAULT ' || p_default;
            END IF;
            
            EXECUTE alter_statement;
          END IF;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
      
      if (sqlError) {
        console.error('Error creating add_column_if_not_exists function with SQL:', sqlError);
      } else {
        console.log('Successfully created add_column_if_not_exists function with SQL');
      }
    } else {
      console.log('Successfully created add_column_if_not_exists function');
    }
    
    return true;
  } catch (error) {
    console.error('Error in createAddColumnFunction:', error);
    return false;
  }
} 