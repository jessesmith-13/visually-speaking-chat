/**
 * Matchmaking Edge Function
 *
 * Handles matchmaking queue and user pairing for events
 * Uses atomic RPC operations to prevent race conditions
 * Creates Daily.co video rooms for matched users
 *
 * Endpoints:
 *   POST /join - Join matchmaking queue (requires ticket)
 *   POST /leave - Leave matchmaking queue
 *   GET /status - Get matchmaking status
 *   POST /next-match - Request next match
 *   POST /match-users - Trigger matching (admin-only)
 *
 * Security: Requires user authentication
 */

import { handleCors } from "../_shared/cors.ts";
import { createAuthClient, createAdminClient } from "../_shared/supabase.ts";
import { requireUser, requireAdmin } from "../_shared/auth.ts";
import { json, badRequest, notFound, serverError } from "../_shared/http.ts";
import { validateRequired, validateUuid } from "../_shared/validate.ts";
import { withCors } from "../_shared/response.ts";

// Route handler type
type RouteHandler = (
  req: Request,
  userId: string,
  match: RegExpMatchArray,
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  corsHeaders: HeadersInit,
) => Promise<Response>;

// Route definition
interface Route {
  pattern: RegExp;
  method: string;
  handler: RouteHandler;
}

/**
 * Create a Daily.co room for matched users
 */
async function createDailyRoom(roomId: string): Promise<string | null> {
  const dailyApiKey = Deno.env.get("DAILY_API_KEY");

  if (!dailyApiKey) {
    console.error("❌ DAILY_API_KEY not set");
    return null;
  }

  try {
    console.log("🎥 Creating Daily.co room:", roomId);

    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomId, // Use our generated room_id as the Daily room name
        privacy: "public",
        properties: {
          max_participants: 2,
          enable_chat: false, // ASL users communicate via video
          enable_screenshare: false,
          enable_recording: "local", // Optional: for moderation
          exp: Math.floor(Date.now() / 1000) + 7200, // Room expires in 2 hours
          start_video_off: false,
          start_audio_off: true, // Start muted (deaf/HoH users)
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Daily.co API error:", response.status, errorText);
      return null;
    }

    const dailyRoom = await response.json();
    console.log("✅ Daily.co room created:", dailyRoom.url);

    return dailyRoom.url;
  } catch (error) {
    console.error("❌ Error creating Daily.co room:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  const { earlyResponse, headers: corsHeaders } = handleCors(req);
  if (earlyResponse) return earlyResponse;

  try {
    // Authenticate user
    const authClient = createAuthClient();
    const userResult = await requireUser(req, authClient, corsHeaders);
    if (userResult instanceof Response)
      return withCors(userResult, corsHeaders);

    const userId = userResult.userId;
    const supabaseAdmin = createAdminClient();

    // Parse path - check custom header first (for Supabase SDK calls), then URL
    const url = new URL(req.url);
    const customPath = req.headers.get("x-path");
    const path = customPath || url.pathname.replace(/^\/matchmaking/, "");
    const method = req.method;

    console.log(`${method} ${path} - User: ${userId}`);

    // Define routes
    const routes: Route[] = [
      // POST /join - Join matchmaking queue
      {
        pattern: /^\/join$/,
        method: "POST",
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          const body = await req.json();
          const requiredCheck = validateRequired(body, ["eventId"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { eventId } = body;
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          console.log(`🎯 User joining queue: event=${eventId}`);

          // Verify user has a ticket
          const { data: ticket, error: ticketError } = await supabaseAdmin
            .from("tickets")
            .select("id")
            .eq("user_id", userId)
            .eq("event_id", eventId)
            .eq("status", "active")
            .maybeSingle();

          if (ticketError) {
            console.error("❌ Error checking ticket:", ticketError);
            return serverError(ticketError, corsHeaders);
          }

          if (!ticket) {
            return badRequest(
              "You need a ticket to join this event",
              corsHeaders,
            );
          }

          // Use RPC to join queue (atomic upsert)
          const { data: joinResult, error: joinError } =
            await supabaseAdmin.rpc("join_queue", {
              p_event_id: eventId,
              p_user_id: userId,
            });

          if (joinError) {
            console.error("❌ RPC join_queue error:", joinError);
            return serverError(joinError, corsHeaders);
          }

          const result = joinResult[0];
          if (!result.success) {
            return badRequest(result.error_message, corsHeaders);
          }

          console.log("✅ User added to queue");

          // Try to match immediately using atomic RPC
          const { data: matchData, error: matchError } =
            await supabaseAdmin.rpc("match_two_users", {
              p_event_id: eventId,
            });

          if (matchError) {
            console.error("❌ RPC match_two_users error:", matchError);
            // Don't fail - user is still in queue
            return json(
              {
                success: true,
                status: "waiting",
                matched: false,
              },
              200,
              corsHeaders,
            );
          }

          const matchResult = matchData[0];
          if (matchResult.success) {
            console.log("✅ Match found:", matchResult.room_id);

            // Create Daily.co room
            const dailyUrl = await createDailyRoom(matchResult.room_id);

            if (dailyUrl) {
              // Update video_rooms table with Daily.co URL
              const { error: updateError } = await supabaseAdmin
                .from("video_rooms")
                .update({ daily_url: dailyUrl })
                .eq("id", matchResult.room_id);

              if (updateError) {
                console.error("❌ Error updating video_rooms:", updateError);
              } else {
                console.log("✅ Daily.co URL saved to video_rooms");
              }
            }

            return json(
              {
                success: true,
                status: "matched",
                matched: true,
                roomId: matchResult.room_id,
                dailyUrl: dailyUrl || undefined,
              },
              200,
              corsHeaders,
            );
          } else {
            console.log("⏳ No match yet, waiting in queue");
            return json(
              {
                success: true,
                status: "waiting",
                matched: false,
              },
              200,
              corsHeaders,
            );
          }
        },
      },

      // POST /leave - Leave matchmaking queue
      {
        pattern: /^\/leave$/,
        method: "POST",
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          const body = await req.json();
          const requiredCheck = validateRequired(body, ["eventId"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { eventId } = body;
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          console.log(`👋 User leaving queue: event=${eventId}`);

          // Use RPC to leave queue
          const { data, error } = await supabaseAdmin.rpc("leave_queue", {
            p_event_id: eventId,
            p_user_id: userId,
          });

          if (error) {
            console.error("❌ RPC leave_queue error:", error);
            return serverError(error, corsHeaders);
          }

          const result = data[0];
          if (!result.success) {
            return badRequest(result.error_message, corsHeaders);
          }

          console.log("✅ User removed from queue");
          return json({ success: true }, 200, corsHeaders);
        },
      },

      // GET /status - Get matchmaking status
      {
        pattern: /^\/status$/,
        method: "GET",
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          const url = new URL(req.url);
          const eventId = url.searchParams.get("eventId");

          if (!eventId) {
            return badRequest("eventId parameter required", corsHeaders);
          }

          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          console.log(`📊 Checking status: event=${eventId}`);

          const { data, error } = await supabaseAdmin
            .from("matchmaking_queue")
            .select("is_matched, current_room_id")
            .eq("user_id", userId)
            .eq("event_id", eventId)
            .maybeSingle();

          if (error) {
            console.error("❌ Error checking status:", error);
            return serverError(error, corsHeaders);
          }

          if (!data) {
            return json({ status: "not_in_queue" }, 200, corsHeaders);
          }

          return json(
            {
              status: data.is_matched ? "matched" : "waiting",
              roomId: data.current_room_id || undefined,
            },
            200,
            corsHeaders,
          );
        },
      },

      // POST /next-match - Request next match
      {
        pattern: /^\/next-match$/,
        method: "POST",
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          const body = await req.json();
          const requiredCheck = validateRequired(body, ["eventId"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { eventId } = body;
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          console.log(`🔄 User requesting next match: event=${eventId}`);

          // Use RPC to reset match status
          const { data: resetData, error: resetError } =
            await supabaseAdmin.rpc("reset_match_status", {
              p_event_id: eventId,
              p_user_id: userId,
            });

          if (resetError) {
            console.error("❌ RPC reset_match_status error:", resetError);
            return serverError(resetError, corsHeaders);
          }

          const resetResult = resetData[0];
          if (!resetResult.success) {
            return badRequest(resetResult.error_message, corsHeaders);
          }

          // Try to match immediately
          const { data: matchData, error: matchError } =
            await supabaseAdmin.rpc("match_two_users", {
              p_event_id: eventId,
            });

          if (matchError) {
            console.error("❌ RPC match_two_users error:", matchError);
            return json(
              {
                success: true,
                matched: false,
              },
              200,
              corsHeaders,
            );
          }

          const matchResult = matchData[0];
          if (matchResult.success) {
            console.log("✅ Match found:", matchResult.room_id);

            // Create Daily.co room
            const dailyUrl = await createDailyRoom(matchResult.room_id);

            if (dailyUrl) {
              // Update video_rooms table with Daily.co URL
              const { error: updateError } = await supabaseAdmin
                .from("video_rooms")
                .update({ daily_url: dailyUrl })
                .eq("id", matchResult.room_id);

              if (updateError) {
                console.error("❌ Error updating video_rooms:", updateError);
              }
            }

            return json(
              {
                success: true,
                matched: true,
                roomId: matchResult.room_id,
                dailyUrl: dailyUrl || undefined,
              },
              200,
              corsHeaders,
            );
          } else {
            console.log("⏳ No match yet");
            return json(
              {
                success: true,
                matched: false,
              },
              200,
              corsHeaders,
            );
          }
        },
      },

      // POST /match-users - Manually trigger matching (admin-only)
      {
        pattern: /^\/match-users$/,
        method: "POST",
        handler: async (req, userId, _match, supabaseAdmin, corsHeaders) => {
          // Verify admin status
          const adminResult = await requireAdmin(userId, supabaseAdmin);
          if (adminResult instanceof Response)
            return withCors(adminResult, corsHeaders);

          const body = await req.json();
          const requiredCheck = validateRequired(body, ["eventId"]);
          if (!requiredCheck.valid) {
            return badRequest(requiredCheck.error!, corsHeaders);
          }

          const { eventId } = body;
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return badRequest("Invalid event ID", corsHeaders);
          }

          console.log(`🎲 Manually triggering matching: event=${eventId}`);

          // Use RPC to match two users
          const { data, error } = await supabaseAdmin.rpc("match_two_users", {
            p_event_id: eventId,
          });

          if (error) {
            console.error("❌ RPC match_two_users error:", error);
            return serverError(error, corsHeaders);
          }

          const result = data[0];
          if (result.success) {
            console.log("✅ Match created:", result.room_id);

            // Create Daily.co room
            const dailyUrl = await createDailyRoom(result.room_id);

            if (dailyUrl) {
              // Update video_rooms table with Daily.co URL
              const { error: updateError } = await supabaseAdmin
                .from("video_rooms")
                .update({ daily_url: dailyUrl }) // ✅ CORRECT COLUMN!
                .eq("id", result.room_id);

              if (updateError) {
                console.error("❌ Error updating video_rooms:", updateError);
              }
            }

            return json(
              {
                matched: true,
                roomId: result.room_id,
                dailyUrl: dailyUrl || undefined,
                users: [result.user1_id, result.user2_id],
              },
              200,
              corsHeaders,
            );
          } else {
            console.log("❌ Not enough users");
            return json(
              {
                matched: false,
                error: result.error_message,
              },
              200,
              corsHeaders,
            );
          }
        },
      },
    ];

    // Match route
    for (const route of routes) {
      const match = path.match(route.pattern);
      if (match && method === route.method) {
        return await route.handler(
          req,
          userId,
          match,
          supabaseAdmin,
          corsHeaders,
        );
      }
    }

    // Route not found
    return notFound(`Route not found: ${method} ${path}`, corsHeaders);
  } catch (error) {
    return serverError(error, corsHeaders);
  }
});
