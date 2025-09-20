import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface Transaction {
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

interface Category {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
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
            .select('*')
            .order('name');

          if (error) throw error;
          set({ categories: data || [] });
        } catch (error) {
          console.error('Error fetching categories:', error);
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

        set((state) => ({
          transactions: [data as Transaction, ...state.transactions],
        }));
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