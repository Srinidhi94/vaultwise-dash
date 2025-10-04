import { useEffect, useState } from "react";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Calendar, Trash2, Edit } from "lucide-react";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { AddTransactionSheet } from "@/components/transactions/AddTransactionSheet";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/transactions/EditTransactionDialog";
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { toast } from "sonner";
import { format } from "date-fns";

const Transactions = () => {
  const { 
    transactions, 
    categories, 
    loading,
    fetchTransactions, 
    fetchCategories,
    deleteTransaction,
    getFilteredTransactions
  } = useTransactionsStore();
  const { fetchAccounts, savingsAccounts, creditCards } = useAccountsStore();
  const { currencySymbol } = usePreferencesStore();
  
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<typeof transactions[0] | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchAccounts();
  }, [fetchTransactions, fetchCategories, fetchAccounts]);

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${currencySymbol}${formatted}`;
  };

  const handleViewTransaction = (transaction: typeof transactions[0]) => {
    setSelectedTransaction(transaction);
    setIsDetailDialogOpen(true);
  };

  const handleEditTransaction = (transaction: typeof transactions[0]) => {
    setSelectedTransaction(transaction);
    setIsEditTransactionOpen(true);
  };

  const handleDeleteClick = (transaction: typeof transactions[0]) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTransaction) return;
    
    await deleteTransaction(selectedTransaction.id);
    await fetchTransactions();
    await fetchAccounts();
  };

  const getAccountName = (accountId: string, accountType: string) => {
    if (accountType === 'savings') {
      return savingsAccounts.find(a => a.id === accountId)?.name || 'Unknown Account';
    } else {
      return creditCards.find(c => c.id === accountId)?.name || 'Unknown Card';
    }
  };

  const filteredTransactions = getFilteredTransactions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-20">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">Track your income and expenses</p>
          </div>
          
          <Button 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setIsAddSheetOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Filters */}
        <TransactionFilters />

        {/* Transactions List */}
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or add your first transaction
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => {
                const category = categories.find(c => c.id === transaction.category_id);
                return (
                  <Card 
                    key={transaction.id} 
                    className="financial-card cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleViewTransaction(transaction)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-full ${
                            transaction.transaction_type === 'income' 
                              ? 'bg-success/20 text-success' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {transaction.transaction_type === 'income' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{transaction.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {category?.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={`text-lg font-semibold ${
                            transaction.transaction_type === 'income' 
                              ? 'text-success' 
                              : 'text-destructive'
                          }`}>
                            {transaction.transaction_type === 'income' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTransaction(transaction);
                              }}
                              className="h-7 w-7 p-0 hover:bg-primary/10"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(transaction);
                              }}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <FloatingActionButton
        onClick={() => setIsAddSheetOpen(true)}
        ariaLabel="Add transaction"
      />
      
      <AddTransactionSheet
        open={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
      />
      
      <AddTransactionDialog 
        open={isAddTransactionOpen}
        onOpenChange={setIsAddTransactionOpen}
        onSuccess={() => {
          fetchTransactions();
          fetchAccounts();
        }}
      />
      
      <EditTransactionDialog
        open={isEditTransactionOpen}
        onOpenChange={setIsEditTransactionOpen}
        transaction={selectedTransaction}
        onSuccess={() => {
          fetchTransactions();
          fetchAccounts();
        }}
      />

      <TransactionDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        transaction={selectedTransaction}
        category={selectedTransaction ? categories.find(c => c.id === selectedTransaction.category_id) : null}
        accountName={selectedTransaction ? getAccountName(selectedTransaction.account_id, selectedTransaction.account_type) : ''}
        currencySymbol={currencySymbol}
        onEdit={() => {
          setIsDetailDialogOpen(false);
          handleEditTransaction(selectedTransaction!);
        }}
        onDelete={() => {
          if (selectedTransaction) {
            handleDeleteClick(selectedTransaction);
          }
        }}
      />

      <DeleteTransactionDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        transactionDescription={selectedTransaction?.description || ''}
        transactionAmount={selectedTransaction?.amount || 0}
        currencySymbol={currencySymbol}
        onConfirm={handleConfirmDelete}
      />
      
      <BottomNavigation />
    </div>
  );
};

export default Transactions;