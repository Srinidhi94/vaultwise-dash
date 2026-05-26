import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, ChevronRight } from 'lucide-react';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTransactionSheet = ({ open, onOpenChange }: AddTransactionSheetProps) => {
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);

  const handleManualEntry = () => {
    onOpenChange(false); // Close sheet
    // Small delay to avoid UI flicker
    setTimeout(() => setIsManualDialogOpen(true), 100);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">Add Transaction</SheetTitle>
            <SheetDescription>
              Record an income or expense for one of your accounts
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 pb-6">
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

            <p className="text-xs text-muted-foreground text-center pt-2">
              To auto-import transactions, connect a bank account from the Accounts page (Premium).
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <AddTransactionDialog
        open={isManualDialogOpen}
        onOpenChange={setIsManualDialogOpen}
        onSuccess={() => {
          // Dialogs handle their own data refresh
        }}
      />
    </>
  );
};
