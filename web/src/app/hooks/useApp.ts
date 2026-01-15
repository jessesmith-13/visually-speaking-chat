import { useContext } from 'react';
import { AppContext, AppContextType } from '../contexts/AppContext';

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    if (typeof window !== 'undefined') {
      console.warn('useApp called without AppProvider (likely during hot-reload)');
      
      return {
        user: null,
        setUser: () => {},
        events: [],
        addEvent: () => {},
        removeEvent: async () => {},
        purchaseTicket: () => {},
        currentEvent: null,
        setCurrentEvent: () => {},
        loading: true,
        refreshUserTickets: async () => {},
        refreshEvents: async () => {},
      } as AppContextType;
    }
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
