import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { toast } from "sonner";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSettingsDialog = ({
  open,
  onOpenChange,
}: ProfileSettingsDialogProps) => {
  const { user } = useAuthStore();
  const { profile, updateDisplayName, getDisplayName } = useProfileStore();
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }

    if (displayName.length > 50) {
      toast.error("Display name must be 50 characters or less");
      return;
    }

    setIsSaving(true);
    try {
      await updateDisplayName(displayName.trim());
      toast.success("Profile updated successfully!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </DialogTitle>
          <DialogDescription>
            Update your profile information and display preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-secondary/50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown throughout the app. {displayName.length}/50 characters.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !displayName.trim()}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
