/**
 * CORS handling with origin allowlist
 */

import { ALLOWED_ORIGINS } from './env.ts';

interface CorsResult {
  earlyResponse?: Response;
  headers: HeadersInit;
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }

  // Dev default: localhost + known Figma Make origins
  if (!ALLOWED_ORIGINS) {
    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === 'www.figma.com' ||
      hostname.endsWith('.figma.com') ||
      hostname === 'makeproxy-c.figma.site' ||
      hostname.endsWith('.makeproxy-c.figma.site') ||
      hostname.endsWith('.figma.site')
    );
  }

  // Allow wildcard mode
  if (ALLOWED_ORIGINS.trim() === '*') return true;

  // Exact allowlist match against origin string
  const allowedList = ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  return allowedList.includes(origin);
}

export function handleCors(req: Request): CorsResult {
  const origin = req.headers.get('Origin');

  // No Origin header (server-to-server) - allow it
  if (!origin) {
    return {
      headers: {
        'Vary': 'Origin',
      },
    };
  }

  const allowed = isOriginAllowed(origin);

  // Origin not allowed
  if (!allowed) {
    console.warn('CORS blocked origin:', origin);
    if (req.method === 'OPTIONS') {
      // For OPTIONS, return 204 without CORS headers
      return {
        earlyResponse: new Response(null, {
          status: 204,
          headers: {
            'Vary': 'Origin',
          },
        }),
        headers: {
          'Vary': 'Origin',
        },
      };
    } else {
      // For non-OPTIONS, return 403
      return {
        earlyResponse: new Response(
          JSON.stringify({ error: 'Origin not allowed' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Vary': 'Origin',
            },
          }
        ),
        headers: {
          'Vary': 'Origin',
        },
      };
    }
  }

  // Origin is allowed
  const corsHeaders: HeadersInit = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-path',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'Origin',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return {
      earlyResponse: new Response(null, {
        status: 204,
        headers: corsHeaders,
      }),
      headers: corsHeaders,
    };
  }

  return { headers: corsHeaders };
}