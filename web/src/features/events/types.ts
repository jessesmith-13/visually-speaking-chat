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
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
