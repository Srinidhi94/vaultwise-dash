import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  currency_symbol: string;
  display_name: string | null;
  subscription_tier: 'free' | 'premium';
  trial_expires_at: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;

  // Actions
  fetchProfile: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  getDisplayName: () => string;
  isPaidUser: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  devtools(
    (set, get) => ({
      profile: null,
      loading: false,

      fetchProfile: async () => {
        set({ loading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          set({ profile: data as UserProfile });
        } catch (error) {
          // Silently handle fetch errors
        } finally {
          set({ loading: false });
        }
      },

      updateDisplayName: async (displayName: string) => {
        set({ loading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { error } = await supabase
            .from('user_profiles')
            .update({ display_name: displayName })
            .eq('id', user.id);

          if (error) throw error;

          // Update local state
          set((state) => ({
            profile: state.profile ? { ...state.profile, display_name: displayName } : null
          }));
        } finally {
          set({ loading: false });
        }
      },

      getDisplayName: () => {
        const { profile } = get();
        return profile?.display_name || 'User';
      },

      isPaidUser: () => {
        const { profile } = get();
        return profile?.subscription_tier === 'premium';
      },
    }),
    { name: 'profile-store' }
  )
);
