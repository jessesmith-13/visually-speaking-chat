/**
 * Admin Operations Edge Function
 *
 * Admin-only endpoints for managing users, events, and event updates
 *
 * Endpoints:
 *   GET /users - List all users
 *   PUT /users/:userId/admin - Update user admin status
 *   POST /events - Create event
 *   PUT /events/:eventId - Update event
 *   DELETE /events/:eventId/cancel - Cancel event
 *   POST /events/:eventId/updates - Post event update
 *   GET /events/:eventId/updates - Get event updates (PUBLIC)
 *   GET /events/:eventId/participants - Get event participants
 *   POST /promo-codes - Create promo code
 *   GET /promo-codes - List all promo codes
 *   PUT /promo-codes/:promoCodeId - Update promo code
 *   DELETE /promo-codes/:promoCodeId - Delete promo code
 *   POST /comp-ticket - Issue comp ticket
 *
 * Security: Requires admin authentication (except GET event updates)
 */

import { handleCors } from "../_shared/cors.ts";
import { createAuthClient, createAdminClient } from "../_shared/supabase.ts";
import { requireUser, requireAdmin } from "../_shared/auth.ts";
import { json, badRequest, notFound, serverError } from "../_shared/http.ts";
import {
  validateRequired,
  validateUuid,
  validateNumber,
  validateDateString,
} from "../_shared/validate.ts";
import { withCors } from "../_shared/response.ts";

// Route handler type
type RouteHandler = (
  req: Request,
  userId: string | null,
  match: RegExpMatchArray,
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  corsHeaders: HeadersInit,
) => Promise<Response>;

// Route definition
interface Route {
  pattern: RegExp;
  method: string;
  requireAuth?: boolean;
  handler: RouteHandler;
}

Deno.serve(async (req) => {
  // Handle CORS
  const { earlyResponse, headers: corsHeaders } = handleCors(req);
  if (earlyResponse) return earlyResponse;

  try {
    // Parse path - check custom header first (for Supabase SDK calls), then URL
    const url = new URL(req.url);
    const customPath = req.headers.get("x-path");
    const path = customPath || url.pathname.replace(/^\/admin-operations/, "");
    let method = req.method;

    // Create admin client (needed for all operations)
    const supabaseAdmin = createAdminClient();

    // Define routes
    const routes: Route[] = [
      // GET /users - List all users
      {
        pattern: /^\/users$/,
        method: "GET",
        handler: async (_req, _userId, _match, supabaseAdmin, corsHeaders) => {
          console.log("📋 Fetching all users");

          const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email, is_admin, created_at, updated_at")
            .order("created_at", { ascending: false });

          if (error) {
            console.error("❌ Error fetching users:", error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} users`);
          return json({ users: data }, 200, corsHeaders);
        },
      },

      // PUT /users/:userId/admin - Update admin status
      {
        pattern: /^\/users\/([a-f0-9-]+)\/admin$/,
        method: "PUT",
        handler: async (req, _userId, match, supabaseAdmin, corsHeaders) => {
          const targetUserId = match[1];
          const uuidCheck = validateUuid(targetUserId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid user ID", corsHeaders);
          }

          const body = await req.json();
          const requiredCheck = validateRequired(body, ["isAdmin"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { isAdmin: newAdminStatus } = body;

          console.log(
            `🔧 Updating admin status: user=${targetUserId}, admin=${newAdminStatus}`,
          );

          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              is_admin: newAdminStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetUserId);

          if (error) {
            console.error("❌ Error updating admin status:", error);
            return serverError(error, corsHeaders);
          }

          console.log("✅ Admin status updated");
          return json({ success: true }, 200, corsHeaders);
        },
      },

      // POST /events - Create event
      {
        pattern: /^\/events$/,
        method: "POST",
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          const eventData = await req.json();
          const requiredCheck = validateRequired(eventData, [
            "name",
            "date",
            "duration",
            "price",
            "capacity",
          ]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          // Validate date
          const dateCheck = validateDateString(eventData.date);
          if (!dateCheck.valid) {
            return badRequest(`Invalid date: ${dateCheck.error}`, corsHeaders);
          }

          // Validate capacity (must be positive integer)
          const capacityCheck = validateNumber(eventData.capacity, {
            min: 1,
            integer: true,
          });
          if (!capacityCheck.valid) {
            return badRequest(
              `Invalid capacity: ${capacityCheck.error}`,
              corsHeaders,
            );
          }

          // Validate price (must be non-negative)
          const priceCheck = validateNumber(eventData.price, { min: 0 });
          if (!priceCheck.valid) {
            return badRequest(
              `Invalid price: ${priceCheck.error}`,
              corsHeaders,
            );
          }

          // Validate duration (must be positive)
          const durationCheck = validateNumber(eventData.duration, {
            min: 1,
            integer: true,
          });
          if (!durationCheck.valid) {
            return badRequest(
              `Invalid duration: ${durationCheck.error}`,
              corsHeaders,
            );
          }

          console.log("📝 Creating event:", eventData.name);

          const { data, error } = await supabaseAdmin
            .from("events")
            .insert({
              name: eventData.name,
              description: eventData.description,
              date: eventData.date,
              duration: durationCheck.value!,
              price: priceCheck.value!,
              capacity: capacityCheck.value!,
              attendees: 0,
              image_url: eventData.imageUrl,
              status: "upcoming",
              created_by: userId,
              event_type: eventData.event_type || "virtual",
              venue_name: eventData.venue_name,
              venue_address: eventData.venue_address,
            })
            .select(
              "id, name, description, date, duration, price, capacity, attendees, image_url, status, created_by, created_at, event_type, venue_name, venue_address",
            )
            .single();

          if (error) {
            console.error("❌ Error creating event:", error);
            return serverError(error, corsHeaders);
          }

          console.log("✅ Event created:", data.id);
          return json({ event: data }, 201, corsHeaders);
        },
      },

      // PUT /events/:eventId - Update event
      {
        pattern: /^\/events\/([a-f0-9-]+)$/,
        method: "PUT",
        handler: async (req, _userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          const updateData = await req.json();

          // Build update payload - only include fields that are explicitly present
          const updatePayload: Record<string, unknown> = {};

          // Always set updated_at
          updatePayload.updated_at = new Date().toISOString();

          // Validate and include name if present
          if (updateData.name !== undefined) {
            updatePayload.name = updateData.name;
          }

          // Validate and include description if present
          if (updateData.description !== undefined) {
            updatePayload.description = updateData.description;
          }

          // Validate and include date if present
          if (updateData.date !== undefined) {
            const dateCheck = validateDateString(updateData.date);
            if (!dateCheck.valid) {
              return badRequest(
                `Invalid date: ${dateCheck.error}`,
                corsHeaders,
              );
            }
            updatePayload.date = updateData.date;
          }

          // Validate and include capacity if present
          if (updateData.capacity !== undefined) {
            const capacityCheck = validateNumber(updateData.capacity, {
              min: 1,
              integer: true,
            });
            if (!capacityCheck.valid) {
              return badRequest(
                `Invalid capacity: ${capacityCheck.error}`,
                corsHeaders,
              );
            }
            updatePayload.capacity = capacityCheck.value;
          }

          // Validate and include price if present
          if (updateData.price !== undefined) {
            const priceCheck = validateNumber(updateData.price, { min: 0 });
            if (!priceCheck.valid) {
              return badRequest(
                `Invalid price: ${priceCheck.error}`,
                corsHeaders,
              );
            }
            updatePayload.price = priceCheck.value;
          }

          // Validate and include duration if present
          if (updateData.duration !== undefined) {
            const durationCheck = validateNumber(updateData.duration, {
              min: 1,
              integer: true,
            });
            if (!durationCheck.valid) {
              return badRequest(
                `Invalid duration: ${durationCheck.error}`,
                corsHeaders,
              );
            }
            updatePayload.duration = durationCheck.value;
          }

          // Include imageUrl if present (map to image_url)
          if (updateData.imageUrl !== undefined) {
            updatePayload.image_url = updateData.imageUrl;
          }

          // Include event_type if present
          if (updateData.event_type !== undefined) {
            updatePayload.event_type = updateData.event_type;
          }

          // Include venue_name if present
          if (updateData.venue_name !== undefined) {
            updatePayload.venue_name = updateData.venue_name;
          }

          // Include venue_address if present
          if (updateData.venue_address !== undefined) {
            updatePayload.venue_address = updateData.venue_address;
          }

          // Check if there are any fields to update besides updated_at
          if (Object.keys(updatePayload).length === 1) {
            return badRequest("No valid fields to update", corsHeaders);
          }

          console.log(`🔧 Updating event: ${eventId}`);

          const { data, error } = await supabaseAdmin
            .from("events")
            .update(updatePayload)
            .eq("id", eventId)
            .select(
              "id, name, description, date, duration, price, capacity, attendees, image_url, status, created_by, updated_at, event_type, venue_name, venue_address",
            )
            .single();

          if (error) {
            console.error("❌ Error updating event:", error);
            return serverError(error, corsHeaders);
          }

          console.log("✅ Event updated");
          return json({ event: data }, 200, corsHeaders);
        },
      },

      // DELETE /events/:eventId/cancel - Cancel event
      {
        pattern: /^\/events\/([a-f0-9-]+)\/cancel$/,
        method: "DELETE",
        handler: async (_req, _userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          console.log(`🚫 Cancelling event: ${eventId}`);

          const { error } = await supabaseAdmin
            .from("events")
            .update({ status: "cancelled" })
            .eq("id", eventId);

          if (error) {
            console.error("❌ Error cancelling event:", error);
            return serverError(error, corsHeaders);
          }

          console.log("✅ Event cancelled");
          return json({ success: true }, 200, corsHeaders);
        },
      },

      // POST /events/:eventId/updates - Post event update
      {
        pattern: /^\/events\/([a-f0-9-]+)\/updates$/,
        method: "POST",
        handler: async (req, userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          const body = await req.json();
          const requiredCheck = validateRequired(body, ["title", "message"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { title, message } = body;

          console.log(`📢 Posting update for event: ${eventId}`);

          const { data, error } = await supabaseAdmin
            .from("event_updates")
            .insert({
              event_id: eventId,
              title,
              message,
              created_by: userId,
            })
            .select("id, event_id, title, message, created_by, created_at")
            .single();

          if (error) {
            console.error("❌ Error posting update:", error);
            return serverError(error, corsHeaders);
          }

          console.log("✅ Update posted");
          return json({ update: data }, 201, corsHeaders);
        },
      },

      // GET /events/:eventId/updates - Get event updates (PUBLIC)
      {
        pattern: /^\/events\/([a-f0-9-]+)\/updates$/,
        method: "GET",
        requireAuth: false,
        handler: async (_req, _userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          console.log(`📖 Fetching updates for event: ${eventId}`);

          const { data, error } = await supabaseAdmin
            .from("event_updates")
            .select(
              "id, event_id, title, message, created_at, created_by, profiles:created_by(full_name, email)",
            )
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });

          if (error) {
            console.error("❌ Error fetching updates:", error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} updates`);
          return json({ updates: data }, 200, corsHeaders);
        },
      },

      // GET /events/:eventId/participants - Get event participants
      {
        pattern: /^\/events\/([a-f0-9-]+)\/participants$/,
        method: "GET",
        handler: async (_req, _userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          console.log(`👥 Fetching participants for event: ${eventId}`);

          const { data, error } = await supabaseAdmin
            .from("tickets")
            .select(
              "id, user_id, payment_amount, purchased_at, profiles:user_id(full_name, email)",
            )
            .eq("event_id", eventId)
            .eq("status", "active");

          if (error) {
            console.error("❌ Error fetching participants:", error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} participants`);
          return json({ participants: data }, 200, corsHeaders);
        },
      },

      // POST /promo-codes - Create promo code
      {
        pattern: /^\/promo-codes$/,
        method: "POST",
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          const body = await req.json();
          const requiredCheck = validateRequired(body, [
            "code",
            "type",
            "amount",
            "maxRedemptions",
          ]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const {
            code,
            type,
            amount,
            eventId,
            maxRedemptions,
            expiresAt,
            active = true,
          } = body;

          // Normalize code to uppercase
          const normalizedCode = code.toUpperCase();

          // Validate type
          if (!["percent", "fixed", "free"].includes(type)) {
            return badRequest(
              "Invalid type. Must be 'percent', 'fixed', or 'free'",
              corsHeaders,
            );
          }

          // Validate amount
          const amountCheck = validateNumber(amount, { min: 0 });
          if (!amountCheck.valid) {
            return badRequest(
              `Invalid amount: ${amountCheck.error}`,
              corsHeaders,
            );
          }

          // Validate maxRedemptions
          const maxRedemptionsCheck = validateNumber(maxRedemptions, {
            min: 1,
            integer: true,
          });
          if (!maxRedemptionsCheck.valid) {
            return badRequest(
              `Invalid maxRedemptions: ${maxRedemptionsCheck.error}`,
              corsHeaders,
            );
          }

          // Validate eventId if provided
          if (eventId) {
            const eventUuidCheck = validateUuid(eventId);
            if (!eventUuidCheck.valid) {
              return badRequest("Invalid event ID", corsHeaders);
            }
          }

          // Validate expiresAt if provided
          if (expiresAt) {
            const dateCheck = validateDateString(expiresAt);
            if (!dateCheck.valid) {
              return badRequest(
                `Invalid expiration date: ${dateCheck.error}`,
                corsHeaders,
              );
            }
          }

          console.log(`🎁 Creating promo code: ${normalizedCode}`);

          const { data, error } = await supabaseAdmin
            .from("promo_codes")
            .insert({
              code: normalizedCode,
              type,
              amount: amountCheck.value!,
              event_id: eventId || null,
              max_redemptions: maxRedemptionsCheck.value!,
              expires_at: expiresAt || null,
              active,
              created_by: userId,
            })
            .select()
            .single();

          if (error) {
            console.error("❌ Error creating promo code:", error);
            // Check for unique constraint violation
            if (error.code === "23505") {
              return badRequest("Promo code already exists", corsHeaders);
            }
            return serverError(error, corsHeaders);
          }

          console.log("✅ Promo code created:", data.id);
          return json({ promoCode: data }, 201, corsHeaders);
        },
      },

      // GET /promo-codes - List all promo codes
      {
        pattern: /^\/promo-codes$/,
        method: "GET",
        handler: async (_req, _userId, _match, supabaseAdmin, corsHeaders) => {
          console.log("📋 Fetching all promo codes");

          const { data, error } = await supabaseAdmin
            .from("promo_codes")
            .select("*, events(name), profiles:created_by(full_name)")
            .order("created_at", { ascending: false });

          if (error) {
            console.error("❌ Error fetching promo codes:", error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} promo codes`);
          return json({ promoCodes: data }, 200, corsHeaders);
        },
      },

      // PUT /promo-codes/:promoCodeId - Update promo code
      {
        pattern: /^\/promo-codes\/([a-f0-9-]+)$/,
        method: "PUT",
        handler: async (req, _userId, match, supabaseAdmin, corsHeaders) => {
          const promoCodeId = match[1];
          const uuidCheck = validateUuid(promoCodeId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid promo code ID", corsHeaders);
          }

          const body = await req.json();

          // Build update payload
          const updatePayload: Record<string, unknown> = {};

          if (body.active !== undefined) {
            updatePayload.active = body.active;
          }

          if (body.maxRedemptions !== undefined) {
            const maxRedemptionsCheck = validateNumber(body.maxRedemptions, {
              min: 1,
              integer: true,
            });
            if (!maxRedemptionsCheck.valid) {
              return badRequest(
                `Invalid maxRedemptions: ${maxRedemptionsCheck.error}`,
                corsHeaders,
              );
            }
            updatePayload.max_redemptions = maxRedemptionsCheck.value;
          }

          if (body.expiresAt !== undefined) {
            if (body.expiresAt === null) {
              updatePayload.expires_at = null;
            } else {
              const dateCheck = validateDateString(body.expiresAt);
              if (!dateCheck.valid) {
                return badRequest(
                  `Invalid expiration date: ${dateCheck.error}`,
                  corsHeaders,
                );
              }
              updatePayload.expires_at = body.expiresAt;
            }
          }

          if (Object.keys(updatePayload).length === 0) {
            return badRequest("No valid fields to update", corsHeaders);
          }

          console.log(`🔧 Updating promo code: ${promoCodeId}`);

          const { data, error } = await supabaseAdmin
            .from("promo_codes")
            .update(updatePayload)
            .eq("id", promoCodeId)
            .select()
            .single();

          if (error) {
            console.error("❌ Error updating promo code:", error);
            return serverError(error, corsHeaders);
          }

          console.log("✅ Promo code updated");
          return json({ promoCode: data }, 200, corsHeaders);
        },
      },

      // DELETE /promo-codes/:promoCodeId - Delete promo code
      {
        pattern: /^\/promo-codes\/([a-f0-9-]+)$/,
        method: "DELETE",
        handler: async (_req, _userId, match, supabaseAdmin, corsHeaders) => {
          const promoCodeId = match[1];
          const uuidCheck = validateUuid(promoCodeId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid promo code ID", corsHeaders);
          }

          console.log(`🗑️ Deleting promo code: ${promoCodeId}`);

          const { error } = await supabaseAdmin
            .from("promo_codes")
            .delete()
            .eq("id", promoCodeId);

          if (error) {
            console.error("❌ Error deleting promo code:", error);
            return serverError(error, corsHeaders);
          }

          console.log("✅ Promo code deleted");
          return json({ success: true }, 200, corsHeaders);
        },
      },

      // POST /comp-ticket - Issue comp ticket
      {
        pattern: /^\/comp-ticket$/,
        method: "POST",
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          const body = await req.json();
          const requiredCheck = validateRequired(body, [
            "eventId",
            "targetUserId",
          ]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { eventId, targetUserId } = body;

          // Validate IDs
          const eventUuidCheck = validateUuid(eventId);
          if (!eventUuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          const userUuidCheck = validateUuid(targetUserId);
          if (!userUuidCheck.valid) {
            return badRequest("Invalid user ID", corsHeaders);
          }

          console.log(
            `🎁 Issuing comp ticket: event=${eventId}, user=${targetUserId}`,
          );

          // Check if user already has a ticket
          const { data: existingTicket } = await supabaseAdmin
            .from("tickets")
            .select("id")
            .eq("user_id", targetUserId)
            .eq("event_id", eventId)
            .eq("status", "active")
            .maybeSingle();

          if (existingTicket) {
            return badRequest(
              "User already has a ticket for this event",
              corsHeaders,
            );
          }

          // Check event exists and has capacity
          const { data: event, error: eventError } = await supabaseAdmin
            .from("events")
            .select("capacity, attendees, name")
            .eq("id", eventId)
            .single();

          if (eventError || !event) {
            return notFound("Event not found", corsHeaders);
          }

          if (event.attendees >= event.capacity) {
            return badRequest("Event is sold out", corsHeaders);
          }

          // Create comp ticket
          const { data: newTicket, error: ticketError } = await supabaseAdmin
            .from("tickets")
            .insert({
              user_id: targetUserId,
              event_id: eventId,
              payment_amount: 0,
              stripe_payment_intent_id: `admin_comp_${Date.now()}`,
              status: "active",
              source: "admin_comp",
              promo_code_id: null,
            })
            .select()
            .single();

          if (ticketError) {
            console.error("❌ Error creating comp ticket:", ticketError);
            return serverError(ticketError, corsHeaders);
          }

          // Increment event attendees
          const { error: updateError } = await supabaseAdmin
            .from("events")
            .update({ attendees: event.attendees + 1 })
            .eq("id", eventId);

          if (updateError) {
            console.warn("⚠️ Failed to update attendees:", updateError);
          }

          console.log("✅ Comp ticket issued:", newTicket.id);
          return json({ ticket: newTicket }, 201, corsHeaders);
        },
      },
    ];

    // Match route FIRST
    let matchedRoute: Route | null = null;
    let match: RegExpMatchArray | null = null;

    for (const route of routes) {
      const routeMatch = path.match(route.pattern);
      if (routeMatch && method === route.method) {
        matchedRoute = route;
        match = routeMatch;
        break;
      }
    }

    // Route not found
    if (!matchedRoute || !match) {
      return notFound(`Route not found: ${method} ${path}`, corsHeaders);
    }

    // Check if auth is required (default: true)
    const requiresAuth = matchedRoute.requireAuth !== false;

    let userId: string | null = null;

    if (requiresAuth) {
      // Authenticate user
      const authClient = createAuthClient();
      const userResult = await requireUser(req, authClient, corsHeaders);
      if (userResult instanceof Response)
        return withCors(userResult, corsHeaders);

      // Verify admin status
      const adminResult = await requireAdmin(userResult.userId, supabaseAdmin);
      if (adminResult instanceof Response)
        return withCors(adminResult, corsHeaders);

      userId = userResult.userId;
      console.log("✅ Admin verified:", userId);
    } else {
      console.log("🌐 Public route - no auth required");
    }

    // Call the matched route handler
    return await matchedRoute.handler(
      req,
      userId,
      match,
      supabaseAdmin,
      corsHeaders,
    );
  } catch (error) {
    return serverError(error, corsHeaders);
  }
});
