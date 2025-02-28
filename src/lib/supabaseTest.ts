import { supabase } from './supabaseClient';

// Function to test Supabase connection
export async function testSupabaseConnection() {
  try {
    // Simple query to check if we can connect
    const { data, error } = await supabase.from('users').select('count', { count: 'exact' }).limit(0);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { success: false, error };
    }
    
    console.log('Successfully connected to Supabase!');
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error testing Supabase connection:', error);
    return { success: false, error };
  }
} 