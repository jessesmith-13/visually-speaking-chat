import { callEdgeFunction } from '@/lib/edge/client';
import { UserProfile } from './types';

/**
 * Fetch all users (admin only)
 * This calls the secure admin-operations Edge Function.
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    // The callEdgeFunction helper automatically attaches the user's JWT.
    // The backend (Edge Function) handles the admin key securely.
    const result = await callEdgeFunction<{ users: UserProfile[] }>('admin-operations', '/users', {
      method: 'GET',
    });
    
    return result.users || [];

  } catch (error: unknown) {
    // Handle AbortError gracefully (standard client-side error handling)
    const err = error as { message?: string; name?: string; code?: number };
    if (err.message?.includes('AbortError') || 
        err.message?.includes('aborted') || 
        err.name === 'AbortError' ||
        err.code === 20) {
      console.log('⚠️ Fetch users aborted (component unmounted)');
      return [];
    }
    throw error;
  }
}

/**
 * Toggle admin status for a user (admin only)
 * This calls the secure admin-operations Edge Function.
 */
export async function toggleAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
  try {
    // The callEdgeFunction helper automatically attaches the user's JWT.
    // The body matches the expected input of your backend Edge Function handler.
    await callEdgeFunction('admin-operations', `/users/${userId}/admin`, {
      method: 'PUT',
      body: { isAdmin },
    });

  } catch (error: unknown) {
    // Handle AbortError gracefully
    const err = error as { message?: string; name?: string; code?: number };
    if (err.message?.includes('AbortError') || 
        err.message?.includes('aborted') || 
        err.name === 'AbortError' ||
        err.code === 20) {
      console.log('⚠️ Toggle admin aborted (component unmounted)');
      throw new Error('Request aborted');
    }
    throw error;
  }
}

/**
 * Send email via edge function (admin only)
 */
export async function sendEmail(to: string | string[], subject: string, message: string): Promise<{ emailsSent: number }> {
  const result = await callEdgeFunction<{ emailsSent: number }>('send-email', '', {
    method: 'POST',
    body: { to, subject, message },
  });
  return result;
}