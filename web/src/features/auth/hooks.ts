import { useApp } from '@/app/hooks';

export function useAuth() {
  const { user, setUser, loading } = useApp();
  return { user, setUser, loading, isAuthenticated: !!user };
}

export function useSession() {
  const { user, loading } = useApp();
  return { 
    session: user ? { user } : null, 
    loading,
    isAuthenticated: !!user 
  };
}

export function useUser() {
  const { user } = useApp();
  return user;
}