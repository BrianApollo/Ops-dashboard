import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../../features/users/types';
import { verifyCredentials, restoreSession } from '../../features/users/data';
import { setAuthToken } from '../data/airtable-client';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<User | null>;
    logout: () => void;
    isLoading: boolean;
    isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Store JWT in memory only — never localStorage
let memoryToken: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // Restore session on mount via server-side cookie or stored token
    useEffect(() => {
        async function restore() {
            // Try memory token first (if page hasn't fully reloaded)
            if (memoryToken) {
                const restored = await restoreSession(memoryToken);
                if (restored) {
                    setUser(restored);
                    setAuthToken(memoryToken);
                    setIsInitializing(false);
                    return;
                }
            }

            // Try HttpOnly cookie session (sent automatically by browser)
            try {
                const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
                if (response.ok) {
                    const data = await response.json() as { user: User };
                    if (data.user) {
                        setUser(data.user);
                    }
                }
            } catch {
                // No valid session
            }

            setIsInitializing(false);
        }
        restore();
    }, []);

    const login = async (email: string, password: string): Promise<User | null> => {
        setIsLoading(true);
        try {
            const result = await verifyCredentials(email, password);
            if (result) {
                setUser(result.user);
                memoryToken = result.token;
                setAuthToken(result.token);
                return result.user;
            }
            return null;
        } catch (error) {
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch {
            // Best effort
        }
        setUser(null);
        memoryToken = null;
        setAuthToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, isInitializing }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
