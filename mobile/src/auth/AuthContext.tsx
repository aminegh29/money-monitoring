import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { configureClient } from '@/api/client';
import { api } from '@/api/endpoints';
import { AuthResponse, User } from '@/api/models';
import { loadServerUrl } from '@/config/server';

const TOKEN_KEY = 'mm_token';
const USER_KEY = 'mm_user';

export type LogoutReason = 'expired' | 'disabled' | 'reset';

interface AuthValue {
  ready: boolean;
  token: string | null;
  user: User | null;
  currency: string;
  logoutReason: LogoutReason | null;
  login: (email: string, password: string) => Promise<void>;
  /** Resolves to true when the account must first be confirmed with the emailed code. */
  register: (body: { fullName: string; email: string; password: string; currency: string; language: string }) => Promise<boolean>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  setUser: (user: User) => void;
  refreshMe: () => void;
  logout: (reason?: LogoutReason) => void;
  clearLogoutReason: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function decodeBase64Url(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') return atob(b64);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let bits = 0;
  let value = 0;
  for (const c of b64.replace(/=+$/, '')) {
    value = (value << 6) | chars.indexOf(c);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((value >> bits) & 0xff);
    }
  }
  return out;
}

function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [logoutReason, setLogoutReason] = useState<LogoutReason | null>(null);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    setToken(null);
    setUserState(null);
    configureClient(null, null);
    queryClient.clear();
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    AsyncStorage.removeItem(USER_KEY).catch(() => {});
  }, [queryClient]);

  const logout = useCallback(
    (reason?: LogoutReason) => {
      setLogoutReason(reason ?? null);
      clear();
    },
    [clear],
  );

  const refreshMe = useCallback(() => {
    api.me().then(setUser).catch(() => {});
  }, [setUser]);

  const startSession = useCallback(
    async (r: AuthResponse) => {
      const token = r.token;
      if (!token) throw new Error('No session token');
      configureClient(token, () => logout('expired'));
      await SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
      setLogoutReason(null);
      setUser(r.user);
      setToken(token);
    },
    [logout, setUser],
  );

  // Restore the saved session at startup.
  useEffect(() => {
    (async () => {
      await loadServerUrl();
      try {
        const [savedToken, savedUser] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), AsyncStorage.getItem(USER_KEY)]);
        if (savedToken && savedUser && !tokenExpired(savedToken)) {
          configureClient(savedToken, () => logout('expired'));
          setUserState(JSON.parse(savedUser));
          setToken(savedToken);
          api.me().then(setUser).catch(() => {});
        } else if (savedToken) {
          clear();
        }
      } catch {
        clear();
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      token,
      user,
      currency: user?.currency ?? 'MAD',
      logoutReason,
      login: async (email, password) => startSession(await api.login(email, password)),
      register: async (body) => {
        const r = await api.register(body);
        if (r.verificationRequired || !r.token) return true;
        await startSession(r);
        return false;
      },
      verifyEmail: async (email, code) => startSession(await api.verifyEmail(email, code)),
      setUser,
      refreshMe,
      logout,
      clearLogoutReason: () => setLogoutReason(null),
    }),
    [ready, token, user, logoutReason, startSession, setUser, refreshMe, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
