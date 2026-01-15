/**
 * Response utilities for CORS handling
 */

/**
 * Merge CORS headers into an existing Response
 * Creates a new Response with the same body and status
 * Uses clone() to safely handle body streams
 */
export function withCors(resp: Response, corsHeaders: HeadersInit): Response {
  const clone = resp.clone();
  const merged = new Headers(clone.headers);
  
  // Normalize corsHeaders and merge (CORS headers take precedence)
  for (const [key, value] of new Headers(corsHeaders)) {
    merged.set(key, value);
  }

  return new Response(clone.body, {
    status: clone.status,
    statusText: clone.statusText,
    headers: merged,
  });
}
