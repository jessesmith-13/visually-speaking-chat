import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminOperations, tickets } from "@/lib/edge/client";
import { useApp } from "@/app/hooks";
import {
  useEventStatus,
  useTicketManagement,
  useEventUpdates,
  useEventParticipants,
  useStripeReturn,
  EventUpdate,
} from "@/features/events/hooks";
import { redeemPromoCode } from "@/features/promo-codes/api";
import type { RedeemPromoResponse } from "@/features/promo-codes/types";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import { EditEventDialog } from "./components/EditEventDialog";
import { EventHeader } from "./components/EventHeader";
import { EventDetailsCard } from "./components/EventDetailsCard";
import { TicketPurchaseCard } from "./components/TicketPurchaseCard";
import { EventUpdatesCard } from "./components/EventUpdatesCard";
import { AdminUpdateForm } from "./components/AdminUpdateForm";
import { AdminParticipantsList } from "./components/AdminParticipantsList";

export function EventDetailRoute() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { events, user, refreshUserTickets, refreshEvents, removeEvent } =
    useApp();
  const currentEvent = events.find((e) => e.id === eventId);

  // Use centralized hooks
  const { isEventLive, isEventPast, isEventUpcoming } =
    useEventStatus(currentEvent);
  const {
    hasTicket,
    userTicketId,
    isRefunding,
    setHasTicket,
    setUserTicketId,
    setIsRefunding,
  } = useTicketManagement(currentEvent, user, refreshUserTickets);
  const { eventUpdates, setEventUpdates } = useEventUpdates(currentEvent);
  const { participants, loadingParticipants } = useEventParticipants(
    currentEvent,
    user?.isAdmin,
  );

  // Handle Stripe return
  useStripeReturn(
    currentEvent,
    refreshUserTickets,
    refreshEvents,
    setHasTicket,
  );

  // Local state for component-specific functionality
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCancelEventDialog, setShowCancelEventDialog] = useState(false);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);

  // Edit event state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Promo code state
  const [promoCodeData, setPromoCodeData] =
    useState<RedeemPromoResponse | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Early return AFTER all hooks
  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Event not found</p>
            <Button onClick={() => navigate("/events")} className="mt-4">
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const spotsLeft = currentEvent.capacity - currentEvent.attendees;

  const handlePurchase = async () => {
    if (!user || !currentEvent) return;

    if (hasTicket) {
      toast.error("You already have a ticket for this event");
      return;
    }

    setIsPurchasing(true);

    try {
      console.log("🎫 Starting ticket purchase...");
      console.log("💳 Using Stripe Checkout...");

      const { createCheckoutSession } = await import("@/lib/stripe/client");

      // Calculate final amount (use discounted amount if promo code applied)
      const finalAmount =
        promoCodeData?.discountedAmount ?? Math.round(currentEvent.price * 100);

      console.log(
        `💰 Amount: $${finalAmount / 100} (original: $${currentEvent.price}, discount: $${discountAmount / 100})`,
      );
      if (promoCodeData?.promoCodeId) {
        console.log(`🎟️ Promo Code ID: ${promoCodeData.promoCodeId}`);
      }

      const { checkoutUrl } = await createCheckoutSession({
        eventId: currentEvent.id,
        amount: finalAmount,
        promoCodeId: promoCodeData?.promoCodeId,
      });

      console.log("✅ Redirecting to Stripe Checkout...");

      // Redirect to Stripe's checkout page
      window.location.href = checkoutUrl;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted (component unmounted)");
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to purchase ticket. Please try again.";
      console.error("Purchase error:", error);
      toast.error(errorMessage);
      setIsPurchasing(false);
    }
  };

  const handleJoinEvent = () => {
    navigate(`/room/${currentEvent.id}`);
  };

  const handleDeleteEvent = async () => {
    if (!currentEvent) return;

    setIsCancelling(true);

    try {
      console.log("🗑️ Starting event deletion...");

      // Demo deletion (in production, this would integrate with real backend)
      await removeEvent(currentEvent.id);

      console.log("✅ Event deleted, refreshing data...");

      // Refresh events to get updated list
      await refreshEvents().catch((err) => {
        console.error("❌ Error refreshing events:", err);
        // Don't throw - allow the process to continue
      });

      console.log("✅ Data refreshed successfully");

      toast.success("Event deleted successfully!");

      // Use a shorter delay and navigate immediately
      setTimeout(() => {
        navigate("/events");
      }, 500);
    } catch (error: unknown) {
      // Ignore AbortError (happens when component unmounts during request)
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted (component unmounted)");
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete event. Please try again.";
      console.error("Deletion error:", error);
      toast.error(errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePostUpdate = async () => {
    if (!user?.isAdmin || !currentEvent) return;

    if (!updateTitle.trim()) {
      toast.error("Please enter an update title");
      return;
    }

    if (!updateMessage.trim()) {
      toast.error("Please enter an update message");
      return;
    }

    setIsPostingUpdate(true);

    try {
      console.log("📢 Posting event update via Edge Function...");

      // Use Edge Function instead of direct fetch with service role keys
      await adminOperations.postEventUpdate(
        currentEvent.id,
        updateTitle.trim(),
        updateMessage.trim(),
      );

      console.log("✅ Update posted successfully");

      // Refresh updates list
      const updates = await adminOperations.getEventUpdates(currentEvent.id);
      setEventUpdates(updates as EventUpdate[]);

      toast.success("Update posted successfully!");

      // Clear form
      setUpdateTitle("");
      setUpdateMessage("");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to post update";
      console.error("Error posting update:", error);
      toast.error(errorMessage);
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const handleCancelTicket = async () => {
    if (!userTicketId || !currentEvent) return;

    setShowCancelDialog(false);
    setIsRefunding(true);

    try {
      console.log("🎫 Cancelling ticket...");

      const result = await tickets.cancelTicket(userTicketId);

      console.log("✅ Ticket cancelled successfully");

      if (result.refunded) {
        toast.success(
          `Ticket cancelled and refund of $${currentEvent.price} processed!`,
          { duration: 6000 },
        );
      } else {
        toast.success("Ticket cancelled successfully!");
      }

      // Update local state FIRST (for immediate UI update)
      setHasTicket(false);
      setUserTicketId(null);

      // Then refresh from backend (to sync everything)
      await Promise.all([refreshUserTickets(), refreshEvents()]);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted (component unmounted)");
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to cancel ticket. Please try again.";
      console.error("Cancel ticket error:", error);
      toast.error(errorMessage);
    } finally {
      setIsRefunding(false);
    }
  };

  const handleApplyPromoCode = async (
    code: string,
  ): Promise<{ success: boolean; discount?: number; message?: string }> => {
    if (!currentEvent) {
      return { success: false, message: "Event not found" };
    }

    try {
      console.log("🎟️ Applying promo code:", code);

      const result = await redeemPromoCode(currentEvent.id, code);

      console.log("✅ Promo code response:", result);

      // If it's a free ticket, auto-claim it
      if (result.free && result.ticket) {
        toast.success("🎉 Free ticket claimed successfully!");

        // Update local state
        setHasTicket(true);

        // Refresh data
        await Promise.all([refreshUserTickets(), refreshEvents()]);

        return {
          success: true,
          message: "Free ticket claimed!",
        };
      }

      // Otherwise, apply the discount for checkout
      if (
        result.discountedAmount !== undefined &&
        result.originalAmount !== undefined
      ) {
        const discountInCents = result.originalAmount - result.discountedAmount;
        setDiscountAmount(discountInCents);
        setPromoCodeData(result);

        const discountPercent = Math.round(
          (discountInCents / result.originalAmount) * 100,
        );

        return {
          success: true,
          discount: discountInCents,
          message: `${discountPercent}% discount applied!`,
        };
      }

      return { success: false, message: "Invalid promo code response" };
    } catch (error: unknown) {
      console.error("❌ Promo code error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Invalid or expired promo code";

      return { success: false, message: errorMessage };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/events")}
          className="mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <EventHeader
              event={currentEvent}
              imageUrl={currentEvent.imageUrl}
              hasTicket={hasTicket}
              isEventLive={isEventLive}
              isEventPast={isEventPast}
            />

            <EventDetailsCard event={currentEvent} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <TicketPurchaseCard
              event={currentEvent}
              user={user}
              hasTicket={hasTicket}
              isEventLive={isEventLive}
              isEventPast={isEventPast}
              isEventUpcoming={isEventUpcoming}
              isPurchasing={isPurchasing}
              isRefunding={isRefunding}
              isCancelling={isCancelling}
              userTicketId={userTicketId}
              spotsLeft={spotsLeft}
              onPurchase={handlePurchase}
              onJoinEvent={handleJoinEvent}
              onSignIn={() => navigate("/auth")}
              onCancelTicket={() => setShowCancelDialog(true)}
              onCancelEvent={() => setShowCancelEventDialog(true)}
              onEditEvent={() => setIsEditDialogOpen(true)}
              onApplyPromoCode={handleApplyPromoCode}
              discountAmount={discountAmount}
            />

            <EventUpdatesCard updates={eventUpdates} />

            {user?.isAdmin && (
              <AdminUpdateForm
                updateTitle={updateTitle}
                updateMessage={updateMessage}
                isPostingUpdate={isPostingUpdate}
                attendeeCount={currentEvent.attendees}
                onTitleChange={setUpdateTitle}
                onMessageChange={setUpdateMessage}
                onSubmit={handlePostUpdate}
              />
            )}

            {user?.isAdmin && (
              <AdminParticipantsList
                participants={participants}
                loading={loadingParticipants}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit Event Dialog */}
      <EditEventDialog
        event={{
          id: currentEvent.id,
          name: currentEvent.name,
          description: currentEvent.description,
          date: currentEvent.date,
          duration: currentEvent.duration,
          price: currentEvent.price,
          capacity: currentEvent.capacity,
          imageUrl: currentEvent.imageUrl,
        }}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onEventUpdated={refreshEvents}
      />

      {/* Cancel Ticket Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your ticket for "
              {currentEvent.name}"?
              {currentEvent.price > 0 ? "You will receive a full refund." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelTicket}
              disabled={isRefunding}
            >
              {isRefunding ? "Refunding..." : "Cancel Ticket"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Event Dialog */}
      <AlertDialog
        open={showCancelEventDialog}
        onOpenChange={setShowCancelEventDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the event "{currentEvent.name}"?
              This will mark the event as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling Event..." : "Cancel Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
