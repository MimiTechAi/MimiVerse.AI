import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";

type User = {
    id: string;
    username: string;
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [, setLocation] = useLocation();

    useEffect(() => {
        // Check if user is already logged in
        fetch("/api/auth/me")
            .then(async (res) => {
                if (res.status === 401) {
                    // Guest / not authenticated – expected in dev
                    setUser(null);
                    return;
                }

                if (!res.ok) {
                    console.warn('[AuthProvider] Auth check failed with status:', res.status);
                    setUser(null);
                    return;
                }

                const userData = await res.json();
                console.log('[AuthProvider] User authenticated:', userData);
                setUser(userData);
            })
            .catch((err) => {
                console.warn('[AuthProvider] Auth request error:', err?.message ?? err);
                setUser(null);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const login = (user: User) => {
        console.log('[AuthProvider] Login called with:', user);
        setUser(user);
        setLocation("/");
    };

    const logout = () => {
        fetch("/api/auth/logout", { method: "POST" })
            .then(() => {
                setUser(null);
                setLocation("/");
            });
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
