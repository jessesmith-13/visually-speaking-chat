import { useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Event } from '@/features/events/types';
import { User } from '@/features/profile/types';
import { fetchEvents } from '@/features/events/api';
import { fetchUserTickets } from '@/features/tickets/api';
import { fetchUserProfile } from '@/features/profile/api';
import { createEvent as createEventAPI } from '@/features/events/api';
import { deleteEvent as deleteEventAPI } from '@/features/events/api';
import { AppContext } from './AppContext';

// ============================================================================
// App Context Provider
// ============================================================================

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Load events from database
  const refreshEvents = useCallback(async () => {
    try {
      console.log('📋 [REFRESH] Starting refreshEvents...');
      const dbEvents = await fetchEvents();
      console.log('📋 [REFRESH] Events fetched:', dbEvents.length);
      setEvents(dbEvents);
    } catch (error) {
      console.error('❌ [REFRESH] Error loading events:', error);
    }
  }, []);

  // Refresh user tickets from database
  const refreshUserTickets = useCallback(async () => {
    try {
      const tickets = await fetchUserTickets();
      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          purchasedTickets: tickets,
        };
      });
    } catch (error) {
      console.error('Error refreshing tickets:', error);
    }
  }, []);

  // Initialize: Load user and events from database
  useEffect(() => {
    let isInitialized = false;
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('🚀 [INIT] Starting app initialization...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          console.log('🚀 Initial session found, loading profile...');
          const profile = await fetchUserProfile(session.user);
          
          if (!isMounted) return;
          
          if (profile) {
            setUser(profile);
            isInitialized = true;
          }
        }

        if (!isMounted) return;
        
        console.log('🚀 [INIT] Loading events...');
        await refreshEvents();
        console.log('🚀 [INIT] Events loaded successfully');
      } catch (error: unknown) {
        const err = error as { message?: string; name?: string };
        if (err.message?.includes('AbortError') || err.message?.includes('aborted') || err.name === 'AbortError') {
          console.log('⚠️ App initialization aborted (component unmounted)');
          return;
        }
        console.error('❌ [INIT] Error initializing app:', error);
      } finally {
        if (isMounted) {
          console.log('✅ App initialization complete, loading = false');
          setLoading(false);
        }
      }
    };

    initializeApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event);
      
      if (!isMounted) return;
      
      if (event === 'INITIAL_SESSION' && isInitialized) {
        console.log('⏭️ Skipping INITIAL_SESSION - already initialized');
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [AUTH] User signed in, fetching profile...');
        try {
          const profile = await fetchUserProfile(session.user);
          
          if (!isMounted) return;
          
          if (profile) {
            setUser(profile);
            isInitialized = true;
          }
          
          // Refresh events after login
          console.log('🔄 [AUTH] Refreshing events after login...');
          await refreshEvents();
        } catch (error: unknown) {
          const err = error as { message?: string; name?: string };
          if (err.message?.includes('AbortError') || err.message?.includes('aborted') || err.name === 'AbortError') {
            console.log('⚠️ Profile fetch aborted (component unmounted)');
            return;
          }
          console.error('❌ Error fetching profile on sign in:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        if (isMounted) {
          setUser(null);
          isInitialized = false;
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshEvents]);

  const purchaseTicket = (eventId: string) => {
    console.warn('⚠️ purchaseTicket is deprecated. Use purchaseTicketDemo from @/lib/stripe instead.');
    if (!user) return;
    
    setUser({
      ...user,
      purchasedTickets: [...user.purchasedTickets, eventId]
    });
  };

  const addEvent = async (event: Event) => {
    try {
      const newEvent = await createEventAPI(event);
      await refreshEvents();
      return newEvent;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  const removeEvent = async (eventId: string) => {
    try {
      await deleteEventAPI(eventId);
      setEvents(events.map(e => e.id === eventId ? { ...e, status: 'cancelled' as const } : e));
    } catch (error) {
      console.error('Error cancelling event:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider 
      value={{ 
        user, 
        setUser, 
        events, 
        addEvent,
        removeEvent,
        purchaseTicket,
        currentEvent,
        setCurrentEvent,
        loading,
        refreshUserTickets,
        refreshEvents,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
