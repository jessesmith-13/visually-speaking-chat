import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/card";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/app/hooks";
import { supabase } from "@/lib/supabase/client";
import { signIn, signUp, signInWithGoogle } from "@/features/auth";
import { toast } from "sonner";

export function AuthRoute() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [waitingForAuth, setWaitingForAuth] = useState(false);

  // Auto-navigate when user is authenticated
  useEffect(() => {
    if (user && waitingForAuth) {
      console.log(
        "✅ [AUTH ROUTE] User set in context, navigating to events...",
      );
      navigate("/events");
      setWaitingForAuth(false);
    }
  }, [user, waitingForAuth, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedEmail = resetEmail.trim();

      if (!trimmedEmail) {
        toast.error("Please enter your email address");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (error) throw error;

      toast.success("Password reset email sent! Check your inbox.");
      setShowResetPassword(false);
      setResetEmail("");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send reset email";
      console.error("Reset password error:", error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Trim whitespace from inputs
      const trimmedEmail = loginEmail.trim();
      const trimmedPassword = loginPassword.trim();

      // Validate inputs
      if (!trimmedEmail || !trimmedPassword) {
        toast.error("Please enter both email and password");
        setLoading(false);
        return;
      }

      console.log("🔵 [LOGIN] Starting sign-in...");
      console.log("🔵 [LOGIN] Email:", trimmedEmail);
      console.log("🔵 [LOGIN] Password length:", trimmedPassword.length);

      console.log("🔵 [LOGIN] Calling signInWithPassword...");
      const { data, error } = await signIn({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      console.log(" [LOGIN] Auth response received:", {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message,
      });

      if (error) {
        console.error("❌ [LOGIN] Error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });

        // Provide more specific error messages
        if (error.message?.includes("Invalid login credentials")) {
          toast.error("Incorrect email or password", {
            description:
              "Double-check your credentials. If you just signed up, verify your email first.",
            duration: 6000,
          });
        } else if (error.message?.includes("Email not confirmed")) {
          toast.error("Please verify your email address first.", {
            description: "Check your inbox for a verification link.",
          });
        } else if (error.message?.includes("User not found")) {
          toast.error("No account found with this email.", {
            description: "Please sign up to create a new account.",
          });
        } else {
          toast.error(error.message || "Failed to log in");
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log("✅ [LOGIN] Sign-in successful, user ID:", data.user.id);
        toast.success("Logged in successfully!");

        // Navigate immediately and reload to trigger AppProvider initialization
        console.log("🔄 [LOGIN] Navigating to events...");
        window.location.href = "/events"; // Force full page reload
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ [LOGIN] Exception caught:", error);
      if (errorMessage.includes("fetch")) {
        toast.error(
          "Network error - please check your internet connection and try again.",
        );
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Trim whitespace from inputs
      const trimmedEmail = signupEmail.trim();
      const trimmedPassword = signupPassword.trim();
      const trimmedFullName = fullName.trim();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail) {
        toast.error("Please enter your email address");
        setLoading(false);
        return;
      }

      if (!emailRegex.test(trimmedEmail)) {
        toast.error("Please enter a valid email address");
        setLoading(false);
        return;
      }

      // Validate full name
      if (!trimmedFullName) {
        toast.error("Please enter your full name");
        setLoading(false);
        return;
      }

      // Validate password length
      if (!trimmedPassword) {
        toast.error("Please enter a password");
        setLoading(false);
        return;
      }

      if (trimmedPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      const { data, error } = await signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: {
            full_name: trimmedFullName,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error("Signup error:", error);
        throw error;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          toast.error(
            "This email is already registered. Please log in instead.",
          );
          setLoading(false);
          return;
        }

        // Check if session exists (email confirmation disabled)
        if (data.session) {
          toast.success("Account created successfully!");
          setUser({
            id: data.user.id,
            name: trimmedFullName,
            email: trimmedEmail,
            purchasedTickets: [],
            isAdmin: false,
          });
          navigate("/events");
        } else {
          // Email confirmation required
          toast.success(
            "Account created! Please check your email to verify your account.",
            {
              duration: 5000,
            },
          );
          // Clear form
          setSignupEmail("");
          setSignupPassword("");
          setFullName("");
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Signup error:", error);
      if (errorMessage.includes("fetch")) {
        toast.error("Network error - please check your Supabase connection");
      } else if (errorMessage.includes("User already registered")) {
        toast.error("This email is already registered. Please log in instead.");
      } else if (errorMessage.includes("Invalid email")) {
        toast.error("Please enter a valid email address");
      } else if (errorMessage.includes("Password")) {
        toast.error("Password must be at least 6 characters");
      } else {
        toast.error(errorMessage || "Failed to sign up");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Use current origin for redirect (will be localhost in dev, production URL in prod)
      const redirectUrl = `${window.location.origin}/events`;
      console.log("🔵 [GOOGLE LOGIN] Redirect URL:", redirectUrl);
      console.log("🔵 [GOOGLE LOGIN] Current origin:", window.location.origin);

      const { error } = await signInWithGoogle({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error("Google login error:", error);
        throw error;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Google login error:", error);
      if (errorMessage.includes("fetch")) {
        toast.error("Network error - please check your Supabase connection");
      } else {
        toast.error(errorMessage || "Failed to sign in with Google");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Welcome to Visually Speaking</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {showResetPassword ? (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Email"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowResetPassword(false)}
                      disabled={loading}
                    >
                      Back to Login
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(true)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading || waitingForAuth}
                    >
                      {loading || waitingForAuth ? "Signing in..." : "Sign In"}
                    </Button>

                    {/* Troubleshooting hint */}
                    <div className="text-xs text-center text-gray-500 mt-2">
                      <p>Having trouble logging in?</p>
                      <ul className="mt-1 space-y-1 text-left list-disc list-inside">
                        <li>Make sure you've created an account first</li>
                        <li>Check if you need to verify your email</li>
                        <li>
                          Try resetting your password using "Forgot password?"
                        </li>
                      </ul>
                    </div>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Sign in with Google
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Full Name</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500">
                      Must be at least 6 characters
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign up with Google
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
