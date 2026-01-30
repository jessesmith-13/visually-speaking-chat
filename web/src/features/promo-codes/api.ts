import { callEdgeFunction } from "@/lib/edge/client";
import type {
  PromoCode,
  CreatePromoCodeInput,
  UpdatePromoCodeInput,
  RedeemPromoResponse,
  CompTicketInput,
} from "./types";

/**
 * Fetch all promo codes (admin only)
 */
export async function fetchPromoCodes(): Promise<PromoCode[]> {
  const result = await callEdgeFunction<{ promoCodes: PromoCode[] }>(
    "admin-operations",
    "/promo-codes",
    {
      method: "GET",
    },
  );
  return result.promoCodes || [];
}

/**
 * Create a new promo code (admin only)
 */
export async function createPromoCode(
  input: CreatePromoCodeInput,
): Promise<PromoCode> {
  const result = await callEdgeFunction<{ promoCode: PromoCode }>(
    "admin-operations",
    "/promo-codes",
    {
      method: "POST",
      body: input,
    },
  );
  return result.promoCode;
}

/**
 * Update a promo code (admin only)
 */
export async function updatePromoCode(
  promoCodeId: string,
  input: UpdatePromoCodeInput,
): Promise<PromoCode> {
  const result = await callEdgeFunction<{ promoCode: PromoCode }>(
    "admin-operations",
    `/promo-codes/${promoCodeId}`,
    {
      method: "PUT",
      body: input,
    },
  );
  return result.promoCode;
}

/**
 * Delete a promo code (admin only)
 */
export async function deletePromoCode(promoCodeId: string): Promise<void> {
  await callEdgeFunction("admin-operations", `/promo-codes/${promoCodeId}`, {
    method: "DELETE",
  });
}

/**
 * Redeem a promo code
 */
export async function redeemPromoCode(
  eventId: string,
  code: string,
): Promise<RedeemPromoResponse> {
  const result = await callEdgeFunction<RedeemPromoResponse>(
    "tickets",
    "/redeem",
    {
      method: "POST",
      body: { eventId, code },
    },
  );
  return result;
}

/**
 * Issue a comp ticket (admin only)
 */
export async function issueCompTicket(
  input: CompTicketInput,
): Promise<unknown> {
  const result = await callEdgeFunction<{ ticket: unknown }>(
    "admin-operations",
    "/comp-ticket",
    {
      method: "POST",
      body: input,
    },
  );
  return result.ticket;
}
