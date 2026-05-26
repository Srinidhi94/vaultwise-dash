import { useEffect, useState } from "react";
import { useTransactionsStore, Transaction } from "@/stores/useTransactionsStore";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess?: () => void;
}

export const EditTransactionDialog = ({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: EditTransactionDialogProps) => {
  const { updateTransaction, categories, getCategoriesByType } = useTransactionsStore();
  const { savingsAccounts, creditCards } = useAccountsStore();
  const { currencySymbol } = usePreferencesStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAA = transaction?.source === "aa";
  
  const [formData, setFormData] = useState({
    description: "",
    user_description: "",
    category_id: "",
    notes: "",
    transaction_type: "expense" as "income" | "expense",
  });

  // Update form when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description || "",
        user_description: transaction.user_description || "",
        category_id: transaction.category_id || "",
        notes: transaction.notes || "",
        transaction_type: transaction.transaction_type,
      });
    }
  }, [transaction]);

  const handleSubmit = async () => {
    if (!transaction) return;

    try {
      setIsSubmitting(true);

      if (isAA) {
        await updateTransaction(transaction.id, {
          user_description: formData.user_description.trim() || undefined,
          category_id: formData.category_id || undefined,
          notes: formData.notes || undefined,
        });
      } else {
        if (!formData.description.trim()) {
          toast.error("Description is required");
          return;
        }
        await updateTransaction(transaction.id, {
          description: formData.description,
          category_id: formData.category_id || undefined,
          notes: formData.notes || undefined,
          transaction_type: formData.transaction_type,
        });
      }

      toast.success("Transaction updated successfully!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message ? `Failed to update: ${message}` : "Failed to update transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  // Get account name
  const getAccountName = () => {
    if (transaction.account_type === "savings") {
      const account = savingsAccounts.find((a) => a.id === transaction.account_id);
      return account?.name || "Unknown Account";
    } else {
      const card = creditCards.find((c) => c.id === transaction.account_id);
      return card?.name || "Unknown Card";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            {isAA
              ? "You can update the display name, category, and notes. Other fields are synced from your bank."
              : "Edit the details below. Date, amount, and account cannot be changed."}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[65vh] pr-2">
          <div className="space-y-4">
            {/* Compact Locked Fields Summary */}
            <div className="bg-muted/50 rounded-lg p-3 border border-muted">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Date</span>
                      <p className="font-medium truncate">{format(new Date(transaction.transaction_date), "MMM dd, yyyy")}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <p className="font-medium truncate">{currencySymbol}{transaction.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Account</span>
                      <p className="font-medium truncate">{getAccountName()}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Type</span>
                      <p className="font-medium truncate capitalize">{transaction.transaction_type}</p>
                    </div>
                    {isAA && (
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">Original Narration</span>
                        <p className="font-medium text-xs truncate">{transaction.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          {/* AA: Display Name (user_description) */}
          {isAA && (
            <div className="space-y-2">
              <Label htmlFor="user_description">Display Name</Label>
              <Input
                id="user_description"
                placeholder={transaction.description}
                value={formData.user_description}
                onChange={(e) => setFormData({ ...formData, user_description: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Set a friendly name. Leave empty to use the original narration.
              </p>
            </div>
          )}

          {/* Manual: Transaction Type */}
          {!isAA && (
            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction Type *</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value: "income" | "expense") =>
                  setFormData({ ...formData, transaction_type: value })
                }
              >
                <SelectTrigger className="focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Manual: Description */}
          {!isAA && (
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Grocery shopping"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          )}

          {/* Editable: Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {getCategoriesByType(isAA ? transaction.transaction_type : formData.transaction_type).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Editable: Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
