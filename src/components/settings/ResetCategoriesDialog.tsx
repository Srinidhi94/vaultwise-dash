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
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { toast } from "sonner";

interface ResetCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResetCategoriesDialog = ({
  open,
  onOpenChange,
}: ResetCategoriesDialogProps) => {
  const [isResetting, setIsResetting] = useState(false);
  const { resetCategories } = useTransactionsStore();

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetCategories();
      toast.success("Categories reset to defaults successfully!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to reset categories");
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reset Transaction Categories?
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              This will delete all your current categories and restore the default ones:
            </p>
            
            <div className="p-3 border rounded-lg bg-secondary/30 text-sm space-y-1">
              <p>• Food & Dining</p>
              <p>• Transportation</p>
              <p>• Shopping</p>
              <p>• Entertainment</p>
              <p>• Bills & Utilities</p>
              <p>• Healthcare</p>
              <p>• Education</p>
              <p>• Travel</p>
              <p>• Groceries</p>
              <p>• Income</p>
              <p>• Other</p>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-xs text-destructive font-semibold">
                ⚠️ Warning: Your existing transactions will NOT be deleted, but their category associations may need to be updated.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Categories"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
