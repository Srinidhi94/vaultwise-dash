import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Upload, Lock, ChevronRight } from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { UploadStatementDialog } from '@/components/accounts/UploadStatementDialog';
import { toast } from 'sonner';

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTransactionSheet = ({ open, onOpenChange }: AddTransactionSheetProps) => {
  const { isPaidUser } = useProfileStore();
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const isPaid = isPaidUser();

  const handleManualEntry = () => {
    onOpenChange(false); // Close sheet
    // Small delay to avoid UI flicker
    setTimeout(() => setIsManualDialogOpen(true), 100);
  };

  const handleUploadStatement = () => {
    if (isPaid) {
      onOpenChange(false); // Close sheet
      setTimeout(() => setIsUploadDialogOpen(true), 100);
    } else {
      // Show upgrade prompt
      toast.info('Premium Feature', {
        description: 'Upgrade to Premium to upload bank statements and automatically extract transactions with AI.',
        duration: 5000,
      });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">Add Transaction</SheetTitle>
            <SheetDescription>
              Choose how you'd like to add your transaction
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 pb-6">
            {/* Manual Entry Option */}
            <Card
              className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary"
              onClick={handleManualEntry}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Edit className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1">Manual Entry</h3>
                    <p className="text-sm text-muted-foreground">
                      Record income or expense manually
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>

            {/* Upload Statement Option */}
            <Card
              className={`cursor-pointer transition-colors border-2 ${
                isPaid
                  ? 'hover:bg-accent/50 hover:border-primary'
                  : 'opacity-90'
              }`}
              onClick={handleUploadStatement}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    isPaid ? 'bg-success/10' : 'bg-secondary'
                  }`}>
                    {isPaid ? (
                      <Upload className="w-6 h-6 text-success" />
                    ) : (
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">Upload Statement</h3>
                      {!isPaid && (
                        <Badge variant="secondary" className="text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isPaid
                        ? 'AI-powered transaction extraction'
                        : 'Upgrade to unlock automated imports'}
                    </p>
                  </div>
                  {isPaid ? (
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manual Entry Dialog */}
      <AddTransactionDialog
        open={isManualDialogOpen}
        onOpenChange={setIsManualDialogOpen}
        onSuccess={() => {
          // Dialogs handle their own data refresh
        }}
      />

      {/* Upload Statement Dialog */}
      <UploadStatementDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
      />
    </>
  );
};
