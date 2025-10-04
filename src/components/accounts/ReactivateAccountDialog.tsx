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
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ReactivateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  accountType: "savings" | "credit";
  onConfirm: () => Promise<void>;
}

export const ReactivateAccountDialog = ({
  open,
  onOpenChange,
  accountName,
  accountType,
  onConfirm,
}: ReactivateAccountDialogProps) => {
  const [isReactivating, setIsReactivating] = useState(false);

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await onConfirm();
      toast.success(`${accountName} reactivated successfully`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to reactivate account");
    } finally {
      setIsReactivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Reactivate {accountName}?
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              Are you sure you want to reactivate this {accountType} account?
            </p>
            
            <div className="p-3 border rounded-lg bg-primary/5">
              <p className="font-semibold text-sm mb-2">What will happen:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• The account will be available for new transactions</li>
                <li>• Historical transactions will appear in your analytics</li>
                <li>• Account balance will be included in your totals</li>
                <li>• The account will show in transaction dropdowns</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              You can always mark it as inactive again if needed.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isReactivating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReactivate}
            disabled={isReactivating}
            className="bg-primary hover:bg-primary/90"
          >
            {isReactivating ? "Reactivating..." : "Reactivate Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
