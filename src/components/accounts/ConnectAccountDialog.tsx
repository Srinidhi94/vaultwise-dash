import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Lock, Loader2, ShieldCheck, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useProfileStore } from "@/stores/useProfileStore";
import { useAccountAggregatorStore } from "@/stores/useAccountAggregatorStore";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { toast } from "sonner";

interface ConnectAccountDialogProps {
  trigger?: React.ReactNode;
}

export const ConnectAccountDialog = ({ trigger }: ConnectAccountDialogProps) => {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const isPaid = useProfileStore((s) => s.isPaidUser());
  const {
    phase,
    currentConsentId,
    redirectUrl,
    errorMessage,
    startConsent,
    pollConsentUntilResolved,
    fetchData,
    reset,
  } = useAccountAggregatorStore();
  const { fetchAccounts } = useAccountsStore();
  const { fetchTransactions } = useTransactionsStore();

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleStart = async () => {
    const trimmed = phone.trim();
    if (trimmed && !/^\d{10}$/.test(trimmed)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    const consent = await startConsent({ phone: trimmed || undefined, months: 12 });
    if (!consent) return;

    if (consent.redirect_url) {
      window.open(consent.redirect_url, "_blank", "noopener,width=480,height=720");
    }

    if (consent.status === "active") {
      await runFetch(consent.consent_id);
      return;
    }

    const finalStatus = await pollConsentUntilResolved(consent.consent_id);
    if (finalStatus === "active") {
      await runFetch(consent.consent_id);
    } else {
      toast.error(`Consent ${finalStatus}`, {
        description: "Please try again.",
      });
    }
  };

  const runFetch = async (consentId: string) => {
    const result = await fetchData(consentId);
    if (!result) return;
    await Promise.all([fetchAccounts(), fetchTransactions()]);
    toast.success("Account connected", {
      description: `Imported ${result.inserted} new transaction(s) across ${result.account_ids.length} account(s).`,
    });
    setOpen(false);
  };

  const busy = phase === "creating" || phase === "awaiting_approval" || phase === "fetching";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Link2 className="w-4 h-4" />
            Connect bank accounts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Connect your bank
          </DialogTitle>
          <DialogDescription>
            Securely import transactions from your bank. Your banking credentials
            are never shared with SpendWise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          {phase === "idle" && (
            <>
              <div className="rounded-md bg-muted/40 p-3 space-y-2">
                <p className="font-medium">What happens next</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>You approve a one-time consent on your phone.</li>
                  <li>SpendWise fetches your last 12 months of transactions.</li>
                  <li>Tap the sync button on your accounts anytime to fetch new transactions.</li>
                </ol>
              </div>

              {isPaid && (
                <div className="space-y-1.5">
                  <Label htmlFor="aa-phone">Mobile number (linked to your bank)</Label>
                  <Input
                    id="aa-phone"
                    type="tel"
                    placeholder="10-digit mobile (optional for mock)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required when connecting to Setu; leave blank to test with the mock provider.
                  </p>
                </div>
              )}

              {!isPaid && (
                <div className="rounded-md border border-dashed p-3 flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Premium feature</span>
                      <Badge variant="secondary" className="text-xs">Premium</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Upgrade to unlock automatic bank syncing.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {phase === "creating" && (
            <StatusBlock icon={<Loader2 className="w-5 h-5 animate-spin" />}>
              Creating consent request…
            </StatusBlock>
          )}

          {phase === "awaiting_approval" && (
            <div className="space-y-3">
              <StatusBlock icon={<Loader2 className="w-5 h-5 animate-spin" />}>
                Waiting for you to approve the consent on your phone.
              </StatusBlock>
              {redirectUrl && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => window.open(redirectUrl, "_blank", "noopener,width=480,height=720")}
                >
                  <ExternalLink className="w-4 h-4" />
                  Reopen approval window
                </Button>
              )}
            </div>
          )}

          {phase === "fetching" && (
            <StatusBlock icon={<Loader2 className="w-5 h-5 animate-spin" />}>
              Fetching your transactions…
            </StatusBlock>
          )}

          {phase === "done" && (
            <StatusBlock icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}>
              All set.
            </StatusBlock>
          )}

          {phase === "error" && (
            <StatusBlock icon={<AlertCircle className="w-5 h-5 text-destructive" />}>
              {errorMessage ?? "Something went wrong."}
            </StatusBlock>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {busy ? "Working…" : "Cancel"}
          </Button>
          {isPaid ? (
            <Button
              onClick={phase === "error" ? () => reset() : handleStart}
              disabled={busy}
              className="gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {phase === "error" ? "Try again" : busy ? "Connecting…" : "Connect now"}
            </Button>
          ) : (
            <Button
              onClick={() => {
                toast.info("Upgrade to Premium", { description: "Premium upgrade flow coming soon." });
              }}
            >
              Upgrade to connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StatusBlock = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-md bg-muted/40 p-4 flex items-center gap-3 text-sm">
    {icon}
    <div className="flex-1">{children}</div>
  </div>
);

export default ConnectAccountDialog;
