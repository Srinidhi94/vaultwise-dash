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
import { supabase } from "@/integrations/supabase/client";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { toast } from "sonner";

interface ResetCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining",     icon: "utensils",        color: "#ef4444", type: "expense" },
  { name: "Transportation",    icon: "car",             color: "#3b82f6", type: "expense" },
  { name: "Shopping",          icon: "shopping-bag",    color: "#f59e0b", type: "expense" },
  { name: "Entertainment",     icon: "film",            color: "#8b5cf6", type: "expense" },
  { name: "Bills & Utilities", icon: "receipt",         color: "#10b981", type: "expense" },
  { name: "Healthcare",        icon: "heart",           color: "#ec4899", type: "expense" },
  { name: "Salary",            icon: "banknote",        color: "#22c55e", type: "income"  },
  { name: "Freelance",         icon: "briefcase",       color: "#06b6d4", type: "income"  },
  { name: "Investment",        icon: "trending-up",     color: "#6366f1", type: "income"  },
  { name: "Others",            icon: "more-horizontal", color: "#6b7280", type: "both"    },
];

export const ResetCategoriesDialog = ({
  open,
  onOpenChange,
}: ResetCategoriesDialogProps) => {
  const [isResetting, setIsResetting] = useState(false);
  const { fetchTransactions } = useTransactionsStore();

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Not signed in");
      const userId = userData.user.id;

      const { error: delErr } = await supabase
        .from("categories")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase
        .from("categories")
        .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId, is_default: true })));
      if (insErr) throw insErr;

      await fetchTransactions();
      toast.success("Categories reset to defaults");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Failed to reset categories", { description: msg });
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
            <span className="block">
              This will delete all your current categories and restore the default ones:
            </span>

            <span className="block p-3 border rounded-lg bg-secondary/30 text-sm space-y-1">
              {DEFAULT_CATEGORIES.map((c) => (
                <span key={c.name} className="block">• {c.name}</span>
              ))}
            </span>

            <span className="block bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive font-semibold">
              ⚠️ Warning: Existing transactions are kept but their category links will be cleared.
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isResetting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
            {isResetting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resetting…
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
