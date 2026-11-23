import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, type User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
  signOut: () => void;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (getToken()) api.me().then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
    const out = () => setUser(null);
    window.addEventListener("auth:logout", out);
    return () => window.removeEventListener("auth:logout", out);
  }, []);

  const finish = useCallback(async (token: string) => {
    setToken(token);
    setUser(await api.me());
  }, []);

  const value: AuthState = {
    user, loading,
    signIn: async (e, p) => finish((await api.login(e, p)).access_token),
    signUp: async (e, n, p) => finish((await api.register(e, n, p)).access_token),
    signOut: () => { setToken(null); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
