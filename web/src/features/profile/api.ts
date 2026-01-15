import { supabase } from '@/lib/supabase/client';
import { fetchUserTickets } from '@/features/tickets/api';
import { User } from './types';
import { User as AuthUser} from '@supabase/supabase-js';

/**
 * Fetch user profile from the database
 * Uses direct Supabase client for reads (per our architecture)
 */
export async function fetchUserProfile(authUser: AuthUser): Promise<User | null> {
  try {
    console.log('🔵 [PROFILE] Starting fetchUserProfile...');
    
    // Check if user object was provided (no need to call getUser() again)
    if (!authUser) {
      console.log('❌ [PROFILE] No auth user found');
      return null;
    }

    console.log('✅ [PROFILE] Auth user:', authUser.email);

    // Fetch profile using Supabase client (RLS handles auth here)
    console.log('🔵 [PROFILE] Fetching profile from database...');
    console.log('AUTH ID:', authUser.id);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      // If profile doesn't exist, create a basic user object
      if (error.code === 'PGRST116') {
        console.log('⚠️ Profile not found, creating basic user object');
        
        try {
          // Pass the accessToken (which you now have) to the ticket fetching function
          const tickets = await fetchUserTickets();
          return {
            id: authUser.id,
            name: authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            purchasedTickets: tickets,
            isAdmin: false,
          };
        } catch (ticketError) {
          console.error('❌ Error fetching tickets:', ticketError);
          return {
            id: authUser.id,
            name: authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            purchasedTickets: [],
            isAdmin: false,
          };
        }
      }
      
      console.error('❌ Error fetching profile:', error);
      return null;
    }

    console.log('✅ Profile found:', profile);

    // Fetch user's tickets
    try {
      // Pass the accessToken (which you now have) to the ticket fetching function
      const tickets = await fetchUserTickets();
      console.log('✅ Tickets loaded:', tickets);

      return {
        id: profile.id,
        name: profile.full_name || profile.email || 'User',
        email: profile.email || authUser.email || '',
        purchasedTickets: tickets,
        isAdmin: profile.is_admin || false,
      };
    } catch (ticketError) {
      console.error('❌ Error fetching tickets:', ticketError);
      return {
        id: profile.id,
        name: profile.full_name || profile.email || 'User',
        email: profile.email || authUser.email || '',
        purchasedTickets: [],
        isAdmin: profile.is_admin || false,
      };
    }
  } catch (error) {
    console.error('❌ Unexpected error in fetchUserProfile:', error);
    return null;
  }
}