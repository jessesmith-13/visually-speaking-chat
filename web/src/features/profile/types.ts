export interface User {
  id: string;
  name: string;
  email: string;
  purchasedTickets: string[]; // Array of event IDs
  isAdmin: boolean;
}
