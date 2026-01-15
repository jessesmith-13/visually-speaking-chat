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
 *   GET /events/:eventId/updates - Get event updates
 *   GET /events/:eventId/participants - Get event participants
 * 
 * Security: Requires admin authentication
 */

import { handleCors } from '../_shared/cors.ts';
import { createAuthClient, createAdminClient } from '../_shared/supabase.ts';
import { requireUser, requireAdmin } from '../_shared/auth.ts';
import { json, badRequest, notFound, serverError } from '../_shared/http.ts';
import { validateRequired, validateUuid, validateNumber, validateDateString } from '../_shared/validate.ts';
import { withCors } from '../_shared/response.ts';

// Route handler type
type RouteHandler = (
  req: Request,
  userId: string,
  match: RegExpMatchArray,
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  corsHeaders: HeadersInit
) => Promise<Response>;

// Route definition
interface Route {
  pattern: RegExp;
  method: string;
  handler: RouteHandler;
}

Deno.serve(async (req) => {
  // Handle CORS
  const { earlyResponse, headers: corsHeaders } = handleCors(req);
  if (earlyResponse) return earlyResponse;

  try {
    // Authenticate user
    const authClient = createAuthClient();
    const userResult = await requireUser(req, authClient, corsHeaders);
    if (userResult instanceof Response) return withCors(userResult, corsHeaders);

    // Verify admin status
    const supabaseAdmin = createAdminClient();
    const adminResult = await requireAdmin(userResult.userId, supabaseAdmin);
    if (adminResult instanceof Response) return withCors(adminResult, corsHeaders);

    const userId = userResult.userId;
    console.log('✅ Admin verified:', userId);

    // Parse path - check custom header first (for Supabase SDK calls), then URL
    const url = new URL(req.url);
    const customPath = req.headers.get('x-path');
    const path = customPath || url.pathname.replace(/^\/admin-operations/, '');
    const method = req.method;

    // Define routes
    const routes: Route[] = [
      // GET /users - List all users
      {
        pattern: /^\/users$/,
        method: 'GET',
        handler: async (_req, _userId, _match, supabaseAdmin, corsHeaders) => {
          console.log('📋 Fetching all users');

          const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, is_admin, created_at, updated_at')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error fetching users:', error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} users`);
          return json({ users: data }, 200, corsHeaders);
        },
      },

      // PUT /users/:userId/admin - Update admin status
      {
        pattern: /^\/users\/([a-f0-9-]+)\/admin$/,
        method: 'PUT',
        handler: async (req, _userId, match, supabaseAdmin, corsHeaders) => {
          const targetUserId = match[1];
          const uuidCheck = validateUuid(targetUserId);
          if (!uuidCheck.valid) {
            return badRequest('Invalid user ID', corsHeaders);
          }

          const body = await req.json();
          const requiredCheck = validateRequired(body, ['isAdmin']);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { isAdmin: newAdminStatus } = body;

          console.log(`🔧 Updating admin status: user=${targetUserId}, admin=${newAdminStatus}`);

          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              is_admin: newAdminStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUserId);

          if (error) {
            console.error('❌ Error updating admin status:', error);
            return serverError(error, corsHeaders);
          }

          console.log('✅ Admin status updated');
          return json({ success: true }, 200, corsHeaders);
        },
      },

      // POST /events - Create event
      {
        pattern: /^\/events$/,
        method: 'POST',
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          const eventData = await req.json();
          const requiredCheck = validateRequired(eventData, [
            'name',
            'date',
            'duration',
            'price',
            'capacity',
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
          const capacityCheck = validateNumber(eventData.capacity, { min: 1, integer: true });
          if (!capacityCheck.valid) {
            return badRequest(`Invalid capacity: ${capacityCheck.error}`, corsHeaders);
          }

          // Validate price (must be non-negative)
          const priceCheck = validateNumber(eventData.price, { min: 0 });
          if (!priceCheck.valid) {
            return badRequest(`Invalid price: ${priceCheck.error}`, corsHeaders);
          }

          // Validate duration (must be positive)
          const durationCheck = validateNumber(eventData.duration, { min: 1, integer: true });
          if (!durationCheck.valid) {
            return badRequest(`Invalid duration: ${durationCheck.error}`, corsHeaders);
          }

          console.log('📝 Creating event:', eventData.name);

          const { data, error } = await supabaseAdmin
            .from('events')
            .insert({
              name: eventData.name,
              description: eventData.description,
              date: eventData.date,
              duration: durationCheck.value!,
              ticket_price: priceCheck.value!,
              capacity: capacityCheck.value!,
              attendees: 0,
              image_url: eventData.imageUrl,
              status: 'upcoming',
              created_by: userId,
            })
            .select('id, name, description, date, duration, ticket_price, capacity, attendees, image_url, status, created_by, created_at')
            .single();

          if (error) {
            console.error('❌ Error creating event:', error);
            return serverError(error, corsHeaders);
          }

          console.log('✅ Event created:', data.id);
          return json({ event: data }, 201, corsHeaders);
        },
      },

      // PUT /events/:eventId - Update event
      {
        pattern: /^\/events\/([a-f0-9-]+)$/,
        method: 'PUT',
        handler: async (req, _userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest('Invalid event ID', corsHeaders);
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
              return badRequest(`Invalid date: ${dateCheck.error}`, corsHeaders);
            }
            updatePayload.date = updateData.date;
          }

          // Validate and include capacity if present
          if (updateData.capacity !== undefined) {
            const capacityCheck = validateNumber(updateData.capacity, { min: 1, integer: true });
            if (!capacityCheck.valid) {
              return badRequest(`Invalid capacity: ${capacityCheck.error}`, corsHeaders);
            }
            updatePayload.capacity = capacityCheck.value;
          }

          // Validate and include price if present
          if (updateData.price !== undefined) {
            const priceCheck = validateNumber(updateData.price, { min: 0 });
            if (!priceCheck.valid) {
              return badRequest(`Invalid price: ${priceCheck.error}`, corsHeaders);
            }
            updatePayload.ticket_price = priceCheck.value;
          }

          // Validate and include duration if present
          if (updateData.duration !== undefined) {
            const durationCheck = validateNumber(updateData.duration, { min: 1, integer: true });
            if (!durationCheck.valid) {
              return badRequest(`Invalid duration: ${durationCheck.error}`, corsHeaders);
            }
            updatePayload.duration = durationCheck.value;
          }

          // Include imageUrl if present (map to image_url)
          if (updateData.imageUrl !== undefined) {
            updatePayload.image_url = updateData.imageUrl;
          }

          // Check if there are any fields to update besides updated_at
          if (Object.keys(updatePayload).length === 1) {
            return badRequest('No valid fields to update', corsHeaders);
          }

          console.log(`🔧 Updating event: ${eventId}`);

          const { data, error } = await supabaseAdmin
            .from('events')
            .update(updatePayload)
            .eq('id', eventId)
            .select('id, name, description, date, duration, ticket_price, capacity, attendees, image_url, status, created_by, updated_at')
            .single();

          if (error) {
            console.error('❌ Error updating event:', error);
            return serverError(error, corsHeaders);
          }

          console.log('✅ Event updated');
          return json({ event: data }, 200, corsHeaders);
        },
      },

      // DELETE /events/:eventId/cancel - Cancel event
      {
        pattern: /^\/events\/([a-f0-9-]+)\/cancel$/,
        method: 'DELETE',
        handler: async (_req, _userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest('Invalid event ID', corsHeaders);
          }

          console.log(`🚫 Cancelling event: ${eventId}`);

          const { error } = await supabaseAdmin
            .from('events')
            .update({ status: 'cancelled' })
            .eq('id', eventId);

          if (error) {
            console.error('❌ Error cancelling event:', error);
            return serverError(error, corsHeaders);
          }

          console.log('✅ Event cancelled');
          return json({ success: true }, 200, corsHeaders);
        },
      },

      // POST /events/:eventId/updates - Post event update
      {
        pattern: /^\/events\/([a-f0-9-]+)\/updates$/,
        method: 'POST',
        handler: async (req, userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest('Invalid event ID', corsHeaders);
          }

          const body = await req.json();
          const requiredCheck = validateRequired(body, ['title', 'message']);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { title, message } = body;

          console.log(`📢 Posting update for event: ${eventId}`);

          const { data, error } = await supabaseAdmin
            .from('event_updates')
            .insert({
              event_id: eventId,
              title,
              message,
              created_by: userId,
            })
            .select('id, event_id, title, message, created_by, created_at')
            .single();

          if (error) {
            console.error('❌ Error posting update:', error);
            return serverError(error, corsHeaders);
          }

          console.log('✅ Update posted');
          return json({ update: data }, 201, corsHeaders);
        },
      },

      // GET /events/:eventId/updates - Get event updates
      {
        pattern: /^\/events\/([a-f0-9-]+)\/updates$/,
        method: 'GET',
        handler: async (_req, _userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest('Invalid event ID', corsHeaders);
          }

          console.log(`📖 Fetching updates for event: ${eventId}`);

          const { data, error } = await supabaseAdmin
            .from('event_updates')
            .select('id, event_id, title, message, created_at, profiles:created_by(full_name, email)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error fetching updates:', error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} updates`);
          return json({ updates: data }, 200, corsHeaders);
        },
      },

      // GET /events/:eventId/participants - Get event participants
      {
        pattern: /^\/events\/([a-f0-9-]+)\/participants$/,
        method: 'GET',
        handler: async (_req, _userId, match, supabaseAdmin, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest('Invalid event ID', corsHeaders);
          }

          console.log(`👥 Fetching participants for event: ${eventId}`);

          const { data, error } = await supabaseAdmin
            .from('tickets')
            .select('id, user_id, payment_amount, purchased_at, profiles:user_id(full_name, email)')
            .eq('event_id', eventId)
            .eq('status', 'active');

          if (error) {
            console.error('❌ Error fetching participants:', error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} participants`);
          return json({ participants: data }, 200, corsHeaders);
        },
      },
    ];

    // Match route
    for (const route of routes) {
      const match = path.match(route.pattern);
      if (match && method === route.method) {
        return await route.handler(req, userId, match, supabaseAdmin, corsHeaders);
      }
    }

    // Route not found
    return notFound(`Route not found: ${method} ${path}`, corsHeaders);
  } catch (error) {
    return serverError(error, corsHeaders);
  }
});