import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export type NumberFormat = 'indian' | 'international';

interface PreferencesState {
  currencySymbol: string;
  numberFormat: NumberFormat;
  loading: boolean;
  load: () => Promise<void>;
  updateCurrencySymbol: (symbol: string) => Promise<void>;
  updateNumberFormat: (format: NumberFormat) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    (set) => ({
      currencySymbol: '$',
      numberFormat: 'indian',
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
            .select('currency_symbol, number_format')
            .eq('id', user.id)
            .single();
          if (!error && data) {
            if (data.currency_symbol) {
              set({ currencySymbol: data.currency_symbol });
            }
            if (data.number_format) {
              set({ numberFormat: data.number_format as NumberFormat });
            }
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

      updateNumberFormat: async (format: NumberFormat) => {
        set({ loading: true });
        try {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData.user;
          if (!user) throw new Error('Not authenticated');

          const { error } = await supabase
            .from('user_profiles')
            .update({ number_format: format })
            .eq('id', user.id);

          if (error) throw error;

          set({ numberFormat: format });
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: 'preferences-store' }
  )
);
