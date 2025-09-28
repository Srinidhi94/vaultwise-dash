import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Shield, 
  Bell, 
  CreditCard, 
  Globe, 
  LogOut, 
  ChevronRight,
  Mail,
  Calendar
} from "lucide-react";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { toast } from "sonner";

const Settings = () => {
  const { user, signOut } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const settingsCategories = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile Settings", description: "Update your personal information" },
        { icon: Shield, label: "Privacy & Security", description: "Manage your security preferences" },
        { icon: Bell, label: "Notifications", description: "Configure notification settings" },
      ]
    },
    {
      title: "Financial",
      items: [
        { icon: CreditCard, label: "Payment Methods", description: "Manage linked accounts and cards" },
        { icon: Globe, label: "Currency & Region", description: "Set your preferred currency" },
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
                <h3 className="text-lg font-semibold">{user?.email}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Verified
                  </Badge>
                  {user?.created_at && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Since {formatDate(user.created_at)}
                    </Badge>
                  )}
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
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => toast.info(`${item.label} - Coming soon!`)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.label}</p>
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
            <CardTitle>About VaultWise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Version</span>
              <Badge variant="outline">1.0.0</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Built with</span>
              <Badge variant="outline">Lovable</Badge>
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
      
      <BottomNavigation />
    </div>
  );
};

export default Settings;