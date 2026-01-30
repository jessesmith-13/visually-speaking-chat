import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePromoCodes } from "@/features/promo-codes/hooks";
import type {
  PromoCode,
  CreatePromoCodeInput,
} from "@/features/promo-codes/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { useApp } from "@/app/hooks";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table";
import { Badge } from "@/ui/badge";

export function PromoCodesRoute() {
  const navigate = useNavigate();
  const { user, events } = useApp();
  const {
    loading,
    fetchPromoCodes,
    createPromoCode,
    updatePromoCode,
    deletePromoCode,
  } = usePromoCodes();

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [promoCodeToDelete, setPromoCodeToDelete] = useState<PromoCode | null>(
    null,
  );

  // Form state
  const [formData, setFormData] = useState<CreatePromoCodeInput>({
    code: "",
    type: "free",
    amount: 100,
    maxRedemptions: 1,
    active: true,
  });

  // Check admin access
  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/events");
    }
  }, [user, navigate]);

  // Load promo codes
  useEffect(() => {
    const load = async () => {
      try {
        const codes = await fetchPromoCodes();
        setPromoCodes(codes);
      } catch (error) {
        console.error("Failed to load promo codes:", error);
        toast.error("Failed to load promo codes");
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const loadPromoCodes = async () => {
    try {
      const codes = await fetchPromoCodes();
      setPromoCodes(codes);
    } catch (error) {
      console.error("Failed to load promo codes:", error);
      toast.error("Failed to load promo codes");
    }
  };

  const handleCreate = async () => {
    if (!formData.code || formData.code.trim() === "") {
      toast.error("Please enter a promo code");
      return;
    }

    if (formData.maxRedemptions < 1) {
      toast.error("Max redemptions must be at least 1");
      return;
    }

    try {
      // Convert datetime-local to ISO 8601 format
      const payload = {
        ...formData,
        expiresAt: formData.expiresAt
          ? new Date(formData.expiresAt).toISOString()
          : null,
      };

      await createPromoCode(payload);
      toast.success("Promo code created successfully");
      setShowCreateDialog(false);
      resetForm();
      loadPromoCodes();
    } catch (error) {
      console.error("Failed to create promo code:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create promo code",
      );
    }
  };

  const handleToggleActive = async (promoCode: PromoCode) => {
    try {
      await updatePromoCode(promoCode.id, { active: !promoCode.active });
      toast.success(
        `Promo code ${promoCode.active ? "deactivated" : "activated"}`,
      );
      loadPromoCodes();
    } catch (error) {
      console.error("Failed to update promo code:", error);
      toast.error("Failed to update promo code");
    }
  };

  const handleDelete = async (promoCode: PromoCode) => {
    try {
      await deletePromoCode(promoCode.id);
      toast.success("Promo code deleted successfully");
      loadPromoCodes();
    } catch (error) {
      console.error("Failed to delete promo code:", error);
      toast.error("Failed to delete promo code");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      type: "free",
      amount: 100,
      maxRedemptions: 1,
      active: true,
    });
  };

  const getDiscountLabel = (promoCode: PromoCode) => {
    if (promoCode.type === "free" || promoCode.amount === 100) {
      return "100% OFF";
    }
    if (promoCode.type === "percent") {
      return `${promoCode.amount}% OFF`;
    }
    return `$${promoCode.amount} OFF`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Promo Codes
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage discount codes and comp tickets
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4 mr-2" />
              Create Promo Code
            </Button>
          </div>

          {/* Promo Codes Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Promo Codes</CardTitle>
              <CardDescription>
                View and manage all promotional codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && promoCodes.length === 0 ? (
                <p className="text-center py-4 text-gray-500">
                  Loading promo codes...
                </p>
              ) : promoCodes.length === 0 ? (
                <p className="text-center py-4 text-gray-500">
                  No promo codes found. Create one to get started.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promoCodes.map((promoCode) => (
                        <TableRow key={promoCode.id}>
                          <TableCell className="font-mono font-bold">
                            {promoCode.code}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getDiscountLabel(promoCode)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {promoCode.events?.name || (
                              <span className="text-gray-500 italic">
                                Global
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {promoCode.redeemed_count} /{" "}
                            {promoCode.max_redemptions}
                          </TableCell>
                          <TableCell>
                            {promoCode.expires_at ? (
                              <span
                                className={
                                  isExpired(promoCode.expires_at)
                                    ? "text-red-600 dark:text-red-400"
                                    : ""
                                }
                              >
                                {format(new Date(promoCode.expires_at), "PP")}
                              </span>
                            ) : (
                              <span className="text-gray-500">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {promoCode.active &&
                            !isExpired(promoCode.expires_at) &&
                            promoCode.redeemed_count <
                              promoCode.max_redemptions ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(promoCode)}
                              >
                                {promoCode.active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setPromoCodeToDelete(promoCode);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Promo Code Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>
              Create a new promotional discount code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Promo Code *</Label>
              <Input
                id="code"
                placeholder="e.g. SAVE50"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Discount Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "percent" | "fixed" | "free") => {
                  setFormData({
                    ...formData,
                    type: value,
                    amount: value === "free" ? 100 : formData.amount,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (100% OFF)</SelectItem>
                  <SelectItem value="percent">Percentage Discount</SelectItem>
                  <SelectItem value="fixed">Fixed Dollar Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type !== "free" && (
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {formData.type === "percent"
                    ? "Percentage (%)"
                    : "Dollar Amount ($)"}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  max={formData.type === "percent" ? 100 : undefined}
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="event">Event (Optional)</Label>
              <Select
                value={formData.eventId || "global"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    eventId: value === "global" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Events)</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRedemptions">Max Redemptions *</Label>
              <Input
                id="maxRedemptions"
                type="number"
                min="1"
                value={formData.maxRedemptions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxRedemptions: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiresAt: e.target.value || null,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create Promo Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Promo Code Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Promo Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this promo code?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Promo Code</Label>
              <Input
                id="code"
                placeholder="e.g. SAVE50"
                value={promoCodeToDelete?.code || ""}
                readOnly
                className="font-mono uppercase"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setPromoCodeToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (promoCodeToDelete) {
                  handleDelete(promoCodeToDelete);
                }
                setShowDeleteDialog(false);
                setPromoCodeToDelete(null);
              }}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Promo Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
