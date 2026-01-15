import { createContext } from 'react';
import { Event } from '@/features/events/types';
import { User } from '@/features/profile/types';

// ============================================================================
// App Context Type
// ============================================================================

export interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  events: Event[];
  addEvent: (event: Event) => void;
  removeEvent: (eventId: string) => Promise<void>;
  purchaseTicket: (eventId: string) => void;
  currentEvent: Event | null;
  setCurrentEvent: (event: Event | null) => void;
  loading: boolean;
  refreshUserTickets: () => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
