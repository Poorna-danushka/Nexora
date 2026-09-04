// ─── Auth Context ─────────────────────────────────────────────────────────────
// Provides a reactive auth state that the root layout and all screens can use.
// Calling signOut() clears the token AND triggers a full navigation reset to /auth.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { clearAccessToken, getAccessToken, saveAccessToken } from '@/services/authStorage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  status: AuthStatus;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  status: 'loading',
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Bootstrap: read persisted token once on mount
  useEffect(() => {
    getAccessToken()
      .then((token) => setStatus(token ? 'authenticated' : 'unauthenticated'))
      .catch(() => setStatus('unauthenticated'));
  }, []);

  const signIn = useCallback(async (token: string) => {
    await saveAccessToken(token);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    await clearAccessToken();
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
