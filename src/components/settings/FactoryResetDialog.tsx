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
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface FactoryResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FactoryResetDialog = ({
  open,
  onOpenChange,
}: FactoryResetDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  const CONFIRM_TEXT = "PERMANENTLY DELETE";
  const isConfirmValid = confirmText === CONFIRM_TEXT;

  const handleFactoryReset = async () => {
    if (!isConfirmValid) {
      toast.error(`Please type "${CONFIRM_TEXT}" to confirm`);
      return;
    }

    // Start countdown
    setCountdown(5);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          performFactoryReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const performFactoryReset = async () => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete all user data in order (due to foreign key constraints)
      
      // 1. Delete all transactions
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);
      
      if (transactionsError) throw transactionsError;

      // 2. Delete all savings accounts
      const { error: savingsError } = await supabase
        .from('savings_accounts')
        .delete()
        .eq('user_id', user.id);
      
      if (savingsError) throw savingsError;

      // 3. Delete all credit cards
      const { error: creditError } = await supabase
        .from('credit_cards')
        .delete()
        .eq('user_id', user.id);
      
      if (creditError) throw creditError;

      // 4. Delete all categories
      const { error: categoriesError } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', user.id);
      
      if (categoriesError) throw categoriesError;

      // 5. Delete user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) throw profileError;

      // 6. Delete auth user account (this will sign them out)
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) {
        // If admin delete fails, just sign out the user
        await supabase.auth.signOut();
      }

      toast.success("All data deleted successfully. Goodbye!");
      
      // Navigate to auth page
      navigate('/auth');
      onOpenChange(false);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete data";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setCountdown(0);
    }
  };

  const handleClose = () => {
    if (isDeleting || countdown > 0) return; // Prevent closing during deletion
    setConfirmText("");
    setCountdown(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Factory Reset - Delete All Data
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p className="font-semibold text-destructive">
              ⚠️ This action is PERMANENT and CANNOT be undone!
            </p>
            
            <p>This will permanently delete:</p>
            
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1 text-sm">
              <p>• All your transactions</p>
              <p>• All your accounts (savings & credit cards)</p>
              <p>• All your categories</p>
              <p>• Your profile and preferences</p>
              <p>• Your entire SpendWise account</p>
            </div>

            <p className="text-xs text-muted-foreground">
              You will be signed out and will need to create a new account to use SpendWise again.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirmText" className="text-destructive font-semibold">
              Type "{CONFIRM_TEXT}" to confirm:
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_TEXT}
              disabled={isDeleting || countdown > 0}
              className="border-destructive focus:border-destructive"
            />
          </div>

          {countdown > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
              <p className="text-destructive font-semibold">
                Deleting all data in {countdown} seconds...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This cannot be stopped once started
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting || countdown > 0}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleFactoryReset}
            disabled={!isConfirmValid || isDeleting || countdown > 0}
          >
            {isDeleting ? (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Deleting All Data...
              </>
            ) : countdown > 0 ? (
              `Deleting in ${countdown}...`
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Everything
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
