import { useApp } from "@/app/hooks";

export function useTickets() {
  const { user, refreshUserTickets } = useApp();
  return {
    tickets: user?.purchasedTickets || [],
    refreshTickets: refreshUserTickets,
    loading: false,
  };
}

export function useHasTicket(eventId: string) {
  const { user } = useApp();
  return user?.purchasedTickets.includes(eventId) || false;
}

export function useUserTickets() {
  const { user } = useApp();
  return user?.purchasedTickets || [];
}
