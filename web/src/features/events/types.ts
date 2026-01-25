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
  status: "upcoming" | "active" | "ended" | "cancelled";
  eventType: "virtual" | "in-person"; // New field
  venueName?: string; // Optional, for in-person events
  venueAddress?: string; // Optional, for in-person events
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
