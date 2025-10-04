import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalyticsCardsProps {
  totalIncome: number;
  totalExpense: number;
  creditUtilization: number;
  currencySymbol: string;
}

export const AnalyticsCards = ({
  totalIncome,
  totalExpense,
  creditUtilization,
  currencySymbol,
}: AnalyticsCardsProps) => {
  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${currencySymbol}${formatted}`;
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `${currencySymbol}${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const cards = [
    {
      title: "Total Income",
      amount: totalIncome,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
      subtitle: "for selected period",
    },
    {
      title: "Total Expense",
      amount: totalExpense,
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      subtitle: "for selected period",
    },
    {
      title: "Credit Utilization",
      amount: creditUtilization,
      icon: CreditCard,
      color: "text-primary",
      bgColor: "bg-primary/10",
      subtitle: "of available credit",
      isPercentage: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="financial-card hover:shadow-lg transition-shadow cursor-pointer"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className={`text-2xl font-bold ${card.color}`}>
                {card.isPercentage
                  ? `${card.amount.toFixed(1)}%`
                  : formatCompact(card.amount)}
              </p>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </div>

            {card.isPercentage && (
              <div className="mt-4">
                <Progress
                  value={Math.min(card.amount, 100)}
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
