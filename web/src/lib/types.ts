// Types for the application
export interface Event {
  id: string;
  name: string;
  description: string;
  date: Date;
  duration: number; // in minutes
  price: number;
  capacity: number;
  attendees: number;
  imageUrl: string;
  status: 'upcoming' | 'active' | 'ended' | 'cancelled'; // Event status
}

export interface User {
  id: string;
  name: string;
  email: string;
  purchasedTickets: string[]; // event IDs
  isAdmin?: boolean; // Admin flag for event creation
}

export interface VideoConnection {
  id: string;
  peerId: string;
  peerName: string;
  startTime: Date;
}