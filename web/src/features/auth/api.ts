import { supabase } from '@/lib/supabase/client';

export async function signIn(credentials: { email: string; password: string }) {
  return await supabase.auth.signInWithPassword(credentials);
}

export async function signUp(credentials: { 
  email: string; 
  password: string;
  options?: {
    data?: Record<string, unknown>;
    emailRedirectTo?: string;
  }
}) {
  return await supabase.auth.signUp(credentials);
}

export async function signInWithGoogle(options: { 
  provider: 'google';
  options?: {
    redirectTo?: string;
  }
}) {
  return await supabase.auth.signInWithOAuth(options);
}

export async function signOut() {
  // We still call the standard signOut() for good measure (clears internal state/cookies)
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Supabase signOut error:", error.message);
    // Continue with clearing local storage even if this fails
  }
  
  // 👇 USE THIS DIRECT METHOD AS THE ONLY RELIABLE WAY IN YOUR ENVIRONMENT
  try {
    const storageKey = 'sb-btyneapnbsbgpopcfnzy-auth-token';
    localStorage.removeItem(storageKey);
    console.log("Forced logout: Manually cleared session key via localStorage API");
  } catch (storageError) {
    console.error("Logout Error: Failed to manually clear storage:", storageError);
  }
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}