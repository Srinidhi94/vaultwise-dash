import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Sparkles, Lock } from "lucide-react";
import { useProfileStore } from "@/stores/useProfileStore";
import { toast } from "sonner";

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionDialog = ({ open, onOpenChange }: SubscriptionDialogProps) => {
  const { isPaidUser } = useProfileStore();
  const isPaid = isPaidUser();

  const handleUpgrade = () => {
    toast.info("Upgrade to Premium", {
      description: "Premium features coming soon! You'll be able to upgrade and unlock AI-powered statement uploads.",
      duration: 5000,
    });
  };

  const handleManage = () => {
    toast.info("Manage Subscription", {
      description: "Subscription management coming soon!",
      duration: 3000,
    });
  };

  const freeBenefits = [
    "Unlimited manual transactions",
    "Multiple accounts & credit cards",
    "Transaction filtering & editing",
    "Monthly financial insights",
    "Category management",
  ];

  const premiumBenefits = [
    "Everything in Free Plan",
    "AI-powered statement uploads",
    "Automatic transaction extraction",
    "Advanced analytics & reports",
    "Priority support",
    "Export data to CSV/PDF",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isPaid ? 'bg-success/20' : 'bg-secondary'
            }`}>
              {isPaid ? (
                <Crown className="h-6 w-6 text-success" />
              ) : (
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl">
                {isPaid ? 'Premium Plan' : 'Free Plan'}
              </DialogTitle>
              <DialogDescription>
                {isPaid ? 'You have full access to all features' : 'Upgrade to unlock premium features'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Benefits List */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {isPaid ? 'Your Benefits' : 'What You Get'}
            </h4>
            {(isPaid ? premiumBenefits : freeBenefits).map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className={`h-5 w-5 shrink-0 mt-0.5 ${
                  isPaid ? 'text-success' : 'text-primary'
                }`} />
                <span className="text-sm text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Premium Features (for free users) */}
          {!isPaid && (
            <div className="space-y-2 pt-4 border-t">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Unlock with Premium
              </h4>
              <div className="space-y-2">
                {premiumBenefits.slice(1).map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 opacity-60">
                    <Crown className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4">
            {isPaid ? (
              <Button 
                onClick={handleManage}
                variant="outline"
                className="w-full"
              >
                Manage Subscription
              </Button>
            ) : (
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-primary to-primary/80"
                disabled
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium (Coming Soon)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
