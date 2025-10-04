import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface CategoryData {
  name: string;
  amount: number;
}

interface SpendsByCategoryProps {
  data: CategoryData[];
  currencySymbol: string;
}

const COLORS = [
  "hsl(var(--destructive))",
  "hsl(var(--destructive) / 0.8)",
  "hsl(var(--destructive) / 0.6)",
  "hsl(var(--destructive) / 0.4)",
  "hsl(var(--destructive) / 0.2)",
];

export const SpendsByCategory = ({ data, currencySymbol }: SpendsByCategoryProps) => {
  const totalExpense = data.reduce((sum, item) => sum + item.amount, 0);
  const topCategories = data.slice(0, 5);

  return (
    <Card className="financial-card">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-destructive rotate-180" />
          <span className="hidden sm:inline">Spends by Category</span>
          <span className="sm:hidden">Spends</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        {topCategories.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={2}
                    dataKey="amount"
                  >
                    {topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs sm:text-sm font-bold text-destructive">
                  {currencySymbol}{totalExpense.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">Total</p>
              </div>
            </div>
            
            {/* Legend - Mobile: 2 items, Desktop: 3 items */}
            <div className="mt-2 sm:mt-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                {topCategories.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="font-semibold text-destructive">
                      {currencySymbol}{item.amount.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
              {topCategories.length > 3 && (
                <p className="text-xs text-muted-foreground text-center mt-1 sm:mt-2">
                  +{topCategories.length - 3} more
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 sm:py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50 rotate-180" />
            <p className="text-xs sm:text-sm">No expenses</p>
            <p className="text-xs hidden sm:block">for selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
