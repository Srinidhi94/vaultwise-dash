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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { toast } from "sonner";

interface CurrencySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

export const CurrencySettingsDialog = ({
  open,
  onOpenChange,
}: CurrencySettingsDialogProps) => {
  const { currencySymbol, updateCurrencySymbol } = usePreferencesStore();
  const [selectedCurrency, setSelectedCurrency] = useState(
    CURRENCIES.find(c => c.symbol === currencySymbol)?.code || 'USD'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const currency = CURRENCIES.find(c => c.code === selectedCurrency);
    if (!currency) return;

    setIsSaving(true);
    try {
      await updateCurrencySymbol(currency.symbol);
      toast.success(`Currency updated to ${currency.name}`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update currency");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCurrencyData = CURRENCIES.find(c => c.code === selectedCurrency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Currency & Region Settings
          </DialogTitle>
          <DialogDescription>
            Choose your preferred currency for displaying amounts throughout the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{currency.symbol}</span>
                      <span>{currency.name}</span>
                      <span className="text-muted-foreground">({currency.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCurrencyData && (
            <div className="p-3 border rounded-lg bg-secondary/30">
              <p className="text-sm font-medium mb-1">Preview</p>
              <p className="text-lg font-semibold">
                {selectedCurrencyData.symbol}1,234.56
              </p>
              <p className="text-xs text-muted-foreground">
                All amounts will be displayed with this currency symbol
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
