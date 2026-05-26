import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { CategoryBreakdownDialog } from "./CategoryBreakdownDialog";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { formatAmount, formatFullAmount } from "@/utils/numberFormat";

interface CategoryData {
  name: string;
  amount: number;
}

interface IncomeByCategoryProps {
  data: CategoryData[];
  currencySymbol: string;
}

const COLORS = [
  "hsl(var(--success))",
  "hsl(var(--success) / 0.8)",
  "hsl(var(--success) / 0.6)",
  "hsl(var(--success) / 0.4)",
  "hsl(var(--success) / 0.2)",
];

export const IncomeByCategory = ({ data, currencySymbol }: IncomeByCategoryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { numberFormat } = usePreferencesStore();
  const totalIncome = data.reduce((sum, item) => sum + item.amount, 0);
  const topCategories = data.slice(0, 5);

  return (
    <>
      <Card 
        className="financial-card cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            <span className="hidden sm:inline">Income by Category</span>
            <span className="sm:hidden">Income</span>
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
                      innerRadius="65%"
                      outerRadius="95%"
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
                  <p className="text-[10px] sm:text-sm font-bold text-success">
                    <span className="sm:hidden">{currencySymbol}{formatAmount(totalIncome, numberFormat, 2)}</span>
                    <span className="hidden sm:inline">{currencySymbol}{formatFullAmount(totalIncome, numberFormat, 0)}</span>
                  </p>
                  <p className="text-[8px] sm:text-xs text-muted-foreground">Total</p>
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
                      <span className="font-semibold text-success">
                        {currencySymbol}{formatFullAmount(item.amount, numberFormat, 0)}
                      </span>
                    </div>
                  ))}
                </div>
                {topCategories.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center mt-1 sm:mt-2">
                    +{topCategories.length - 3} more
                  </p>
                )}
                <p className="text-xs text-primary text-center mt-2 font-medium">
                  Tap to view all
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 sm:py-8 text-muted-foreground">
              <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">No income</p>
              <p className="text-xs hidden sm:block">for selected period</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryBreakdownDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        data={data}
        currencySymbol={currencySymbol}
        type="income"
      />
    </>
  );
};
