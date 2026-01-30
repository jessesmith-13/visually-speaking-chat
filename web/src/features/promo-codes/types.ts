export interface PromoCode {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free";
  amount: number;
  event_id: string | null;
  max_redemptions: number;
  redeemed_count: number;
  expires_at: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
  events?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

export interface PromoRedemption {
  id: string;
  promo_code_id: string;
  user_id: string;
  event_id: string;
  redeemed_at: string;
}

export interface CreatePromoCodeInput {
  code: string;
  type: "percent" | "fixed" | "free";
  amount: number;
  eventId?: string | null;
  maxRedemptions: number;
  expiresAt?: string | null;
  active?: boolean;
}

export interface UpdatePromoCodeInput {
  active?: boolean;
  maxRedemptions?: number;
  expiresAt?: string | null;
}

export interface RedeemPromoResponse {
  free: boolean;
  ticket?: unknown;
  discountedAmount?: number;
  originalAmount?: number;
  discount?: number;
  promoCodeId?: string;
}

export interface CompTicketInput {
  eventId: string;
  targetUserId: string;
}
