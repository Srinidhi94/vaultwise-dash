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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Globe } from "lucide-react";
import { usePreferencesStore, NumberFormat } from "@/stores/usePreferencesStore";
import { formatAmount } from "@/utils/numberFormat";
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
  const { currencySymbol, numberFormat, updateCurrencySymbol, updateNumberFormat } = usePreferencesStore();
  const [selectedCurrency, setSelectedCurrency] = useState(
    CURRENCIES.find(c => c.symbol === currencySymbol)?.code || 'USD'
  );
  const [selectedFormat, setSelectedFormat] = useState<NumberFormat>(numberFormat);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const currency = CURRENCIES.find(c => c.code === selectedCurrency);
    if (!currency) return;

    setIsSaving(true);
    try {
      await updateCurrencySymbol(currency.symbol);
      await updateNumberFormat(selectedFormat);
      toast.success("Settings updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCurrencyData = CURRENCIES.find(c => c.code === selectedCurrency);
  
  // Example amounts for preview
  const exampleAmount = 1234567;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Currency & Region Settings
          </DialogTitle>
          <DialogDescription>
            Choose your preferred currency and number format for displaying amounts throughout the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Currency Selection */}
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

          {/* Number Format Selection */}
          <div className="space-y-3">
            <Label>Number Format</Label>
            <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as NumberFormat)}>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="indian" id="indian" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="indian" className="font-medium cursor-pointer">
                    Indian (Lakhs & Crores)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    1,00,000 = 1L • 1,00,00,000 = 1Cr
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="international" id="international" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="international" className="font-medium cursor-pointer">
                    International (Millions & Billions)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    1,000,000 = 1M • 1,000,000,000 = 1B
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Preview */}
          {selectedCurrencyData && (
            <div className="p-4 border rounded-lg bg-secondary/30 space-y-3">
              <p className="text-sm font-medium">Preview</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Small amount:</span>
                  <span className="font-semibold">
                    {selectedCurrencyData.symbol}{formatAmount(1234.56, selectedFormat, 2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Medium amount:</span>
                  <span className="font-semibold">
                    {selectedCurrencyData.symbol}{formatAmount(123456, selectedFormat, 2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Large amount:</span>
                  <span className="font-semibold">
                    {selectedCurrencyData.symbol}{formatAmount(exampleAmount, selectedFormat, 2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                All amounts will be displayed using these settings
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
