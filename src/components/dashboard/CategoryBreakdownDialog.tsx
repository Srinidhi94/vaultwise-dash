import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown } from "lucide-react";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { formatFullAmount } from "@/utils/numberFormat";

interface CategoryData {
  name: string;
  amount: number;
}

interface CategoryBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CategoryData[];
  currencySymbol: string;
  type: 'income' | 'expense';
}

export const CategoryBreakdownDialog = ({
  open,
  onOpenChange,
  data,
  currencySymbol,
  type,
}: CategoryBreakdownDialogProps) => {
  const { numberFormat } = usePreferencesStore();
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  const getBorderColorClass = () => {
    return type === 'expense' ? 'border-destructive/20' : 'border-success/20';
  };

  const getTextColorClass = () => {
    return type === 'expense' ? 'text-destructive' : 'text-success';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'expense' ? (
              <TrendingUp className="h-5 w-5 text-destructive rotate-180" />
            ) : (
              <TrendingUp className="h-5 w-5 text-success" />
            )}
            {type === 'expense' ? 'Expenses' : 'Income'} by Category
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-semibold">Total {type === 'expense' ? 'Expenses' : 'Income'}</span>
            <span className={`text-xl font-bold ${getTextColorClass()}`}>
              {currencySymbol}{formatFullAmount(total, numberFormat, 2)}
            </span>
          </div>

          {/* Category List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {sortedData.length > 0 ? (
                sortedData.map((item, index) => {
                  const percentage = total > 0 ? (item.amount / total) * 100 : 0;
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg bg-muted/50 ${getBorderColorClass()} border transition-all hover:scale-[1.02]`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.name}</span>
                        <span className={`font-bold ${getTextColorClass()}`}>
                          {currencySymbol}{formatFullAmount(item.amount, numberFormat, 2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                          <div
                            className={`h-full ${type === 'expense' ? 'bg-destructive' : 'bg-success'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground min-w-[45px] text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No {type === 'expense' ? 'expenses' : 'income'} found</p>
                  <p className="text-sm">for the selected period</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
