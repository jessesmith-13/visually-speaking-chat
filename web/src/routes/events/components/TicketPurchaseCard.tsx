import { format } from "date-fns";
import { DollarSign, CreditCard, Trash2, Edit, Tag } from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import { Event } from "@/features/events/types";
import { User } from "@/features/profile/types";
import { useState } from "react";

interface TicketPurchaseCardProps {
  event: Event;
  user: User | null;
  hasTicket: boolean;
  isEventLive: boolean;
  isEventPast: boolean;
  isEventUpcoming: boolean;
  isPurchasing: boolean;
  isRefunding: boolean;
  isCancelling: boolean;
  userTicketId: string | null;
  spotsLeft: number;
  onPurchase: () => void;
  onJoinEvent: () => void;
  onSignIn: () => void;
  onCancelTicket: () => void;
  onCancelEvent: () => void;
  onEditEvent: () => void;
  onApplyPromoCode?: (
    code: string,
  ) => Promise<{ success: boolean; discount?: number; message?: string }>;
  discountAmount?: number;
}

export function TicketPurchaseCard({
  event,
  user,
  hasTicket,
  isEventLive,
  isEventPast,
  isEventUpcoming,
  isPurchasing,
  isRefunding,
  isCancelling,
  userTicketId,
  spotsLeft,
  onPurchase,
  onJoinEvent,
  onSignIn,
  onCancelTicket,
  onCancelEvent,
  onEditEvent,
  onApplyPromoCode,
  discountAmount = 0,
}: TicketPurchaseCardProps) {
  const isAdmin = user?.isAdmin || false;
  const canJoinEvent = hasTicket || isAdmin;
  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");

  const finalPrice = Math.max(0, event.price - discountAmount / 100);

  const handleApplyPromo = async () => {
    if (!onApplyPromoCode || !promoCode.trim()) return;

    setApplyingPromo(true);
    setPromoMessage("");

    try {
      const result = await onApplyPromoCode(promoCode.trim());
      if (result.success) {
        setPromoMessage(`✓ Promo code applied! ${result.message || ""}`);
      } else {
        setPromoMessage(`✗ ${result.message || "Invalid promo code"}`);
      }
    } catch {
      setPromoMessage(`✗ Failed to apply promo code`);
    } finally {
      setApplyingPromo(false);
    }
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="size-5" />${event.price}
        </CardTitle>
        <CardDescription>
          {spotsLeft > 0 ? (
            <span className="text-green-600">
              {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
            </span>
          ) : (
            <span className="text-red-600">Event Full</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user ? (
          <>
            <p className="text-sm text-gray-600">
              Please sign in to purchase a ticket
            </p>
            <Button className="w-full" onClick={onSignIn}>
              Sign In
            </Button>
          </>
        ) : canJoinEvent ? (
          <>
            {event.status === "cancelled" ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ This event has been cancelled
                </p>
              </div>
            ) : isEventPast ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-800 font-medium">
                  📅 This event has ended
                </p>
              </div>
            ) : isEventUpcoming ? (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium mb-1">
                    {isAdmin && !hasTicket
                      ? "👑 Admin Access Granted"
                      : "✓ You have a ticket for this event"}
                  </p>
                  <p className="text-xs text-green-700">
                    Event starts at {format(new Date(event.date), "p")}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium text-center">
                    🕐 Event hasn't started yet
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    {isAdmin && !hasTicket
                      ? "👑 Admin Access - No Ticket Required"
                      : "✓ You have a ticket for this event"}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={onJoinEvent}
                  disabled={isEventPast || event.eventType === "in-person"}
                >
                  {event.eventType === "in-person"
                    ? "In-Person Event - Check In At Venue"
                    : isEventLive
                      ? "Join Now"
                      : "Join Event"}
                </Button>
              </>
            )}
            {isAdmin && (
              <Button
                className="w-full mt-2"
                variant="destructive"
                onClick={onCancelEvent}
                disabled={isCancelling || event.status === "cancelled"}
              >
                <Trash2 className="size-4 mr-2" />
                {isCancelling
                  ? "Cancelling Event..."
                  : event.status === "cancelled"
                    ? "Event Cancelled"
                    : "Cancel Event (Admin)"}
              </Button>
            )}
            {isAdmin && (
              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={onEditEvent}
              >
                <Edit className="size-4 mr-2" />
                Edit Event
              </Button>
            )}
            {userTicketId && (
              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={onCancelTicket}
                disabled={isRefunding}
              >
                <Trash2 className="size-4 mr-2" />
                {isRefunding ? "Refunding..." : "Cancel Ticket"}
              </Button>
            )}
          </>
        ) : (
          <>
            {event.status === "cancelled" ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium text-center">
                  ⚠️ This event has been cancelled
                </p>
              </div>
            ) : isEventPast ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-800 font-medium text-center">
                  📅 This event has ended
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ticket Price</span>
                    <span className="font-semibold">${event.price}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span className="font-semibold">
                        -${(discountAmount / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Service Fee</span>
                    <span className="font-semibold">$0</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${finalPrice.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full"
                  />
                  <Button
                    className="w-full"
                    onClick={handleApplyPromo}
                    disabled={applyingPromo}
                  >
                    <Tag className="size-4 mr-2" />
                    {applyingPromo ? "Applying..." : "Apply Promo Code"}
                  </Button>
                  {promoMessage && (
                    <p
                      className={`text-xs ${
                        promoMessage.startsWith("✓")
                          ? "text-green-600"
                          : "text-red-600"
                      } text-center`}
                    >
                      {promoMessage}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={onPurchase}
                  disabled={spotsLeft === 0 || isPurchasing || isEventPast}
                >
                  <CreditCard className="size-4 mr-2" />
                  {isPurchasing ? "Purchasing..." : "Purchase Ticket"}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Secure payment powered by Stripe
                </p>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
