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
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DeleteTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionDescription: string;
  transactionAmount: number;
  currencySymbol: string;
  onConfirm: () => Promise<void>;
}

export const DeleteTransactionDialog = ({
  open,
  onOpenChange,
  transactionDescription,
  transactionAmount,
  currencySymbol,
  onConfirm,
}: DeleteTransactionDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      toast.success("Transaction deleted successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Transaction?
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>Are you sure you want to permanently delete this transaction?</p>
            
            <div className="p-3 border rounded-lg bg-secondary/30">
              <p className="font-semibold text-sm mb-1">{transactionDescription}</p>
              <p className="text-lg font-bold text-destructive">
                {currencySymbol}{transactionAmount.toFixed(2)}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              This action cannot be undone. Your account balance will be recalculated automatically.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
