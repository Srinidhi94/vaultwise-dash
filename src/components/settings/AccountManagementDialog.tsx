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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Wallet, CreditCard, Users } from "lucide-react";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { toast } from "sonner";

interface AccountManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountManagementDialog = ({
  open,
  onOpenChange,
}: AccountManagementDialogProps) => {
  const { savingsAccounts, creditCards, reactivateSavingsAccount, reactivateCreditCard } = useAccountsStore();
  const { isPaidUser } = useProfileStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const isPaid = isPaidUser();
  const totalAccounts = savingsAccounts.length + creditCards.length;
  const activeAccounts = savingsAccounts.filter(a => a.is_active).length + creditCards.filter(c => c.is_active).length;
  const inactiveAccounts = totalAccounts - activeAccounts;

  // Account limits based on subscription
  const accountLimit = isPaid ? 50 : 5;
  const canAddMore = totalAccounts < accountLimit;

  const handleBulkReactivate = async () => {
    setIsProcessing(true);
    try {
      const inactiveSavings = savingsAccounts.filter(a => !a.is_active);
      const inactiveCredit = creditCards.filter(c => !c.is_active);

      // Reactivate all inactive accounts
      await Promise.all([
        ...inactiveSavings.map(account => reactivateSavingsAccount(account.id)),
        ...inactiveCredit.map(card => reactivateCreditCard(card.id))
      ]);

      toast.success(`Reactivated ${inactiveAccounts} accounts`);
    } catch (error) {
      toast.error("Failed to reactivate some accounts");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Account Management
          </DialogTitle>
          <DialogDescription>
            Overview of your accounts and subscription limits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Account Summary */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Account Summary</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Savings</span>
                </div>
                <p className="text-lg font-bold">{savingsAccounts.filter(a => a.is_active).length}</p>
                <p className="text-xs text-muted-foreground">
                  {savingsAccounts.filter(a => !a.is_active).length} inactive
                </p>
              </div>
              
              <div className="p-3 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Credit</span>
                </div>
                <p className="text-lg font-bold">{creditCards.filter(c => c.is_active).length}</p>
                <p className="text-xs text-muted-foreground">
                  {creditCards.filter(c => !c.is_active).length} inactive
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Subscription Limits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Subscription Limits</h4>
              <Badge variant={isPaid ? "default" : "secondary"}>
                {isPaid ? "Paid Plan" : "Free Plan"}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Accounts</span>
                <span className="font-medium">
                  {totalAccounts} / {accountLimit}
                </span>
              </div>
              
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    totalAccounts >= accountLimit ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min((totalAccounts / accountLimit) * 100, 100)}%` }}
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                {canAddMore 
                  ? `You can add ${accountLimit - totalAccounts} more accounts`
                  : "Account limit reached"
                }
              </p>
            </div>
          </div>

          {/* Bulk Actions */}
          {inactiveAccounts > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Bulk Actions</h4>
                <Button
                  variant="outline"
                  onClick={handleBulkReactivate}
                  disabled={isProcessing}
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {isProcessing 
                    ? "Reactivating..." 
                    : `Reactivate All ${inactiveAccounts} Inactive Accounts`
                  }
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
