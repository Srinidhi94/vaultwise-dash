import { useEffect, useState } from "react";
import { useAccountsStore, type SavingsAccount, type CreditCard as CreditCardAccount } from "@/stores/useAccountsStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { getCreditCardDetails } from "@/utils/creditCardUtils";
import { formatFullAmount } from "@/utils/numberFormat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CreditCard, Wallet, Trash2, Edit, Cloud, Unlink, RefreshCw } from "lucide-react";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { EditSavingsAccountDialog, EditCreditCardDialog } from "@/components/accounts/EditAccountDialog";
import { DeleteAccountDialog } from "@/components/accounts/DeleteAccountDialog";
import { ReactivateAccountDialog } from "@/components/accounts/ReactivateAccountDialog";
import { ConnectAccountDialog } from "@/components/accounts/ConnectAccountDialog";
import { useAccountAggregatorStore } from "@/stores/useAccountAggregatorStore";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const Accounts = () => {
  const { 
    savingsAccounts, 
    creditCards, 
    fetchAccounts, 
    addSavingsAccount, 
    addCreditCard,
    updateSavingsAccount,
    updateCreditCard,
    inactivateSavingsAccount,
    inactivateCreditCard,
    reactivateSavingsAccount,
    reactivateCreditCard,
    deleteSavingsAccount,
    deleteCreditCard,
    loading 
  } = useAccountsStore();
  
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { fetchProfile } = useProfileStore();
  const { currencySymbol, numberFormat } = usePreferencesStore();
  
  const { syncAccount, checkAndRevokeConsent } = useAccountAggregatorStore();
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountType, setAccountType] = useState<'savings' | 'credit'>('savings');
  const [formData, setFormData] = useState({
    accountName: '',
    currentBalance: '',
    creditLimit: ''
  });
  
  // Edit dialog state
  const [editSavingsDialog, setEditSavingsDialog] = useState<{ open: boolean; account: SavingsAccount | null }>({ open: false, account: null });
  const [editCreditDialog, setEditCreditDialog] = useState<{ open: boolean; card: CreditCardAccount | null }>({ open: false, card: null });
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; account: SavingsAccount | CreditCardAccount | null; type: 'savings' | 'credit' | null }>({ open: false, account: null, type: null });
  
  // Reactivate dialog state
  const [reactivateDialog, setReactivateDialog] = useState<{ open: boolean; account: SavingsAccount | CreditCardAccount | null; type: 'savings' | 'credit' | null }>({ open: false, account: null, type: null });

  useEffect(() => {
    fetchAccounts();
    fetchProfile();
    fetchTransactions();
  }, [fetchAccounts, fetchProfile, fetchTransactions]);

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${formatFullAmount(amount, numberFormat, 2)}`;
  };

  const handleAddAccount = async () => {
    try {
      if (accountType === 'savings') {
        await addSavingsAccount({
          name: formData.accountName,
          current_balance: parseFloat(formData.currentBalance) || 0,
          opening_balance: parseFloat(formData.currentBalance) || 0,
          is_active: true,
          source: 'manual',
        });
      } else {
        await addCreditCard({
          name: formData.accountName,
          current_balance: parseFloat(formData.currentBalance) || 0,
          credit_limit: parseFloat(formData.creditLimit) || 0,
          is_active: true,
          source: 'manual',
        });
      }
      
      setFormData({ accountName: '', currentBalance: '', creditLimit: '' });
      setIsAddAccountOpen(false);
      toast.success("Account added successfully!");
    } catch (error) {
      toast.error("Failed to add account");
    }
  };

  const handleSaveOpeningBalance = async (id: string, opening_balance: number) => {
    await updateSavingsAccount(id, { opening_balance });
    await fetchAccounts();
  };

  const handleSaveCreditLimit = async (id: string, credit_limit: number) => {
    await updateCreditCard(id, { credit_limit });
    await fetchAccounts();
  };

  const handleInactivateAccount = async () => {
    if (!deleteDialog.account || !deleteDialog.type) return;
    
    const accountId = deleteDialog.account.id;
    const isAA = deleteDialog.account.source === 'aa';

    if (deleteDialog.type === 'savings') {
      await inactivateSavingsAccount(accountId);
    } else {
      await inactivateCreditCard(accountId);
    }
    await fetchAccounts();

    // Auto-revoke consent if all accounts under it are now inactive
    if (isAA) {
      await checkAndRevokeConsent(accountId);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      const res = await syncAccount(accountId);
      if (res) {
        toast.success(`Synced ${res.inserted} new transaction${res.inserted !== 1 ? 's' : ''}`);
        await fetchAccounts();
        await fetchTransactions();
      }
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteDialog.account || !deleteDialog.type) return;
    
    if (deleteDialog.type === 'savings') {
      await deleteSavingsAccount(deleteDialog.account.id);
    } else {
      await deleteCreditCard(deleteDialog.account.id);
    }
    await fetchAccounts();
  };

  const handleReactivateAccount = async () => {
    if (!reactivateDialog.account || !reactivateDialog.type) return;
    
    if (reactivateDialog.type === 'savings') {
      await reactivateSavingsAccount(reactivateDialog.account.id);
    } else {
      await reactivateCreditCard(reactivateDialog.account.id);
    }
  };

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
            <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
            <p className="text-muted-foreground">Manage your financial accounts</p>
          </div>
          
          <div className="flex items-center gap-2">
            <ConnectAccountDialog />
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Account
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select value={accountType} onValueChange={(value: 'savings' | 'credit') => setAccountType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings Account</SelectItem>
                      <SelectItem value="credit">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="e.g., Main Checking, Chase Credit Card"
                    value={formData.accountName}
                    onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                  />
                </div>
                
                {accountType === 'savings' && (
                  <div>
                    <Label htmlFor="openingBalance">Opening Balance</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.currentBalance}
                      onChange={(e) => setFormData({...formData, currentBalance: e.target.value})}
                    />
                  </div>
                )}
                
                {accountType === 'credit' && (
                  <div>
                    <Label htmlFor="creditLimit">Credit Limit</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({...formData, creditLimit: e.target.value})}
                    />
                  </div>
                )}
                
                <Button onClick={handleAddAccount} className="w-full">
                  Add Account
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Savings Accounts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Savings Accounts</h2>
          </div>
          
          {savingsAccounts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No savings accounts yet</p>
                <p className="text-sm text-muted-foreground">Add your first account to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {savingsAccounts.map((account) => (
                <Card key={account.id} className={`financial-card ${!account.is_active ? 'opacity-60 bg-muted/50' : ''}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                      {account.source === 'aa' && (
                        <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {!account.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {account.is_active ? (
                        <>
                          {account.source === 'aa' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSyncAccount(account.id)}
                              disabled={syncingAccountId === account.id}
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                              title="Sync transactions"
                            >
                              <RefreshCw className={`h-4 w-4 ${syncingAccountId === account.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditSavingsDialog({ open: true, account })}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, account, type: 'savings' })}
                            className={`h-8 w-8 p-0 ${account.source === 'aa' ? 'hover:bg-muted' : 'text-destructive hover:bg-destructive/10'}`}
                          >
                            {account.source === 'aa' ? <Unlink className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReactivateDialog({ open: true, account, type: 'savings' })}
                          className="h-8 px-3 text-xs"
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${account.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                      {formatCurrency(account.current_balance)}
                    </div>
                    <CardDescription>
                      Savings Account
                      {account.source === 'aa' && account.aa_last_synced_at && (
                        <span className="ml-1">· Synced {formatDistanceToNow(new Date(account.aa_last_synced_at), { addSuffix: true })}</span>
                      )}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Credit Cards */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Credit Cards</h2>
          </div>
          
          {creditCards.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No credit cards yet</p>
                <p className="text-sm text-muted-foreground">Add your credit cards to track utilization</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {creditCards.map((card) => {
                const details = getCreditCardDetails(card.id, card.credit_limit, transactions);
                return (
                  <Card key={card.id} className={`financial-card ${!card.is_active ? 'opacity-60 bg-muted/50' : ''}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
                        {card.source === 'aa' && (
                          <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {!card.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {card.is_active ? (
                          <>
                            {card.source === 'aa' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSyncAccount(card.id)}
                                disabled={syncingAccountId === card.id}
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                                title="Sync transactions"
                              >
                                <RefreshCw className={`h-4 w-4 ${syncingAccountId === card.id ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditCreditDialog({ open: true, card })}
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ open: true, account: card, type: 'credit' })}
                              className={`h-8 w-8 p-0 ${card.source === 'aa' ? 'hover:bg-muted' : 'text-destructive hover:bg-destructive/10'}`}
                            >
                              {card.source === 'aa' ? <Unlink className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReactivateDialog({ open: true, account: card, type: 'credit' })}
                            className="h-8 px-3 text-xs"
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Credit Limit</div>
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(details.limit)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Used This Month</div>
                            <div className="text-lg font-semibold text-destructive">
                              {formatCurrency(details.used)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Available</div>
                            <div className="text-lg font-semibold text-success">
                              {formatCurrency(details.available)}
                            </div>
                          </div>
                        </div>
                        
                        {card.source === 'aa' && card.aa_last_synced_at && (
                          <div className="text-xs text-muted-foreground">
                            Synced {formatDistanceToNow(new Date(card.aa_last_synced_at), { addSuffix: true })}
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Utilization for this month: {details.utilization.toFixed(1)}%
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                details.utilization > 70 ? 'bg-destructive' : 
                                details.utilization > 30 ? 'bg-warning' : 
                                'bg-success'
                              }`}
                              style={{ width: `${Math.min(details.utilization, 100)}%` }}
                            >
                            </div>
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
      
      {/* Edit Dialogs */}
      {editSavingsDialog.account && (
        <EditSavingsAccountDialog
          open={editSavingsDialog.open}
          onOpenChange={(open) => setEditSavingsDialog({ open, account: null })}
          account={editSavingsDialog.account}
          onSave={handleSaveOpeningBalance}
        />
      )}
      
      {editCreditDialog.card && (
        <EditCreditCardDialog
          open={editCreditDialog.open}
          onOpenChange={(open) => setEditCreditDialog({ open, card: null })}
          card={editCreditDialog.card}
          onSave={handleSaveCreditLimit}
        />
      )}
      
      {/* Delete Dialog */}
      <DeleteAccountDialog
        open={deleteDialog.open && !!deleteDialog.account && !!deleteDialog.type}
        onOpenChange={(open) => setDeleteDialog({ open, account: null, type: null })}
        accountName={deleteDialog.account?.name || ""}
        accountType={deleteDialog.type || "savings"}
        source={deleteDialog.account?.source || "manual"}
        onInactivate={handleInactivateAccount}
        onDelete={handleDeleteAccount}
      />
      
      {/* Reactivate Dialog */}
      <ReactivateAccountDialog
        open={reactivateDialog.open && !!reactivateDialog.account && !!reactivateDialog.type}
        onOpenChange={(open) => setReactivateDialog({ open, account: null, type: null })}
        accountName={reactivateDialog.account?.name || ""}
        accountType={reactivateDialog.type || "savings"}
        source={reactivateDialog.account?.source || "manual"}
        onConfirm={handleReactivateAccount}
      />
      
      <BottomNavigation />
    </div>
  );
};

export default Accounts;