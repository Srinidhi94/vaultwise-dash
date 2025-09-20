import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { useTransactionsStore } from '@/stores/useTransactionsStore';
import { useAccountsStore } from '@/stores/useAccountsStore';

const StatsCards = () => {
  const { getMonthlyIncome, getMonthlyExpenses, getNetCashFlow } = useTransactionsStore();
  const { getCreditUtilization } = useAccountsStore();

  const monthlyIncome = getMonthlyIncome();
  const monthlyExpenses = getMonthlyExpenses();
  const netCashFlow = getNetCashFlow();
  const creditUtilization = getCreditUtilization();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const statsData = [
    {
      title: 'Monthly Income',
      value: formatCurrency(monthlyIncome),
      icon: TrendingUp,
      gradient: 'bg-gradient-success',
      textColor: 'text-success-foreground',
    },
    {
      title: 'Monthly Expenses',
      value: formatCurrency(monthlyExpenses),
      icon: TrendingDown,
      gradient: 'bg-gradient-warning',
      textColor: 'text-warning-foreground',
    },
    {
      title: 'Net Cash Flow',
      value: formatCurrency(netCashFlow),
      icon: DollarSign,
      gradient: netCashFlow >= 0 ? 'bg-gradient-success' : 'bg-red-500',
      textColor: netCashFlow >= 0 ? 'text-success-foreground' : 'text-white',
    },
    {
      title: 'Credit Utilization',
      value: `${creditUtilization.toFixed(1)}%`,
      icon: CreditCard,
      gradient: creditUtilization > 30 ? 'bg-red-500' : 'bg-gradient-primary',
      textColor: 'text-white',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {statsData.map((stat, index) => (
        <Card key={index} className="overflow-hidden border-0 shadow-lg">
          <CardContent className={`p-4 ${stat.gradient} ${stat.textColor}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90 mb-1">
                  {stat.title}
                </p>
                <p className="text-lg font-bold leading-tight">
                  {stat.value}
                </p>
              </div>
              <div className="ml-2">
                <stat.icon className="w-5 h-5 opacity-80" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;