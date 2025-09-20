import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      initialized: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session, user: session?.user ?? null }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      signIn: async (email, password) => {
        set({ loading: true });
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        set({ loading: false });
        return { error };
      },

      signUp: async (email, password) => {
        set({ loading: true });
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });

        // Create user profile if signup successful
        if (!error && data.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              currency_symbol: '$',
            });
          
          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
        }
        
        set({ loading: false });
        return { error };
      },

      signOut: async () => {
        set({ loading: true });
        await supabase.auth.signOut();
        set({ user: null, session: null, loading: false });
      },

      initialize: () => {
        const { initialized } = get();
        if (initialized) return;

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            set({ 
              session, 
              user: session?.user ?? null, 
              loading: false,
              initialized: true 
            });
          }
        );

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          set({ 
            session, 
            user: session?.user ?? null, 
            loading: false,
            initialized: true 
          });
        });

        return () => subscription.unsubscribe();
      },
    }),
    { name: 'auth-store' }
  )
);