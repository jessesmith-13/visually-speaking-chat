/**
 * Events Edge Function
 *
 * Handles event queries and management
 *
 * Endpoints:
 *   GET / - List all events (public, no auth required)
 *   GET /:id - Get single event (public, no auth required)
 *
 * Security: Public read access for browsing events
 */

import { handleCors } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { json, notFound, serverError } from "../_shared/http.ts";
import { validateUuid } from "../_shared/validate.ts";
import { withCors } from "../_shared/response.ts";

// Route handlers
interface RouteHandler {
  pattern: RegExp;
  method: string;
  handler: (
    req: Request,
    match: RegExpMatchArray,
    corsHeaders: HeadersInit,
  ) => Promise<Response>;
}

Deno.serve(async (req) => {
  // Handle CORS
  const { earlyResponse, headers: corsHeaders } = handleCors(req);
  if (earlyResponse) return earlyResponse;

  try {
    const supabaseAdmin = createAdminClient();

    // Parse path - check custom header first (for SDK calls), then URL
    const url = new URL(req.url);
    const customPath = req.headers.get("x-path");
    const path = customPath || url.pathname.replace(/^\/events/, "");
    const method = req.method;

    console.log(`${method} ${path} - Public access (no auth required)`);

    // Define routes
    const routes: RouteHandler[] = [
      {
        pattern: /^\/$/,
        method: "GET",
        handler: async (_req, _, corsHeaders) => {
          console.log("📋 Fetching all events (public)");

          const { data, error } = await supabaseAdmin
            .from("events")
            .select("*")
            .order("date", { ascending: true });

          if (error) {
            console.error("❌ Error fetching events:", error);
            return serverError(error, corsHeaders);
          }

          console.log(`✅ Fetched ${data.length} events`);
          return json({ events: data }, 200, corsHeaders);
        },
      },
      {
        pattern: /^\/([a-f0-9-]+)$/,
        method: "GET",
        handler: async (_req, match, corsHeaders) => {
          const eventId = match[1];
          const uuidCheck = validateUuid(eventId);
          if (!uuidCheck.valid) {
            return notFound("Invalid event ID", corsHeaders);
          }

          console.log(`📋 Fetching event: ${eventId} (public)`);

          const { data, error } = await supabaseAdmin
            .from("events")
            .select("*")
            .eq("id", eventId)
            .single();

          if (error || !data) {
            return notFound("Event not found", corsHeaders);
          }

          console.log(`✅ Fetched event: ${data.name}`);
          return json({ event: data }, 200, corsHeaders);
        },
      },
    ];

    // Match route
    for (const route of routes) {
      const match = path.match(route.pattern);
      if (match && method === route.method) {
        return await route.handler(req, match, corsHeaders);
      }
    }

    // Route not found
    return notFound(`Route not found: ${method} ${path}`, corsHeaders);
  } catch (error) {
    return serverError(error, corsHeaders);
  }
});
