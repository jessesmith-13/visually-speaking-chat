/**
 * Authentication and authorization helpers
 */

// Import the jose library for explicit JWT verification
import * as jose from 'jose';
import type { SupabaseClient } from '@supabase/supabase-js'; 
import { unauthorized, forbidden } from './http.ts';
import { withCors } from './response.ts';
import { JWT_SECRET } from './env.ts';

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable not set.');
}

/**
 * Extract Bearer token from Authorization header
 */
export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify JWT and return user ID
 * Returns 401 response if invalid
 */
export async function requireUser(
  req: Request,
  _supabaseClient: SupabaseClient, 
  corsHeaders: HeadersInit // <-- ADDED: Accept the headers
): Promise<{ userId: string } | Response> {
  const token = getBearerToken(req);
  
  if (!token) {
    // FIX 1: Wrap the unauthorized response using your withCors helper
    return withCors(unauthorized('Missing authorization token'), corsHeaders);
  }

  if (!JWT_SECRET) {
     // FIX 2: Wrap the unauthorized response using your withCors helper
     return withCors(unauthorized('Server configuration error'), corsHeaders);
  }

  try {
    const jwkObject = JSON.parse(JWT_SECRET);
    const secretKey = await jose.importJWK(
        jwkObject,
        'ES256' // Must match the "alg" in the JSON
    );


    // Use the jose library to verify the token signature locally
    const { payload } = await jose.jwtVerify(
      token,
      secretKey
    );

    // The 'sub' claim is the user ID in Supabase JWTs
    return { userId: payload.sub as string };

  } catch (error) {
    console.error("Backend Error: JWT verification failed:", (error as Error).message);
    
    // 👇 FIX 3: Wrap the final 401 response using your withCors helper
    return withCors(unauthorized('Invalid or expired token'), corsHeaders);
  }
}

/**
 * Check if user is admin
 * Returns 403 response if not admin
 */
export async function requireAdmin(
  userId: string,
  supabaseAdmin: SupabaseClient
): Promise<true | Response> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return forbidden('Unable to verify admin status');
  }

  if (!profile?.is_admin) {
    return forbidden('Admin access required');
  }

  return true;
}