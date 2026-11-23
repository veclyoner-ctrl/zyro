import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, setStoredUser } from '../services/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextValue {
  user: Profile | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  register: (data: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<Profile>;
  updateProfile: (data: { full_name: string; phone: string }) => Promise<Profile>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = 'zyro_mall_user';

async function loadOrSyncSupabaseProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
}): Promise<Profile> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) {
    return existing as Profile;
  }

  const fallback: Profile = {
    id: authUser.id,
    email: authUser.email || '',
    full_name: String(authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Shopper'),
    phone: String(authUser.user_metadata?.phone || ''),
    role: authUser.user_metadata?.role === 'admin' ? 'admin' : 'customer',
    is_blocked: false,
    avatar_url: null,
    created_at: authUser.created_at || new Date().toISOString(),
  };

  await supabase.from('profiles').upsert(fallback, { onConflict: 'id' });
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Profile) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession();
          const sessionUser = data.session?.user;
          if (!sessionUser) {
            if (active) {
              setUser(null);
              setStoredUser(null);
            }
            return;
          }
          const profile = await loadOrSyncSupabaseProfile(sessionUser);
          if (profile.is_blocked) {
            await supabase.auth.signOut();
            if (active) {
              setUser(null);
              setStoredUser(null);
            }
            return;
          }
          if (active) {
            setUser(profile);
            setStoredUser(profile);
          }
        } catch {
          if (active) {
            setUser(null);
            setStoredUser(null);
          }
        } finally {
          if (active) setIsLoading(false);
        }
        return;
      }

      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiRequest<{ user: Profile }>('/api/auth/me');
        if (active) {
          setUser(res.user);
          setStoredUser(res.user);
        }
      } catch {
        if (active) {
          setUser(null);
          setStoredUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    verifySession();

    if (isSupabaseConfigured) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          if (active) {
            setUser(null);
            setStoredUser(null);
          }
          return;
        }
        void loadOrSyncSupabaseProfile(session.user).then((profile) => {
          if (active && !profile.is_blocked) {
            setUser(profile);
            setStoredUser(profile);
          }
        });
      });
      return () => {
        active = false;
        sub.subscription.unsubscribe();
      };
    }

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid email or password.');
      }
      const profile = await loadOrSyncSupabaseProfile(data.user);
      if (profile.is_blocked) {
        await supabase.auth.signOut();
        throw new Error('Your account has been suspended. Please contact support.');
      }
      setUser(profile);
      setStoredUser(profile);
      return profile;
    }

    const res = await apiRequest<{ user: Profile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
    setStoredUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: { full_name: string; email: string; phone: string; password: string }) => {
      if (isSupabaseConfigured) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          options: {
            data: {
              full_name: data.full_name.trim(),
              phone: data.phone.trim(),
              role: 'customer',
            },
          },
        });
        if (error || !signUpData.user) {
          throw new Error(error?.message || 'Unable to register.');
        }
        if (!signUpData.session) {
          throw new Error(
            'Account created! Please verify your email address, then sign in.'
          );
        }
        const profile = await loadOrSyncSupabaseProfile(signUpData.user);
        setUser(profile);
        setStoredUser(profile);
        return profile;
      }

      const res = await apiRequest<{ user: Profile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setUser(res.user);
      setStoredUser(res.user);
      return res.user;
    },
    []
  );

  const updateProfile = useCallback(
    async (data: { full_name: string; phone: string }) => {
      if (isSupabaseConfigured) {
        if (!user) throw new Error('Authentication required');
        const { data: updated, error } = await supabase
          .from('profiles')
          .update({
            full_name: data.full_name.trim(),
            phone: data.phone.trim(),
          })
          .eq('id', user.id)
          .select('*')
          .single();
        if (error || !updated) {
          throw new Error(error?.message || 'Unable to update profile');
        }
        const profile = updated as Profile;
        setUser(profile);
        setStoredUser(profile);
        return profile;
      }

      const res = await apiRequest<{ user: Profile }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setUser(res.user);
      setStoredUser(res.user);
      return res.user;
    },
    [user]
  );

  const signOut = useCallback(() => {
    if (isSupabaseConfigured) {
      void supabase.auth.signOut();
    }
    setUser(null);
    setStoredUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        register,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
