"use client";

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, Role } from '@repairshop/shared';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  sessionUser: SupabaseUser | null;
  profile: User | null;
  role: Role | null;
  isActive: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

const signOut = async () => {
  await supabase.auth.signOut();
};

const AuthContext = createContext<AuthContextType>({
  sessionUser: null,
  profile: null,
  role: null,
  isActive: false,
  isLoading: true,
  signOut: signOut,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionUser, setSessionUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          if (mounted) setSessionUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          if (mounted) {
            setSessionUser(null);
            setProfile(null);
            if (pathname !== '/login') {
              router.push('/login');
            }
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    async function fetchProfile(userId: string) {
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (mounted) {
          if (data) {
            setProfile(data);
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          if (mounted) setSessionUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          if (mounted) {
            setSessionUser(null);
            setProfile(null);
            if (pathname !== '/login') {
              router.push('/login');
            }
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);



  // Idle Timeout Logic
  useEffect(() => {
    if (!sessionUser) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('Session idle timeout reached. Logging out.');
        if (typeof signOut === 'function') signOut();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [sessionUser]);

  const contextValue = useMemo(() => ({
    sessionUser,
    profile,
    role: profile?.role || null,
    isActive: profile?.is_active || false,
    isLoading,
    signOut
  }), [sessionUser, profile, isLoading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
