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

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  accountType: "savings" | "credit";
  source: "manual" | "aa";
  onInactivate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export const DeleteAccountDialog = ({
  open,
  onOpenChange,
  accountName,
  accountType,
  source,
  onInactivate,
  onDelete,
}: DeleteAccountDialogProps) => {
  const isAA = source === 'aa';
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInactivate = async () => {
    setIsProcessing(true);
    try {
      await onInactivate();
      toast.success(`${accountName} marked as inactive`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to inactivate account");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (isAA) return; // AA accounts cannot be permanently deleted
    setIsProcessing(true);
    try {
      await onDelete();
      toast.success(`${accountName} and all transactions permanently deleted`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isAA ? `Unlink ${accountName}?` : `Delete ${accountName}?`}
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              {isAA
                ? "This account is synced from your bank. You can unlink it to hide it and its transactions."
                : `Choose how you want to remove this ${accountType} account:`}
            </p>
            
            <div className="space-y-2">
              <div className="p-3 border rounded-lg bg-secondary/30">
                <p className="font-semibold text-sm mb-1">{isAA ? 'Unlink Account' : 'Mark as Inactive'}</p>
                <p className="text-xs text-muted-foreground">
                  The account and its transactions will be hidden but can be restored later.
                  {isAA ? '' : ' This is the recommended option.'}
                </p>
              </div>

              {!isAA && (
                <div className="p-3 border border-destructive/50 rounded-lg bg-destructive/5">
                  <p className="font-semibold text-sm mb-1 text-destructive">Permanently Delete</p>
                  <p className="text-xs text-muted-foreground">
                    The account and ALL associated transactions will be permanently deleted.
                    This action cannot be undone!
                  </p>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant={isAA ? "default" : "secondary"}
            onClick={handleInactivate}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? "Processing..." : isAA ? "Unlink Account" : "Mark as Inactive"}
          </Button>
          {!isAA && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              {isProcessing ? "Deleting..." : "Permanently Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
