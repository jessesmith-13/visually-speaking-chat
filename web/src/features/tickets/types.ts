export interface Ticket {
  id: string;
  user_id: string;
  event_id: string;
  status: "active" | "used" | "refunded" | "cancelled";
  payment_intent_id?: string;
  purchased_at: string;
  check_in_count?: number; // New field for in-person events
  last_checked_in_at?: string; // New field for in-person events
}
