import { useState, useEffect } from "react";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
export const AddTransactionDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: AddTransactionDialogProps) => {
  const { addTransaction, categories, getCategoriesByType } = useTransactionsStore();
  const { savingsAccounts, creditCards, fetchAccounts } = useAccountsStore();
  
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category_id: "",
    transaction_type: "expense" as "income" | "expense",
    account_type: "savings" as "savings" | "credit",
    account_id: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });

  // Auto-populate Account Type if only one type has accounts
  useEffect(() => {
    const hasSavings = savingsAccounts.length > 0;
    const hasCredit = creditCards.length > 0;
    
    // If only one type exists, auto-select it
    if (hasSavings && !hasCredit && formData.account_type !== "savings") {
      setFormData(prev => ({ ...prev, account_type: "savings" }));
    } else if (!hasSavings && hasCredit && formData.account_type !== "credit") {
      setFormData(prev => ({ ...prev, account_type: "credit" }));
    }
  }, [savingsAccounts.length, creditCards.length]);

  // Auto-populate Account if only one account of selected type exists
  useEffect(() => {
    const accounts = formData.account_type === "savings" ? savingsAccounts : creditCards;
    
    // If only 1 account exists and not already selected, auto-select it
    if (accounts.length === 1 && !formData.account_id) {
      setFormData(prev => ({ ...prev, account_id: accounts[0].id }));
    }
    
    // If selected account no longer exists (e.g., type changed), clear it
    if (formData.account_id && !accounts.find(a => a.id === formData.account_id)) {
      setFormData(prev => ({ ...prev, account_id: "" }));
    }
  }, [formData.account_type, savingsAccounts, creditCards, formData.account_id]);

  const handleSubmit = async () => {
    try {
      if (!formData.amount || !formData.description || !formData.category_id || !formData.account_id) {
        toast.error("Please fill in all required fields");
        return;
      }
      
      const amountValue = parseFloat(formData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        toast.error("Please enter a valid amount greater than 0");
        return;
      }

      await addTransaction({
        amount: amountValue,
        description: formData.description,
        category_id: formData.category_id,
        transaction_type: formData.transaction_type,
        transaction_date: formData.transaction_date,
        account_id: formData.account_id,
        account_type: formData.account_type,
      });
      
      // Reset form
      setFormData({
        amount: "",
        description: "",
        category_id: "",
        transaction_type: "expense",
        account_type: "savings",
        account_id: "",
        transaction_date: new Date().toISOString().split("T")[0],
      });
      
      onOpenChange(false);
      toast.success("Transaction added successfully!");
      
      // Refresh data
      await fetchTransactions();
      await fetchAccounts();
      
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Add transaction failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message ? `Failed to add transaction: ${message}` : "Failed to add transaction");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Record an income or expense and assign it to an account and category.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="transactionType">Transaction Type</Label>
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

          <div>
            <Label htmlFor="accountType">Account Type</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value: "savings" | "credit") =>
                setFormData({ ...formData, account_type: value, account_id: "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings Account</SelectItem>
                <SelectItem value="credit">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="account">Account</Label>
            <Select
              value={formData.account_id}
              onValueChange={(value) => setFormData({ ...formData, account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {formData.account_type === "savings" && (
                  <>
                    {savingsAccounts.filter(a => a.is_active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {formData.account_type === "credit" && (
                  <>
                    {creditCards.filter(c => c.is_active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="transaction_date">Date</Label>
            <Input
              id="transaction_date"
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Grocery shopping, Salary"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
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

          <Button onClick={handleSubmit} className="w-full">
            Add Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
