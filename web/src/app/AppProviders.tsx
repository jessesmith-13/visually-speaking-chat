import { ReactNode } from "react";
import { Toaster } from "@/ui/sonner";
import { ThemeProvider } from "next-themes";
import { AppContextProvider } from "./contexts/AppProvider";

// ============================================================================
// Combined App Providers
// ============================================================================

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AppContextProvider>
        {children}
        <Toaster />
      </AppContextProvider>
    </ThemeProvider>
  );
}
