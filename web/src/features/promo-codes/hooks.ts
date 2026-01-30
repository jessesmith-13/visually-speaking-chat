import { useState } from "react";
import * as api from "./api";
import type {
  PromoCode,
  CreatePromoCodeInput,
  UpdatePromoCodeInput,
  RedeemPromoResponse,
  CompTicketInput,
} from "./types";

export function usePromoCodes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPromoCodes = async (): Promise<PromoCode[]> => {
    setLoading(true);
    setError(null);

    try {
      return await api.fetchPromoCodes();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch promo codes";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createPromoCode = async (
    input: CreatePromoCodeInput,
  ): Promise<PromoCode> => {
    setLoading(true);
    setError(null);

    try {
      return await api.createPromoCode(input);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create promo code";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updatePromoCode = async (
    promoCodeId: string,
    input: UpdatePromoCodeInput,
  ): Promise<PromoCode> => {
    setLoading(true);
    setError(null);

    try {
      return await api.updatePromoCode(promoCodeId, input);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update promo code";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deletePromoCode = async (promoCodeId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await api.deletePromoCode(promoCodeId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete promo code";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const redeemPromoCode = async (
    eventId: string,
    code: string,
  ): Promise<RedeemPromoResponse> => {
    setLoading(true);
    setError(null);

    try {
      return await api.redeemPromoCode(eventId, code);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to redeem promo code";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const issueCompTicket = async (input: CompTicketInput): Promise<unknown> => {
    setLoading(true);
    setError(null);

    try {
      return await api.issueCompTicket(input);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to issue comp ticket";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchPromoCodes,
    createPromoCode,
    updatePromoCode,
    deletePromoCode,
    redeemPromoCode,
    issueCompTicket,
  };
}
