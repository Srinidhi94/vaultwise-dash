import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Sparkles } from "lucide-react";
import { useProfileStore } from "@/stores/useProfileStore";
import { toast } from "sonner";

export const SubscriptionCard = () => {
  const { profile, isPaidUser } = useProfileStore();
  const isPaid = isPaidUser();

  const handleUpgrade = () => {
    toast.info("Upgrade to Premium", {
      description: "Premium features coming soon! Connect your bank accounts for automatic transaction sync.",
      duration: 5000,
    });
  };

  const freeBenefits = [
    "Unlimited manual transactions",
    "Multiple accounts & credit cards",
    "Transaction filtering & editing",
    "Monthly financial insights",
  ];

  const premiumBenefits = [
    "Everything in Free",
    "Connect bank accounts automatically",
    "Automatic transaction sync",
    "Consent-based, RBI-regulated",
    "Priority support",
  ];

  return (
    <Card className={`financial-card ${isPaid ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isPaid ? 'bg-primary/20' : 'bg-secondary'
            }`}>
              {isPaid ? (
                <Crown className="h-6 w-6 text-primary" />
              ) : (
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isPaid ? 'Premium Plan' : 'Free Plan'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isPaid ? 'Full access to all features' : 'Essential features included'}
              </p>
            </div>
          </div>
          <Badge variant={isPaid ? "default" : "secondary"}>
            {isPaid ? 'Active' : 'Free'}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          {(isPaid ? premiumBenefits : freeBenefits).map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <Check className={`h-4 w-4 shrink-0 ${isPaid ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-foreground">{benefit}</span>
            </div>
          ))}
        </div>

        {!isPaid && (
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-primary to-primary/80"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
