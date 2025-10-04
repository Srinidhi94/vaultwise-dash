import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditSavingsAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    name: string;
    opening_balance: number;
  };
  onSave: (id: string, opening_balance: number) => Promise<void>;
}

export const EditSavingsAccountDialog = ({
  open,
  onOpenChange,
  account,
  onSave,
}: EditSavingsAccountDialogProps) => {
  const [openingBalance, setOpeningBalance] = useState(account.opening_balance.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const balance = parseFloat(openingBalance);
    if (isNaN(balance)) {
      toast.error("Please enter a valid number");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(account.id, balance);
      toast.success("Opening balance updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update opening balance");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Opening Balance</DialogTitle>
          <DialogDescription>
            Update the starting balance for {account.name}. Current transactions will be recalculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="opening_balance">Opening Balance</Label>
            <Input
              id="opening_balance"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="Enter opening balance"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface EditCreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: {
    id: string;
    name: string;
    credit_limit: number;
  };
  onSave: (id: string, credit_limit: number) => Promise<void>;
}

export const EditCreditCardDialog = ({
  open,
  onOpenChange,
  card,
  onSave,
}: EditCreditCardDialogProps) => {
  const [creditLimit, setCreditLimit] = useState(card.credit_limit.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const limit = parseFloat(creditLimit);
    if (isNaN(limit) || limit <= 0) {
      toast.error("Please enter a valid credit limit");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(card.id, limit);
      toast.success("Credit limit updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update credit limit");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Credit Limit</DialogTitle>
          <DialogDescription>
            Update the credit limit for {card.name}. Utilization will be recalculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="credit_limit">Credit Limit</Label>
            <Input
              id="credit_limit"
              type="number"
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="Enter credit limit"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
