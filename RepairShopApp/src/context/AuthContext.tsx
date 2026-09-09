import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole, UserRow, fetchUserRow } from '../lib/auth';
import { parseAuthUrl } from '../utils/authLink';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isActive: boolean;
  isLoading: boolean;
  displayName: string;
  avatarUrl: string | null;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (val: boolean) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  session: null,
  role: null,
  isActive: false,
  isLoading: true,
  displayName: '',
  avatarUrl: null,
  isPasswordRecovery: false,
  setIsPasswordRecovery: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [displayName, setDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (mounted) {
          if (error) {
            console.error('Error fetching session:', error.message);
          }
          await handleSessionUpdate(session);
        }
      } catch (err) {
        console.error('Exception in getInitialSession:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
          }
          await handleSessionUpdate(session);
        }
      }
    );

    // Deep link handling for password recovery (e.g. repairshop://reset-password#access_token=...)
    const handleDeepLink = async (url: string | null) => {
      if (!url || !mounted) return;
      try {
        const parsed = parseAuthUrl(url);
        if (parsed.accessToken && parsed.refreshToken) {
          await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          });
          if (parsed.type === 'recovery' || url.includes('reset-password')) {
            setIsPasswordRecovery(true);
          }
        } else if (parsed.code) {
          await supabase.auth.exchangeCodeForSession(parsed.code);
          if (url.includes('reset-password')) {
            setIsPasswordRecovery(true);
          }
        } else if (url.includes('reset-password')) {
          setIsPasswordRecovery(true);
        }
      } catch (err) {
        console.error('Error handling deep link auth in AuthContext:', err);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  // Helper to extract avatarUrl
  const resolveAvatarUrl = (userRow: UserRow | null): string | null => {
    if (!userRow) return null;
    if (userRow.avatar_url) return userRow.avatar_url;
    if (userRow.avatar_drive_file_id) return `https://drive.google.com/uc?id=${userRow.avatar_drive_file_id}`;
    return null;
  };

  // Re-sync profile when app returns to foreground (e.g. after admin activates/updates user)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — re-fetch profile to pick up any role/is_active changes
        if (session?.user) {
          const userRow = await fetchUserRow(session.user.id);
          if (userRow) {
            setRole(userRow.role);
            setIsActive(userRow.is_active);
            setDisplayName(userRow.name || session.user.email?.split('@')[0] || '');
            setAvatarUrl(resolveAvatarUrl(userRow));
          }
        }
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [session]);

  const handleSessionUpdate = async (newSession: Session | null) => {
    // Keep isLoading true while we resolve the user row so the navigator
    // never flashes InactiveUserScreen between session-set and row-fetch.
    setIsLoading(true);
    try {
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        const userRow = await fetchUserRow(newSession.user.id);
        if (userRow) {
          setRole(userRow.role);
          setIsActive(userRow.is_active);
          setDisplayName(userRow.name || newSession.user.email?.split('@')[0] || '');
          setAvatarUrl(resolveAvatarUrl(userRow));
        } else {
          setRole(null);
          setIsActive(false);
          setDisplayName(newSession.user.email?.split('@')[0] || '');
          setAvatarUrl(null);
        }
      } else {
        setRole(null);
        setIsActive(false);
        setDisplayName('');
        setAvatarUrl(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Manual re-sync of profile — call after any mutation that may have changed the current user's row
  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const userRow = await fetchUserRow(session.user.id);
      if (userRow) {
        setRole(userRow.role);
        setIsActive(userRow.is_active);
        setDisplayName(userRow.name || session.user.email?.split('@')[0] || '');
        setAvatarUrl(resolveAvatarUrl(userRow));
      }
    }
  }, [session]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out from Supabase:', err);
    } finally {
      setSession(null);
      setUser(null);
      setRole(null);
      setIsActive(false);
      setDisplayName('');
      setAvatarUrl(null);
    }
  };

  const contextValue = useMemo(() => ({
    user, session, role, isActive, isLoading, displayName, avatarUrl, isPasswordRecovery, setIsPasswordRecovery, signOut, refreshProfile
  }), [user, session, role, isActive, isLoading, displayName, avatarUrl, isPasswordRecovery, refreshProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
