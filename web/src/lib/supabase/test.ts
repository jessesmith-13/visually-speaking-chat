import { supabase } from './client';

/**
 * Test Supabase connection
 * Returns status object with connection details
 */
export async function testSupabaseConnection() {
  try {
    // Test 1: Check if client is initialized
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not initialized',
        details: null
      };
    }

    // Test 2: Try to get session (doesn't require tables)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return {
        success: false,
        error: 'Auth connection failed',
        details: sessionError.message
      };
    }

    // Test 3: Try to check if profiles table exists
    const { error: tableError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (tableError) {
      // Table doesn't exist or permission denied
      return {
        success: true,
        warning: 'Connected to Supabase but profiles table not found',
        details: 'Please create the profiles table using the SQL in SUPABASE_SETUP.md',
        tableExists: false,
        authenticated: !!sessionData.session
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase',
      tableExists: true,
      authenticated: !!sessionData.session
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: 'Connection test failed',
      details: errorMessage
    };
  }
}
