import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Trash2, TrendingUp, TrendingDown, Calendar, CreditCard, Wallet, Tag, FileText } from "lucide-react";
import { format } from "date-fns";
import { Category } from "@/stores/useTransactionsStore";

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
    transaction_date: string;
    transaction_type: string;
    account_type: string;
    notes?: string | null;
    category_id?: string | null;
    account_id: string;
  } | null;
  category?: Category | null;
  accountName: string;
  currencySymbol: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const TransactionDetailDialog = ({
  open,
  onOpenChange,
  transaction,
  category,
  accountName,
  currencySymbol,
  onEdit,
  onDelete,
}: TransactionDetailDialogProps) => {
  if (!transaction) return null;

  const formatAmount = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${currencySymbol}${formatted}`;
  };

  const isIncome = transaction.transaction_type === 'income';
  const amountColor = isIncome ? 'text-success' : 'text-destructive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIncome ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            {transaction.description}
          </DialogTitle>
          <DialogDescription>
            Transaction details and information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Amount</span>
            <span className={`text-2xl font-bold ${amountColor}`}>
              {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
            </span>
          </div>

          <Separator />

          {/* Transaction Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Type</span>
            <Badge variant={isIncome ? "default" : "destructive"} className="capitalize">
              {transaction.transaction_type}
            </Badge>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Date</span>
            </div>
            <span className="text-sm font-semibold">
              {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
            </span>
          </div>

          {/* Category */}
          {category && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>Category</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{category.name}</span>
              </div>
            </div>
          )}

          {/* Account */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {transaction.account_type === 'credit' ? (
                <CreditCard className="h-4 w-4" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              <span>Account</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{accountName}</span>
              <Badge variant="outline" className="capitalize text-xs">
                {transaction.account_type}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Notes</span>
                </div>
                <p className="text-sm bg-secondary/30 p-3 rounded-lg">
                  {transaction.notes}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onEdit();
            }}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onDelete();
            }}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
