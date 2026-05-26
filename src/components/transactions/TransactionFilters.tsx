import { useState, useEffect } from "react";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, X, Search } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

type DateRangePreset = "all" | "thisMonth" | "lastMonth" | "last3Months" | "last6Months" | "thisYear" | "custom";

export const TransactionFilters = () => {
  const { filters, filtersInitialized, setFilters, categories } = useTransactionsStore();
  const { savingsAccounts, creditCards } = useAccountsStore();
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  const [datePreset, setDatePreset] = useState<DateRangePreset>("thisMonth");

  // Initialize with current month on mount only if never initialized before
  useEffect(() => {
    // Only set default if filters have never been initialized
    if (!filtersInitialized) {
      const today = new Date();
      setFilters({
        dateRange: {
          start: startOfMonth(today),
          end: endOfMonth(today),
        },
      });
      // Mark as initialized by updating the store
      useTransactionsStore.setState({ filtersInitialized: true });
      setDatePreset("thisMonth");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Count active filters (excluding default date range)
  const today = new Date();
  const isDefaultDateRange = 
    filters.dateRange.start?.getTime() === startOfMonth(today).getTime() &&
    filters.dateRange.end?.getTime() === endOfMonth(today).getTime();
  
  // "All time" (both null) is considered an active filter if user explicitly chose it
  const isAllTime = !filters.dateRange.start && !filters.dateRange.end && filtersInitialized;
  
  const activeFilterCount = [
    isAllTime || ((filters.dateRange.start || filters.dateRange.end) && !isDefaultDateRange),
    filters.accountType !== "all",
    filters.accountId,
    filters.categoryId,
    filters.transactionType !== "all",
    filters.searchKeyword && filters.searchKeyword.trim(),
  ].filter(Boolean).length;

  const handleDatePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    const today = new Date();

    switch (preset) {
      case "all":
        setFilters({ dateRange: { start: null, end: null } });
        break;
      case "thisMonth":
        setFilters({
          dateRange: {
            start: startOfMonth(today),
            end: endOfMonth(today),
          },
        });
        break;
      case "lastMonth":
        setFilters({
          dateRange: {
            start: startOfMonth(subMonths(today, 1)),
            end: endOfMonth(subMonths(today, 1)),
          },
        });
        break;
      case "last3Months":
        setFilters({
          dateRange: {
            start: startOfMonth(subMonths(today, 2)),
            end: endOfMonth(today),
          },
        });
        break;
      case "last6Months":
        setFilters({
          dateRange: {
            start: startOfMonth(subMonths(today, 5)),
            end: endOfMonth(today),
          },
        });
        break;
      case "thisYear":
        setFilters({
          dateRange: {
            start: startOfYear(today),
            end: endOfMonth(today),
          },
        });
        break;
      case "custom":
        // Let user set custom dates
        break;
    }
  };

  const handleCustomDateChange = (type: "start" | "end", value: string) => {
    const date = value ? new Date(value) : null;
    setFilters({
      dateRange: {
        ...filters.dateRange,
        [type]: date,
      },
    });
  };

  const clearAllFilters = () => {
    const today = new Date();
    setFilters({
      dateRange: {
        start: startOfMonth(today),
        end: endOfMonth(today),
      },
      accountType: "all",
      accountId: undefined,
      categoryId: undefined,
      transactionType: "all",
      searchKeyword: undefined,
    });
    setDatePreset("thisMonth");
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="font-semibold">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllFilters();
                    }}
                    className="h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 mt-4">
            {/* Search Keyword */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Transactions
              </Label>
              <Input
                type="text"
                placeholder="Search by description, notes, or amount..."
                value={filters.searchKeyword || ''}
                onChange={(e) => setFilters({ searchKeyword: e.target.value })}
                className="w-full"
              />
              {filters.searchKeyword && filters.searchKeyword.trim() && (
                <p className="text-xs text-muted-foreground">
                  Searching in filtered results
                </p>
              )}
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={datePreset === "thisMonth" ? "default" : "outline"}
                  onClick={() => handleDatePresetChange("thisMonth")}
                  className="text-xs"
                >
                  This Month
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "lastMonth" ? "default" : "outline"}
                  onClick={() => handleDatePresetChange("lastMonth")}
                  className="text-xs"
                >
                  Last Month
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "last3Months" ? "default" : "outline"}
                  onClick={() => handleDatePresetChange("last3Months")}
                  className="text-xs"
                >
                  Last 3 Months
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "last6Months" ? "default" : "outline"}
                  onClick={() => handleDatePresetChange("last6Months")}
                  className="text-xs"
                >
                  Last 6 Months
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "thisYear" ? "default" : "outline"}
                  onClick={() => handleDatePresetChange("thisYear")}
                  className="text-xs"
                >
                  This Year
                </Button>
                <Button
                  size="sm"
                  variant={datePreset === "all" ? "default" : "outline"}
                  onClick={() => handleDatePresetChange("all")}
                  className="text-xs"
                >
                  All Time
                </Button>
              </div>

              {/* Custom Date Range */}
              <Button
                size="sm"
                variant={datePreset === "custom" ? "default" : "outline"}
                onClick={() => {
                  setDatePreset("custom");
                }}
                className="w-full text-xs"
              >
                Custom Range
              </Button>

              {datePreset === "custom" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="startDate" className="text-xs">
                      From
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={
                        filters.dateRange.start
                          ? new Date(filters.dateRange.start).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => handleCustomDateChange("start", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-xs">
                      To
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={
                        filters.dateRange.end
                          ? new Date(filters.dateRange.end).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => handleCustomDateChange("end", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Type Filter */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={filters.transactionType}
                onValueChange={(value: "all" | "income" | "expense") =>
                  setFilters({ transactionType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="expense">Expense Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Type Filter */}
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={filters.accountType}
                onValueChange={(value: "all" | "savings" | "credit") => {
                  setFilters({ accountType: value, accountId: undefined });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="savings">Savings Accounts</SelectItem>
                  <SelectItem value="credit">Credit Cards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Account Filter */}
            {filters.accountType !== "all" && (
              <div className="space-y-2">
                <Label>Specific Account</Label>
                <Select
                  value={filters.accountId || "all"}
                  onValueChange={(value) =>
                    setFilters({ accountId: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {filters.accountType} accounts</SelectItem>
                    {filters.accountType === "savings" &&
                      savingsAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    {filters.accountType === "credit" &&
                      creditCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category Filter */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={filters.categoryId || "all"}
                onValueChange={(value) =>
                  setFilters({ categoryId: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};
