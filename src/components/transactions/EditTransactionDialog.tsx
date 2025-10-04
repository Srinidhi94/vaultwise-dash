import { useEffect, useState } from "react";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  transaction_type: "income" | "expense";
  account_type: "savings" | "credit";
  account_id: string;
  category_id?: string;
  notes?: string;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    category_id: "",
    notes: "",
    transaction_type: "expense" as "income" | "expense",
  });

  // Update form when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description || "",
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

      toast.success("Transaction updated successfully!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Update transaction failed:", error);
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
            Update transaction details. Some fields are locked for data integrity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Locked Fields Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Date, amount, and account are locked. To change these, delete this transaction and create a new one.
            </AlertDescription>
          </Alert>

          {/* Locked: Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-3 w-3" />
              Date (Locked)
            </Label>
            <Input
              value={format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Locked: Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-3 w-3" />
              Amount (Locked)
            </Label>
            <Input
              value={`$${transaction.amount.toFixed(2)}`}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Locked: Account */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-3 w-3" />
              Account (Locked)
            </Label>
            <Input
              value={getAccountName()}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Editable: Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="transactionType">Transaction Type *</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value: "income" | "expense") =>
                setFormData({ ...formData, transaction_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Editable: Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="e.g., Grocery shopping"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

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
                {getCategoriesByType(formData.transaction_type).map((category) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
