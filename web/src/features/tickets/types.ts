export interface Ticket {
  id: string;
  user_id: string;
  event_id: string;
  status: 'active' | 'used' | 'refunded';
  payment_intent_id?: string;
  purchased_at: string;
}
