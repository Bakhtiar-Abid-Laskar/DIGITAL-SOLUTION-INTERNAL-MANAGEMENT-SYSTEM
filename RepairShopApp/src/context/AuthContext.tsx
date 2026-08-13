import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole, UserRow, fetchUserRow } from '../lib/auth';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isActive: boolean;
  isLoading: boolean;
  displayName: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  session: null,
  role: null,
  isActive: false,
  isLoading: true,
  displayName: '',
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [displayName, setDisplayName] = useState<string>('');

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (mounted) {
          await handleSessionUpdate(session);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
        } else {
          setRole(null);
          setIsActive(false);
          setDisplayName(newSession.user.email?.split('@')[0] || '');
        }
      } else {
        setRole(null);
        setIsActive(false);
        setDisplayName('');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
    }
  };

  const contextValue = useMemo(() => ({
    user, session, role, isActive, isLoading, displayName, signOut
  }), [user, session, role, isActive, isLoading, displayName]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
