import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AppContextProvider } from './contexts/AppProvider';

// ============================================================================
// Combined App Providers
// ============================================================================

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppContextProvider>
      {children}
      <Toaster />
    </AppContextProvider>
  );
}