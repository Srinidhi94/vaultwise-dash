import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, TrendingUp } from "lucide-react";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { formatFullAmount } from "@/utils/numberFormat";

interface CreditUtilizationProps {
  currentBalance: number;
  creditLimit: number;
  currencySymbol: string;
  cardName: string;
}

export const CreditUtilization = ({
  currentBalance,
  creditLimit,
  currencySymbol,
  cardName,
}: CreditUtilizationProps) => {
  const { numberFormat } = usePreferencesStore();
  const utilizationPercentage = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
  const availableCredit = creditLimit - currentBalance;
  
  // Determine color based on utilization
  const getUtilizationColor = () => {
    if (utilizationPercentage >= 80) return 'text-destructive';
    if (utilizationPercentage >= 50) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = () => {
    if (utilizationPercentage >= 80) return 'bg-destructive';
    if (utilizationPercentage >= 50) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Card className="financial-card">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="hidden sm:inline">Credit Utilization</span>
          <span className="sm:hidden">Utilization</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        <div className="flex flex-col items-center space-y-3 sm:space-y-4">
          {/* Circular Progress */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="50%"
                cy="50%"
                r="40%"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50%"
                cy="50%"
                r="40%"
                fill="none"
                stroke={utilizationPercentage >= 80 ? 'hsl(var(--destructive))' : utilizationPercentage >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--success))'}
                strokeWidth="8"
                strokeDasharray={`${utilizationPercentage * 2.51} 251`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className={`text-lg sm:text-2xl font-bold ${getUtilizationColor()}`}>
                {utilizationPercentage.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">Used</p>
            </div>
          </div>

          {/* Details */}
          <div className="w-full space-y-2">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-muted-foreground">Current Balance</span>
              <span className={`font-semibold ${getUtilizationColor()}`}>
                {currencySymbol}{formatFullAmount(currentBalance, numberFormat, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-muted-foreground">Credit Limit</span>
              <span className="font-semibold">
                {currencySymbol}{formatFullAmount(creditLimit, numberFormat, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t">
              <span className="text-muted-foreground">Available</span>
              <span className="font-bold text-success">
                {currencySymbol}{formatFullAmount(availableCredit, numberFormat, 0)}
              </span>
            </div>
          </div>

          {/* Status Message */}
          {utilizationPercentage >= 80 && (
            <div className="w-full p-2 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive text-center font-medium">
                High utilization - Consider paying down balance
              </p>
            </div>
          )}
          {utilizationPercentage >= 50 && utilizationPercentage < 80 && (
            <div className="w-full p-2 bg-warning/10 rounded-lg">
              <p className="text-xs text-warning text-center font-medium">
                Moderate utilization
              </p>
            </div>
          )}
          {utilizationPercentage < 50 && (
            <div className="w-full p-2 bg-success/10 rounded-lg">
              <p className="text-xs text-success text-center font-medium">
                Healthy utilization
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
