import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAccountsStore } from '@/stores/useAccountsStore';
import { useTransactionsStore } from '@/stores/useTransactionsStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatsCards from '@/components/dashboard/StatsCards';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { PlusCircle, Wallet, TrendingUp, User, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, signOut } = useAuthStore();
  const { fetchAccounts, getTotalSavingsBalance, loading: accountsLoading } = useAccountsStore();
  const { fetchTransactions, fetchCategories, transactions, loading: transactionsLoading } = useTransactionsStore();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchTransactions();
      fetchCategories();
    }
  }, [user, fetchAccounts, fetchTransactions, fetchCategories]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalSavings = getTotalSavingsBalance();
  const recentTransactions = transactions.slice(0, 5);

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
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold">Welcome back</h1>
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
        
        <div className="text-center">
          <p className="text-white/80 text-sm mb-1">Total Balance</p>
          <h2 className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalSavings)}</h2>
          <p className="text-white/60 text-xs mt-1">{format(new Date(), 'MMMM dd, yyyy')}</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 -mt-6 sm:-mt-8 space-y-4 sm:space-y-6">
        {/* Quick Stats */}
        <StatsCards />

        {/* Quick Actions */}
        <Card className="financial-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <PlusCircle className="w-5 h-5 mr-2 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button 
              className="bg-gradient-success h-12 flex-col space-y-1 hover:scale-105 transition-transform" 
              onClick={() => navigate('/transactions')}
            >
              <PlusCircle className="w-5 h-5" />
              <span className="text-xs">Add Transaction</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-12 flex-col space-y-1 hover:scale-105 transition-transform" 
              onClick={() => navigate('/accounts')}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-xs">Manage Accounts</span>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="financial-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
              <span className="text-primary text-sm">View All</span>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No transactions yet</h3>
                <p className="text-sm mb-4">Start by adding your first transaction</p>
                <Button size="sm" onClick={() => navigate('/transactions')}>
                  Add Transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className="font-medium text-sm truncate">{transaction.description}</h4>
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

      <BottomNavigation />
    </div>
  );
};

export default Dashboard;