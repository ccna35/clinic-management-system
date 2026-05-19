import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";
import { AuthContext } from "./auth-context";
import type { AuthContextValue, User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function bootstrapAuth(): Promise<void> {
      const storedToken = getToken();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<{ success: boolean; data: User }>(
          "/api/auth/me",
        );
        setUser(response.data.data);
        setTokenState(storedToken);
      } catch {
        clearToken();
        setUser(null);
        setTokenState(null);
      } finally {
        setIsLoading(false);
      }
    }

    void bootstrapAuth();
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const response = await api.post<{
      success: boolean;
      data: { token: string };
    }>("/api/auth/login", {
      email,
      password,
    });

    const nextToken = response.data.data.token;
    setToken(nextToken);
    setTokenState(nextToken);

    const meResponse = await api.get<{ success: boolean; data: User }>(
      "/api/auth/me",
    );
    setUser(meResponse.data.data);
  }

  function logout(): void {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      logout,
    }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
