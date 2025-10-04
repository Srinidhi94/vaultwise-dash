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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { exportToExcel } from "@/utils/excelExportService";
import { toast } from "sonner";

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DateRangePreset = "thisMonth" | "lastMonth" | "last3Months" | "thisYear" | "allTime" | "custom";

export const DataExportDialog = ({
  open,
  onOpenChange,
}: DataExportDialogProps) => {
  const { transactions, categories } = useTransactionsStore();
  const { savingsAccounts, creditCards } = useAccountsStore();
  const { currencySymbol } = usePreferencesStore();
  
  const [datePreset, setDatePreset] = useState<DateRangePreset>("thisMonth");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const getDateRange = () => {
    const today = new Date();
    
    switch (datePreset) {
      case "thisMonth":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "lastMonth": {
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case "last3Months":
        return { start: startOfMonth(subMonths(today, 2)), end: endOfMonth(today) };
      case "thisYear":
        return { start: startOfYear(today), end: today };
      case "allTime":
        return { start: null, end: null };
      case "custom":
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate) : null,
        };
      default:
        return { start: null, end: null };
    }
  };

  const exportToExcelFile = () => {
    const { start, end } = getDateRange();
    
    exportToExcel({
      transactions,
      categories,
      savingsAccounts,
      creditCards,
      currencySymbol,
      dateRange: { start, end }
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      exportToExcelFile();
      toast.success("Excel file exported successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to export transactions");
    } finally {
      setIsExporting(false);
    }
  };

  const { start, end } = getDateRange();
  let filteredCount = transactions.length;
  if (start) {
    filteredCount = transactions.filter(t => {
      const date = new Date(t.transaction_date);
      return (!start || date >= start) && (!end || date <= end);
    }).length;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Transaction Data
          </DialogTitle>
          <DialogDescription>
            Export your transaction history as a professional Excel file with multiple sheets, formatted data, and analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Select value={datePreset} onValueChange={(value: DateRangePreset) => setDatePreset(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="last3Months">Last 3 Months</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="allTime">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {datePreset === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="p-3 border rounded-lg bg-secondary/30">
            <p className="text-sm font-medium mb-1">Excel Export Summary</p>
            <p className="text-sm text-muted-foreground">
              {filteredCount} transactions will be exported across multiple sheets
            </p>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>• Income sheet with income transactions</p>
              <p>• Expenditure sheet with expense transactions</p>
              <p>• Credit Card sheet with credit transactions</p>
              <p>• Overview sheet with analytics and summaries</p>
            </div>
            {start && end && (
              <p className="text-xs text-muted-foreground mt-2">
                From {format(start, 'MMM dd, yyyy')} to {format(end, 'MMM dd, yyyy')}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || filteredCount === 0}>
            {isExporting ? "Generating Excel..." : `Export ${filteredCount} Transactions to Excel`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
