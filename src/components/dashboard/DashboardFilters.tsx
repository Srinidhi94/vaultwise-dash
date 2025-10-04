import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Filter, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

interface DashboardFiltersProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  accountId: string;
  onAccountChange: (accountId: string) => void;
  accounts: Array<{ id: string; name: string; type: "savings" | "credit" }>;
}

export const DashboardFilters = ({
  dateRange,
  onDateRangeChange,
  accountId,
  onAccountChange,
  accounts,
}: DashboardFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();

  const datePresets = [
    {
      label: "This Month",
      value: "thisMonth",
      range: { start: startOfMonth(today), end: endOfMonth(today) },
    },
    {
      label: "Last Month",
      value: "lastMonth",
      range: {
        start: startOfMonth(subMonths(today, 1)),
        end: endOfMonth(subMonths(today, 1)),
      },
    },
    {
      label: "Last 3 Months",
      value: "last3Months",
      range: { start: startOfMonth(subMonths(today, 2)), end: endOfMonth(today) },
    },
    {
      label: "Last 6 Months",
      value: "last6Months",
      range: { start: startOfMonth(subMonths(today, 5)), end: endOfMonth(today) },
    },
    {
      label: "This Year",
      value: "thisYear",
      range: { start: startOfYear(today), end: endOfMonth(today) },
    },
  ];

  const getCurrentPreset = () => {
    const preset = datePresets.find(
      (p) =>
        p.range.start.getTime() === dateRange.start.getTime() &&
        p.range.end.getTime() === dateRange.end.getTime()
    );
    return preset?.value || "last3Months";
  };

  const handleDatePresetChange = (value: string) => {
    const preset = datePresets.find((p) => p.value === value);
    if (preset) {
      onDateRangeChange(preset.range);
    }
  };

  const savingsAccounts = accounts.filter((a) => a.type === "savings");
  const creditCards = accounts.filter((a) => a.type === "credit");

  const getAccountName = () => {
    if (accountId === "all") return "All Accounts";
    const account = accounts.find(a => a.id === accountId);
    return account?.name || "All Accounts";
  };

  const getDateLabel = () => {
    const preset = datePresets.find(
      (p) =>
        p.range.start.getTime() === dateRange.start.getTime() &&
        p.range.end.getTime() === dateRange.end.getTime()
    );
    return preset?.label || "Custom Range";
  };

  return (
    <Card className="financial-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Filters</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {getDateLabel()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getAccountName()}
                  </Badge>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Date Range
            </label>
            <Select value={getCurrentPreset()} onValueChange={handleDatePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Account
            </label>
            <Select value={accountId} onValueChange={onAccountChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {savingsAccounts.length > 0 && (
                  <>
                    <SelectItem value="savings-header" disabled className="font-semibold text-xs">
                      Savings Accounts
                    </SelectItem>
                    {savingsAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {creditCards.length > 0 && (
                  <>
                    <SelectItem value="credit-header" disabled className="font-semibold text-xs">
                      Credit Cards
                    </SelectItem>
                    {creditCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
