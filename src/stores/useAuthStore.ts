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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
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
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectUrl
            }
          });

          if (error) {
            set({ loading: false });
            return { error };
          }

          if (data.user) {
            // User profile will be created automatically by database trigger
            // Wait a moment for the trigger to execute
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          set({ loading: false });
          return { error: null };
        } catch (err) {
          set({ loading: false });
          return { error: err };
        }
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