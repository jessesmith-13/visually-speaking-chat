/**
 * HTTP response helpers
 */

/**
 * Generic JSON response
 */
export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * 400 Bad Request
 */
export function badRequest(message: string, headers: HeadersInit = {}): Response {
  return json({ error: message }, 400, headers);
}

/**
 * 401 Unauthorized
 */
export function unauthorized(message = 'Unauthorized', headers: HeadersInit = {}): Response {
  return json({ error: message }, 401, headers);
}

/**
 * 403 Forbidden
 */
export function forbidden(message = 'Forbidden', headers: HeadersInit = {}): Response {
  return json({ error: message }, 403, headers);
}

/**
 * 404 Not Found
 */
export function notFound(message = 'Not found', headers: HeadersInit = {}): Response {
  return json({ error: message }, 404, headers);
}

/**
 * 500 Internal Server Error
 */
export function serverError(err: Error | unknown, headers: HeadersInit = {}): Response {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('Server error:', err);
  return json({ error: message }, 500, headers);
}
