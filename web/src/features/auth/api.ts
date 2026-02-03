import { supabase } from "@/lib/supabase/client";

export async function signIn(credentials: { email: string; password: string }) {
  return await supabase.auth.signInWithPassword(credentials);
}

export async function signUp(credentials: {
  email: string;
  password: string;
  options?: {
    data?: Record<string, unknown>;
    emailRedirectTo?: string;
  };
}) {
  return await supabase.auth.signUp(credentials);
}

export async function signInWithGoogle(options: {
  provider: "google";
  options?: {
    redirectTo?: string;
  };
}) {
  return await supabase.auth.signInWithOAuth(options);
}

export async function signOut() {
  // Call Supabase sign out (this is the authoritative logout)
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Supabase signOut error:", error.message);
  }

  // Optional safety cleanup: remove any Supabase auth tokens (all envs)
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
      .forEach((key) => localStorage.removeItem(key));

    console.log("Forced logout: Cleared all Supabase auth tokens");
  } catch (storageError) {
    console.error(
      "Logout Error: Failed to clear Supabase auth tokens:",
      storageError,
    );
  }
}

export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}
