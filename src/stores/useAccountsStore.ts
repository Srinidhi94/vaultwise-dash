import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from './useAuthStore';
import { calculateSavingsBalance, calculateCreditCardBalance } from '@/utils/accountBalanceUtils';
import { useTransactionsStore } from './useTransactionsStore';

export interface SavingsAccount {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  opening_balance: number;
  current_balance: number; // Calculated dynamically
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  credit_limit: number;
  current_balance: number; // Calculated dynamically
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AccountsState {
  savingsAccounts: SavingsAccount[];
  creditCards: CreditCard[];
  loading: boolean;
  
  // Actions
  fetchAccounts: () => Promise<void>;
  addSavingsAccount: (account: Omit<SavingsAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  addCreditCard: (card: Omit<CreditCard, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateSavingsAccount: (id: string, updates: Partial<SavingsAccount>) => Promise<void>;
  updateCreditCard: (id: string, updates: Partial<CreditCard>) => Promise<void>;
  inactivateSavingsAccount: (id: string) => Promise<void>;
  inactivateCreditCard: (id: string) => Promise<void>;
  reactivateSavingsAccount: (id: string) => Promise<void>;
  reactivateCreditCard: (id: string) => Promise<void>;
  deleteSavingsAccount: (id: string) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  
  // Computed values
  getTotalSavingsBalance: () => number;
  getTotalCreditUsed: () => number;
  getTotalCreditLimit: () => number;
  getCreditUtilization: () => number;
  
  // Recalculate balances from transactions
  recalculateBalances: () => void;
}

export const useAccountsStore = create<AccountsState>()(
  devtools(
    (set, get) => ({
      savingsAccounts: [],
      creditCards: [],
      loading: false,

      fetchAccounts: async () => {
        set({ loading: true });
        try {
          const [savingsResponse, creditResponse] = await Promise.all([
            supabase.from('savings_accounts').select('*').order('created_at'),
            supabase.from('credit_cards').select('*').order('created_at')
          ]);

          if (savingsResponse.error) throw savingsResponse.error;
          if (creditResponse.error) throw creditResponse.error;

          set({
            savingsAccounts: savingsResponse.data || [],
            creditCards: creditResponse.data || [],
          });
          
          // Recalculate balances after fetching
          get().recalculateBalances();
        } catch (error) {
          console.error('Error fetching accounts:', error);
        } finally {
          set({ loading: false });
        }
      },

      addSavingsAccount: async (account) => {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
          .from('savings_accounts')
          .insert([{ ...account, user_id: user.user.id }])
          .select()
          .single();

        if (error) throw error;

        set((state) => ({
          savingsAccounts: [...state.savingsAccounts, data],
        }));
      },

      addCreditCard: async (card) => {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
          .from('credit_cards')
          .insert([{ ...card, user_id: user.user.id }])
          .select()
          .single();

        if (error) throw error;

        set((state) => ({
          creditCards: [...state.creditCards, data],
        }));
      },

      updateSavingsAccount: async (id, updates) => {
        const { error } = await supabase
          .from('savings_accounts')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          savingsAccounts: state.savingsAccounts.map((account) =>
            account.id === id ? { ...account, ...updates } : account
          ),
        }));
      },

      updateCreditCard: async (id, updates) => {
        const { error } = await supabase
          .from('credit_cards')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          creditCards: state.creditCards.map((card) =>
            card.id === id ? { ...card, ...updates } : card
          ),
        }));
      },

      inactivateSavingsAccount: async (id) => {
        const { error } = await supabase
          .from('savings_accounts')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;

        // Update the account in state instead of removing it
        set((state) => ({
          savingsAccounts: state.savingsAccounts.map((account) =>
            account.id === id ? { ...account, is_active: false } : account
          ),
        }));
      },

      inactivateCreditCard: async (id) => {
        const { error } = await supabase
          .from('credit_cards')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;

        // Update the card in state instead of removing it
        set((state) => ({
          creditCards: state.creditCards.map((card) =>
            card.id === id ? { ...card, is_active: false } : card
          ),
        }));
      },

      reactivateSavingsAccount: async (id) => {
        const { error } = await supabase
          .from('savings_accounts')
          .update({ is_active: true })
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          savingsAccounts: state.savingsAccounts.map((account) =>
            account.id === id ? { ...account, is_active: true } : account
          ),
        }));
      },

      reactivateCreditCard: async (id) => {
        const { error } = await supabase
          .from('credit_cards')
          .update({ is_active: true })
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          creditCards: state.creditCards.map((card) =>
            card.id === id ? { ...card, is_active: true } : card
          ),
        }));
      },

      deleteSavingsAccount: async (id) => {
        // Permanently delete account and all transactions (CASCADE)
        const { error } = await supabase
          .from('savings_accounts')
          .delete()
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          savingsAccounts: state.savingsAccounts.filter((account) => account.id !== id),
        }));

        // Refresh transactions to remove deleted ones
        const { useTransactionsStore } = await import('./useTransactionsStore');
        await useTransactionsStore.getState().fetchTransactions();
      },

      deleteCreditCard: async (id) => {
        // Permanently delete card and all transactions (CASCADE)
        const { error } = await supabase
          .from('credit_cards')
          .delete()
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          creditCards: state.creditCards.filter((card) => card.id !== id),
        }));

        // Refresh transactions to remove deleted ones
        const { useTransactionsStore } = await import('./useTransactionsStore');
        await useTransactionsStore.getState().fetchTransactions();
      },

      getTotalSavingsBalance: () => {
        const { savingsAccounts } = get();
        return savingsAccounts.reduce((total, account) => total + account.current_balance, 0);
      },

      getTotalCreditUsed: () => {
        const { creditCards } = get();
        return creditCards.reduce((total, card) => total + card.current_balance, 0);
      },

      getTotalCreditLimit: () => {
        const { creditCards } = get();
        return creditCards.reduce((total, card) => total + card.credit_limit, 0);
      },

      getCreditUtilization: () => {
        const totalUsed = get().getTotalCreditUsed();
        const totalLimit = get().getTotalCreditLimit();
        return totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
      },

      recalculateBalances: () => {
        const { savingsAccounts, creditCards } = get();
        const transactions = useTransactionsStore.getState().transactions;

        // Recalculate savings account balances
        const updatedSavings = savingsAccounts.map(account => ({
          ...account,
          current_balance: calculateSavingsBalance(
            account.id,
            account.opening_balance,
            transactions
          )
        }));

        // Recalculate credit card balances
        const updatedCredit = creditCards.map(card => ({
          ...card,
          current_balance: calculateCreditCardBalance(card.id, transactions)
        }));

        set({
          savingsAccounts: updatedSavings,
          creditCards: updatedCredit,
        });
      },
    }),
    { name: 'accounts-store' }
  )
);