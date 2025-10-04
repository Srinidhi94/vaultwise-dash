import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useTransactionsStore } from "@/stores/useTransactionsStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Shield, 
  Bell, 
  Globe, 
  LogOut, 
  ChevronRight,
  Mail,
  Download,
  Settings as SettingsIcon,
  Database,
  RefreshCw,
  Lock,
  Trash2
} from "lucide-react";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { SubscriptionDialog } from "@/components/settings/SubscriptionDialog";
import { CurrencySettingsDialog } from "@/components/settings/CurrencySettingsDialog";
import { DataExportDialog } from "@/components/settings/DataExportDialog";
import { AccountManagementDialog } from "@/components/settings/AccountManagementDialog";
import { ManageCategoriesDialog } from "@/components/settings/ManageCategoriesDialog";
import { ProfileSettingsDialog } from "@/components/settings/ProfileSettingsDialog";
import { ChangePasswordDialog } from "@/components/settings/ChangePasswordDialog";
import { FactoryResetDialog } from "@/components/settings/FactoryResetDialog";
import { toast } from "sonner";

const Settings = () => {
  const { user, signOut } = useAuthStore();
  const { isPaidUser, fetchProfile, getDisplayName } = useProfileStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
  const [isDataExportDialogOpen, setIsDataExportDialogOpen] = useState(false);
  const [isAccountManagementDialogOpen, setIsAccountManagementDialogOpen] = useState(false);
  const [isManageCategoriesDialogOpen, setIsManageCategoriesDialogOpen] = useState(false);
  const [isProfileSettingsDialogOpen, setIsProfileSettingsDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isFactoryResetDialogOpen, setIsFactoryResetDialogOpen] = useState(false);
  
  const isPaid = isPaidUser();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };


  const settingsCategories = [
    {
      title: "Profile",
      items: [
        { 
          icon: User, 
          label: "Profile Settings", 
          description: "Update your display name and info",
          onClick: () => setIsProfileSettingsDialogOpen(true)
        },
        { 
          icon: Lock, 
          label: "Change Password", 
          description: "Update your account password",
          onClick: () => setIsChangePasswordDialogOpen(true)
        },
      ]
    },
    {
      title: "Preferences",
      items: [
        { 
          icon: Globe, 
          label: "Currency & Region", 
          description: "Set your preferred currency",
          onClick: () => setIsCurrencyDialogOpen(true)
        },
        { 
          icon: Bell, 
          label: "Notifications", 
          description: "Configure notification settings",
          onClick: () => toast.info("Notifications - Coming soon!")
        },
      ]
    },
    {
      title: "Account Management",
      items: [
        { 
          icon: SettingsIcon, 
          label: "Account Overview", 
          description: "View limits and manage accounts",
          onClick: () => setIsAccountManagementDialogOpen(true)
        },
      ]
    },
    {
      title: "Data & Privacy",
      items: [
        { 
          icon: Download, 
          label: "Export Data", 
          description: "Download your transaction history",
          onClick: () => setIsDataExportDialogOpen(true)
        },
        { 
          icon: RefreshCw, 
          label: "Manage Categories", 
          description: "Add, edit, or organize transaction categories",
          onClick: () => setIsManageCategoriesDialogOpen(true)
        },
        { 
          icon: Trash2, 
          label: "Factory Reset", 
          description: "Delete all data and leave SpendWise",
          onClick: () => setIsFactoryResetDialogOpen(true),
          danger: true
        },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-20">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Profile Card */}
        <Card className="financial-card">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{getDisplayName()}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Verified
                  </Badge>
                  <Badge 
                    variant={isPaid ? "default" : "secondary"}
                    className={`cursor-pointer hover:opacity-80 transition-opacity ${
                      isPaid ? 'bg-success hover:bg-success' : ''
                    }`}
                    onClick={() => setIsSubscriptionDialogOpen(true)}
                  >
                    {isPaid ? 'Paid Plan' : 'Free Plan'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Categories */}
        {settingsCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
            <Card>
              <CardContent className="p-0">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    <button
                      className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left ${
                        (item as any).danger ? 'hover:bg-destructive/10' : ''
                      }`}
                      onClick={item.onClick}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          (item as any).danger 
                            ? 'bg-destructive/20' 
                            : 'bg-primary/20'
                        }`}>
                          <item.icon className={`h-5 w-5 ${
                            (item as any).danger ? 'text-destructive' : 'text-primary'
                          }`} />
                        </div>
                        <div>
                          <p className={`font-medium ${
                            (item as any).danger ? 'text-destructive' : 'text-foreground'
                          }`}>{item.label}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                    {itemIndex < category.items.length - 1 && (
                      <Separator className="mx-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>About SpendWise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Version</span>
              <Badge variant="outline">1.0.0</Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <button
                className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => toast.info("Privacy Policy - Coming soon!")}
              >
                Privacy Policy
              </button>
              <button
                className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => toast.info("Terms of Service - Coming soon!")}
              >
                Terms of Service
              </button>
              <button
                className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => toast.info("Support - Coming soon!")}
              >
                Contact Support
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="p-4">
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <SubscriptionDialog
        open={isSubscriptionDialogOpen}
        onOpenChange={setIsSubscriptionDialogOpen}
      />
      
      <CurrencySettingsDialog
        open={isCurrencyDialogOpen}
        onOpenChange={setIsCurrencyDialogOpen}
      />
      
      <DataExportDialog
        open={isDataExportDialogOpen}
        onOpenChange={setIsDataExportDialogOpen}
      />
      
      <AccountManagementDialog
        open={isAccountManagementDialogOpen}
        onOpenChange={setIsAccountManagementDialogOpen}
      />

      <ManageCategoriesDialog
        open={isManageCategoriesDialogOpen}
        onOpenChange={setIsManageCategoriesDialogOpen}
      />

      <ProfileSettingsDialog
        open={isProfileSettingsDialogOpen}
        onOpenChange={setIsProfileSettingsDialogOpen}
      />

      <ChangePasswordDialog
        open={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      />

      <FactoryResetDialog
        open={isFactoryResetDialogOpen}
        onOpenChange={setIsFactoryResetDialogOpen}
      />
      
      <BottomNavigation />
    </div>
  );
};

export default Settings;