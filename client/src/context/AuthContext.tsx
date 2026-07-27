import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { ApiError } from "../api/client";
import type { User } from "../types/auth";

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    signup: (email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    //upon first load, check if there's a valid session cookie
    //(e.g. user refreshes page) rather than assuming logged-out
    useEffect(() => {
        authApi
            .getMe()
            .then((res) => setUser(res.user))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    async function signup(email: string, password: string) {
        const res = await authApi.signup(email, password);
        setUser(res.user);
    }

    async function login(email: string, password: string) {
        const res = await authApi.login(email, password);
        setUser(res.user);
    }

    async function logout() {
        await authApi.logout();
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, signup, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}

export { ApiError };