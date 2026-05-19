import { createContext } from "react";

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface AuthContextValue {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
    undefined,
);
