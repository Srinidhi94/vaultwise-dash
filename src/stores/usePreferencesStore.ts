import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface PreferencesState {
  currencySymbol: string;
  loading: boolean;
  load: () => Promise<void>;
  updateCurrencySymbol: (symbol: string) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    (set) => ({
      currencySymbol: '$',
      loading: false,

      load: async () => {
        set({ loading: true });
        try {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData.user;
          if (!user) {
            set({ loading: false });
            return;
          }
          const { data, error } = await supabase
            .from('user_profiles')
            .select('currency_symbol')
            .eq('id', user.id)
            .single();
          if (!error && data?.currency_symbol) {
            set({ currencySymbol: data.currency_symbol });
          }
        } catch (e) {
          // noop
        } finally {
          set({ loading: false });
        }
      },

      updateCurrencySymbol: async (symbol: string) => {
        set({ loading: true });
        try {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData.user;
          if (!user) throw new Error('Not authenticated');

          const { error } = await supabase
            .from('user_profiles')
            .update({ currency_symbol: symbol })
            .eq('id', user.id);

          if (error) throw error;

          set({ currencySymbol: symbol });
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: 'preferences-store' }
  )
);
