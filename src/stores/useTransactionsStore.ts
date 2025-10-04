import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface Transaction {
  id: string;
  user_id: string;
  transaction_date: string;
  amount: number;
  description: string;
  transaction_type: 'income' | 'expense';
  account_type: 'savings' | 'credit';
  account_id: string;
  category_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  is_default: boolean;
  created_at: string;
}

interface TransactionsState {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  filters: {
    dateRange: { start: Date | null; end: Date | null };
    accountType: 'all' | 'savings' | 'credit';
    accountId?: string;
    categoryId?: string;
    transactionType: 'all' | 'income' | 'expense';
  };
  
  // Actions
  fetchTransactions: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  getCategoriesByType: (type: 'income' | 'expense') => Category[];
  addCategory: (name: string, type: 'income' | 'expense') => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  seedDefaultCategories: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setFilters: (filters: Partial<TransactionsState['filters']>) => void;
  
  // Computed values
  getFilteredTransactions: () => Transaction[];
  getMonthlyIncome: (month?: Date) => number;
  getMonthlyExpenses: (month?: Date) => number;
  getNetCashFlow: (month?: Date) => number;
  getExpensesByCategory: (month?: Date) => { [categoryId: string]: number };
}

export const useTransactionsStore = create<TransactionsState>()(
  devtools(
    (set, get) => ({
      transactions: [],
      categories: [],
      loading: false,
      filters: {
        dateRange: { start: null, end: null },
        accountType: 'all',
        transactionType: 'all',
      },

      fetchTransactions: async () => {
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('transaction_date', { ascending: false })
            .limit(100);

          if (error) throw error;
          set({ transactions: (data || []) as Transaction[] });
        } catch (error) {
          console.error('Error fetching transactions:', error);
        } finally {
          set({ loading: false });
        }
      },

      fetchCategories: async () => {
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('id, user_id, name, type, is_default, created_at')
            .order('name');

          if (error) throw error;
          set({ categories: (data as any[])?.map(item => ({
            id: item.id,
            user_id: item.user_id,
            name: item.name,
            type: item.type,
            is_default: item.is_default,
            created_at: item.created_at
          })) || [] });
        } catch (error) {
          console.error('Error fetching categories:', error);
        }
      },

      getCategoriesByType: (type: 'income' | 'expense') => {
        const { categories } = get();
        return categories.filter(cat => cat.type === type);
      },

      addCategory: async (name: string, type: 'income' | 'expense') => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          // Check for duplicate names within the same type
          const { categories } = get();
          const duplicate = categories.find(cat => 
            cat.name.toLowerCase() === name.toLowerCase() && cat.type === type
          );
          
          if (duplicate) {
            throw new Error(`A ${type} category with this name already exists`);
          }

          const { data, error } = await supabase
            .from('categories')
            .insert([{ 
              user_id: user.user.id, 
              name: name.trim(), 
              type, 
              is_default: false 
            }])
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            categories: [...state.categories, {
              id: (data as any).id,
              user_id: (data as any).user_id,
              name: (data as any).name,
              type: (data as any).type,
              is_default: (data as any).is_default,
              created_at: (data as any).created_at
            } as Category],
          }));
        } catch (error) {
          console.error('Error adding category:', error);
          throw error;
        }
      },

      updateCategory: async (id: string, name: string) => {
        try {
          const { error } = await supabase
            .from('categories')
            .update({ name: name.trim() })
            .eq('id', id)
            .eq('is_default', false); // Only allow updating custom categories

          if (error) throw error;

          set((state) => ({
            categories: state.categories.map((cat) =>
              cat.id === id ? { ...cat, name: name.trim() } : cat
            ),
          }));
        } catch (error) {
          console.error('Error updating category:', error);
          throw error;
        }
      },

      deleteCategory: async (id: string) => {
        try {
          // Check if category is used in transactions
          const { data: transactions, error: checkError } = await supabase
            .from('transactions')
            .select('id')
            .eq('category_id', id)
            .limit(1);

          if (checkError) throw checkError;

          if (transactions && transactions.length > 0) {
            // Update transactions to use "Others" category
            const { categories } = get();
            const othersCategory = categories.find(cat => 
              cat.name === 'Others' && cat.is_default
            );

            if (othersCategory) {
              const { error: updateError } = await supabase
                .from('transactions')
                .update({ category_id: othersCategory.id })
                .eq('category_id', id);

              if (updateError) throw updateError;
            }
          }

          const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('is_default', false); // Only allow deleting custom categories

          if (error) throw error;

          set((state) => ({
            categories: state.categories.filter((cat) => cat.id !== id),
          }));
        } catch (error) {
          console.error('Error deleting category:', error);
          throw error;
        }
      },

      seedDefaultCategories: async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Not authenticated');

          // Check if user already has categories
          const { categories } = get();
          if (categories.length > 0) return;

          // Categories are already seeded in the database, just fetch them
          await get().fetchCategories();
        } catch (error) {
          console.error('Error seeding default categories:', error);
          throw error;
        }
      },

      addTransaction: async (transaction) => {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not authenticated');
        
        const { data, error } = await supabase
          .from('transactions')
          .insert([{ ...transaction, user_id: user.user.id }])
          .select()
          .single();

        if (error) throw error;

        // Balance is now calculated dynamically from transactions
        // No need to update account balance here

        set((state) => ({
          transactions: [data as Transaction, ...state.transactions],
        }));

        // Trigger balance recalculation
        const { useAccountsStore } = await import('./useAccountsStore');
        useAccountsStore.getState().recalculateBalances();
      },

      updateTransaction: async (id, updates) => {
        const { error } = await supabase
          .from('transactions')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id ? { ...transaction, ...updates } : transaction
          ),
        }));

        // Trigger balance recalculation
        const { useAccountsStore } = await import('./useAccountsStore');
        useAccountsStore.getState().recalculateBalances();
      },

      deleteTransaction: async (id) => {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          transactions: state.transactions.filter((transaction) => transaction.id !== id),
        }));

        // Trigger balance recalculation - THIS IS THE KEY FIX!
        const { useAccountsStore } = await import('./useAccountsStore');
        useAccountsStore.getState().recalculateBalances();
      },

      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),

      getFilteredTransactions: () => {
        const { transactions, filters } = get();
        return transactions.filter((transaction) => {
          // Date range filter
          if (filters.dateRange.start && new Date(transaction.transaction_date) < filters.dateRange.start) return false;
          if (filters.dateRange.end && new Date(transaction.transaction_date) > filters.dateRange.end) return false;
          
          // Account type filter
          if (filters.accountType !== 'all' && transaction.account_type !== filters.accountType) return false;
          
          // Account ID filter
          if (filters.accountId && transaction.account_id !== filters.accountId) return false;
          
          // Category filter
          if (filters.categoryId && transaction.category_id !== filters.categoryId) return false;
          
          // Transaction type filter
          if (filters.transactionType !== 'all' && transaction.transaction_type !== filters.transactionType) return false;
          
          return true;
        });
      },

      getMonthlyIncome: (month = new Date()) => {
        const { transactions } = get();
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        
        return transactions
          .filter((transaction) => {
            const transactionDate = new Date(transaction.transaction_date);
            return transaction.transaction_type === 'income' && 
                   transactionDate >= start && 
                   transactionDate <= end;
          })
          .reduce((total, transaction) => total + transaction.amount, 0);
      },

      getMonthlyExpenses: (month = new Date()) => {
        const { transactions } = get();
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        
        return transactions
          .filter((transaction) => {
            const transactionDate = new Date(transaction.transaction_date);
            return transaction.transaction_type === 'expense' && 
                   transactionDate >= start && 
                   transactionDate <= end;
          })
          .reduce((total, transaction) => total + transaction.amount, 0);
      },

      getNetCashFlow: (month = new Date()) => {
        return get().getMonthlyIncome(month) - get().getMonthlyExpenses(month);
      },

      getExpensesByCategory: (month = new Date()) => {
        const { transactions } = get();
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        
        return transactions
          .filter((transaction) => {
            const transactionDate = new Date(transaction.transaction_date);
            return transaction.transaction_type === 'expense' && 
                   transactionDate >= start && 
                   transactionDate <= end &&
                   transaction.category_id;
          })
          .reduce((acc, transaction) => {
            const categoryId = transaction.category_id!;
            acc[categoryId] = (acc[categoryId] || 0) + transaction.amount;
            return acc;
          }, {} as { [categoryId: string]: number });
      },
    }),
    { name: 'transactions-store' }
  )
);