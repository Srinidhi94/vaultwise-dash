import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, CreditCard } from "lucide-react";
import { calculateCardUtilization } from "@/utils/creditCardUtils";

interface Transaction {
  account_id: string;
  account_type: "savings" | "credit";
  transaction_type: "income" | "expense";
  amount: number;
  transaction_date: string;
}

interface SavingsAccount {
  id: string;
  name: string;
  current_balance: number;
  type: "savings";
}

interface CreditCard {
  id: string;
  name: string;
  current_balance: number;
  credit_limit: number;
  type: "credit";
}

type Account = SavingsAccount | CreditCard;

interface AccountActivityProps {
  transactions: Transaction[];
  savingsAccounts: SavingsAccount[];
  creditCards: CreditCard[];
  currencySymbol: string;
}

export const AccountActivity = ({
  transactions,
  savingsAccounts,
  creditCards,
  currencySymbol,
}: AccountActivityProps) => {
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(0)}`;
  };

  // Combine all accounts with their activity
  const allAccounts = [
    ...savingsAccounts.map(acc => ({ ...acc, type: "savings" as const })),
    ...creditCards.map(card => ({ ...card, type: "credit" as const }))
  ];

  const accountsWithActivity = allAccounts
    .map((account) => {
      const accountTransactions = transactions.filter(
        (t) => t.account_id === account.id
      );

      const hasActivity = accountTransactions.length > 0;

      if (account.type === "savings") {
        return {
          ...account,
          hasActivity,
          displayValue: account.current_balance,
          displayType: "balance" as const,
        };
      } else {
        // Credit card - calculate utilization using proper method
        const utilization = calculateCardUtilization(
          account.id,
          account.credit_limit,
          transactions
        );
        return {
          ...account,
          hasActivity,
          displayValue: utilization,
          displayType: "utilization" as const,
        };
      }
    })
    .filter((account) => account.hasActivity || account.displayValue > 0)
    .sort((a, b) => {
      // Sort by balance/utilization amount
      if (a.displayType === "balance" && b.displayType === "balance") {
        return b.displayValue - a.displayValue;
      }
      if (a.displayType === "utilization" && b.displayType === "utilization") {
        return b.displayValue - a.displayValue;
      }
      // Savings accounts first, then credit cards
      return a.type === "savings" ? -1 : 1;
    });

  return (
    <Card className="financial-card">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <span className="hidden sm:inline">Account Activity</span>
          <span className="sm:hidden">Accounts</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        {accountsWithActivity.length === 0 ? (
          <div className="text-center py-4 sm:py-8 text-muted-foreground">
            <Wallet className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">No accounts</p>
            <p className="text-xs hidden sm:block">with activity</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {accountsWithActivity.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    {account.type === "savings" ? (
                      <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    ) : (
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-sm leading-tight break-words">{account.name}</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {account.type === "savings" ? "Savings" : "Credit Card"}
                    </p>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  {account.displayType === "balance" ? (
                    <div>
                      <p className={`font-semibold text-xs sm:text-sm ${
                        account.displayValue >= 0 ? "text-success" : "text-destructive"
                      }`}>
                        {formatCurrency(account.displayValue)}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block">Balance</p>
                    </div>
                  ) : (
                    <div className="w-16 sm:w-20">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-semibold text-xs sm:text-sm ${
                          account.displayValue > 50 ? "text-destructive" : 
                          account.displayValue > 30 ? "text-yellow-600" : "text-success"
                        }`}>
                          {account.displayValue.toFixed(0)}%
                        </p>
                      </div>
                      <Progress 
                        value={Math.min(account.displayValue, 100)} 
                        className="h-1 sm:h-2"
                      />
                      <p className="text-xs text-muted-foreground hidden sm:block mt-1">Utilization</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
