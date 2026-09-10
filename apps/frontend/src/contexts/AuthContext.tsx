import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
import { apiGetMe, apiLogin, apiLogout, apiRegister, type User } from '../services/auth.api';
import { socketService } from '../services/socket';

// ─── Types ─────────────────────────────────────────────────────────

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // On mount: check if the cookie session is valid
  useEffect(() => {
    apiGetMe()
      .then(({ user }) => {
        setUser(user);
        setStatus('authenticated');
        socketService.connect();
      })
      .catch(() => {
        setUser(null);
        setStatus('unauthenticated');
        socketService.disconnect();
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await apiLogin(email, password);
    setUser(user);
    setStatus('authenticated');
    socketService.connect();
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user } = await apiRegister(name, email, password);
    setUser(user);
    setStatus('authenticated');
    socketService.connect();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore errors — still clear local state
    }
    setUser(null);
    setStatus('unauthenticated');
    socketService.disconnect();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading',
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
