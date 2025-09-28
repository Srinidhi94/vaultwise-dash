import { useEffect, useState } from "react";
import { useAccountsStore } from "@/stores/useAccountsStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CreditCard, Wallet, Trash2 } from "lucide-react";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { toast } from "sonner";

const Accounts = () => {
  const { 
    savingsAccounts, 
    creditCards, 
    fetchAccounts, 
    addSavingsAccount, 
    addCreditCard,
    deleteSavingsAccount,
    deleteCreditCard,
    loading 
  } = useAccountsStore();
  
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountType, setAccountType] = useState<'savings' | 'credit'>('savings');
  const [formData, setFormData] = useState({
    accountName: '',
    currentBalance: '',
    creditLimit: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleAddAccount = async () => {
    try {
      if (accountType === 'savings') {
        await addSavingsAccount({
          name: formData.accountName,
          current_balance: parseFloat(formData.currentBalance) || 0,
          opening_balance: parseFloat(formData.currentBalance) || 0,
          is_active: true
        });
      } else {
        await addCreditCard({
          name: formData.accountName,
          current_balance: parseFloat(formData.currentBalance) || 0,
          credit_limit: parseFloat(formData.creditLimit) || 0,
          is_active: true
        });
      }
      
      setFormData({ accountName: '', currentBalance: '', creditLimit: '' });
      setIsAddAccountOpen(false);
      toast.success("Account added successfully!");
    } catch (error) {
      toast.error("Failed to add account");
    }
  };

  const handleDeleteAccount = async (id: string, type: 'savings' | 'credit') => {
    try {
      if (type === 'savings') {
        await deleteSavingsAccount(id);
      } else {
        await deleteCreditCard(id);
      }
      toast.success("Account deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete account");
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
          
          <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
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
                
                <div>
                  <Label htmlFor="currentBalance">Current Balance</Label>
                  <Input
                    id="currentBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({...formData, currentBalance: e.target.value})}
                  />
                </div>
                
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
                <Card key={account.id} className="financial-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAccount(account.id, 'savings')}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(account.current_balance)}
                    </div>
                    <CardDescription>
                      Savings Account
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
              {creditCards.map((card) => (
                <Card key={card.id} className="financial-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAccount(card.id, 'credit')}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(card.current_balance)}
                    </div>
                    <CardDescription>
                      Limit: {formatCurrency(card.credit_limit)}
                    </CardDescription>
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        Utilization: {((card.current_balance / card.credit_limit) * 100).toFixed(1)}%
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${Math.min((card.current_balance / card.credit_limit) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Accounts;