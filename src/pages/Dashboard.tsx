import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from "@/stores/useAuthStore";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { SpendsByCategory } from '@/components/dashboard/SpendsByCategory';
import { IncomeByCategory } from '@/components/dashboard/IncomeByCategory';
import { CreditUtilization } from '@/components/dashboard/CreditUtilization';
import { formatFullAmount, formatAmount } from '@/utils/numberFormat';
import { TrendingUp, User, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { calculateTotalCreditUtilizationForRange } from '@/utils/creditCardUtils';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, signOut } = useAuthStore();
  const { fetchAccounts, getTotalSavingsBalance, savingsAccounts, creditCards, loading: accountsLoading } = useAccountsStore();
  const { fetchTransactions, fetchCategories, transactions, categories, loading: transactionsLoading, setFilters: setTransactionFilters } = useTransactionsStore();
  const { currencySymbol, numberFormat } = usePreferencesStore();
  const { getDisplayName, fetchProfile } = useProfileStore();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  
  // Filter state from store
  const { dateRange, selectedAccountId, setDateRange, setSelectedAccountId } = useDashboardStore();

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchTransactions();
      fetchCategories();
      fetchProfile();
    }
  }, [user, fetchAccounts, fetchTransactions, fetchCategories, fetchProfile]);

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${formatFullAmount(amount, numberFormat, 2)}`;
  };

  const totalSavings = getTotalSavingsBalance();
  
  // Prepare accounts for filter
  const allAccounts = useMemo(() => [
    ...savingsAccounts.map(a => ({ id: a.id, name: a.name, type: 'savings' as const })),
    ...creditCards.map(c => ({ id: c.id, name: c.name, type: 'credit' as const })),
  ], [savingsAccounts, creditCards]);
  
  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      const inDateRange = transactionDate >= dateRange.start && transactionDate <= dateRange.end;
      const matchesAccount = selectedAccountId === 'all' || t.account_id === selectedAccountId;
      return inDateRange && matchesAccount;
    });
  }, [transactions, dateRange, selectedAccountId]);
  
  // Calculate analytics
  const analytics = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = filteredTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const creditUtil = calculateTotalCreditUtilizationForRange(creditCards, filteredTransactions, dateRange.start, dateRange.end);
    
    // Category breakdowns
    const expenseByCategory = filteredTransactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((acc, t) => {
        const category = categories.find(c => c.id === t.category_id);
        const categoryName = category?.name || 'Uncategorized';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const incomeByCategory = filteredTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((acc, t) => {
        const category = categories.find(c => c.id === t.category_id);
        const categoryName = category?.name || 'Uncategorized';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    return {
      totalIncome: income,
      totalExpense: expense,
      creditUtilization: creditUtil,
      expenseData: Object.entries(expenseByCategory)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount),
      incomeData: Object.entries(incomeByCategory)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }, [filteredTransactions, creditCards, categories, dateRange]);
  
  const recentTransactions = filteredTransactions.slice(0, 5);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleViewAllTransactions = () => {
    // Apply dashboard filters to transactions page
    setTransactionFilters({
      dateRange: {
        start: dateRange.start,
        end: dateRange.end,
      },
      accountId: selectedAccountId !== 'all' ? selectedAccountId : undefined,
    });
    navigate('/transactions');
  };

  if (accountsLoading || transactionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading your financial data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-20">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-4 sm:p-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold">Welcome back, {getDisplayName()}!</h1>
              <p className="text-white/80 text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-white hover:bg-white/20 flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{isSigningOut ? "..." : "Sign Out"}</span>
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-6 mt-4 space-y-6">
        {/* Filters */}
        <DashboardFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          accountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          accounts={allAccounts}
        />

        {/* 2x2 Analytics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Row 1: Income & Expense Cards */}
          <Card className="financial-card">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Income</p>
                  <p className="text-base sm:text-xl font-bold text-success">
                    <span className="sm:hidden">{currencySymbol}{formatAmount(analytics.totalIncome, numberFormat, 2)}</span>
                    <span className="hidden sm:inline">{formatCurrency(analytics.totalIncome)}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="financial-card">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-2 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-destructive rotate-180" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Expense</p>
                  <p className="text-base sm:text-xl font-bold text-destructive">
                    <span className="sm:hidden">{currencySymbol}{formatAmount(analytics.totalExpense, numberFormat, 2)}</span>
                    <span className="hidden sm:inline">{formatCurrency(analytics.totalExpense)}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Row 2: Income by Category (or Credit Utilization) & Spends by Category */}
          {selectedAccountId !== 'all' && creditCards.find(c => c.id === selectedAccountId) ? (
            <CreditUtilization
              currentBalance={creditCards.find(c => c.id === selectedAccountId)?.current_balance || 0}
              creditLimit={creditCards.find(c => c.id === selectedAccountId)?.credit_limit || 0}
              currencySymbol={currencySymbol}
              cardName={creditCards.find(c => c.id === selectedAccountId)?.name || 'Credit Card'}
            />
          ) : (
            <IncomeByCategory
              data={analytics.incomeData}
              currencySymbol={currencySymbol}
            />
          )}

          <SpendsByCategory
            data={analytics.expenseData}
            currencySymbol={currencySymbol}
          />
        </div>

        {/* Recent Transactions */}
        <Card className="financial-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleViewAllTransactions}>
              <span className="text-primary text-sm">View All</span>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No transactions yet</h3>
                <p className="text-sm mb-4">Link an account to sync your transactions</p>
                <Button size="sm" onClick={() => navigate('/accounts')}>
                  Go to Accounts
                </Button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className="font-medium text-sm truncate">{transaction.user_description || transaction.description}</h4>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className={`font-semibold text-sm ${
                      transaction.transaction_type === 'income' 
                        ? 'amount-positive' 
                        : 'amount-negative'
                    }`}>
                      {transaction.transaction_type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {(savingsAccounts.some(a => a.source !== 'aa') || creditCards.some(c => c.source !== 'aa')) && (
        <>
          <FloatingActionButton
            onClick={() => setIsAddSheetOpen(true)}
            ariaLabel="Add transaction"
          />
          
          <AddTransactionSheet
            open={isAddSheetOpen}
            onOpenChange={setIsAddSheetOpen}
          />
        </>
      )}
      
      <BottomNavigation />
    </div>
  );
};

export default Dashboard;