import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Loader2, CheckCircle2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { useStatementStore } from '@/stores/useStatementStore';
import { useAccountsStore } from '@/stores/useAccountsStore';
import { useTransactionsStore } from '@/stores/useTransactionsStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { toast } from 'sonner';

interface UploadStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadStatementDialog = ({ open, onOpenChange }: UploadStatementDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploading, processing, stage, progress, uploadAndProcess, reset } = useStatementStore();
  const { fetchAccounts } = useAccountsStore();
  const { fetchTransactions } = useTransactionsStore();
  const { isPaidUser } = useProfileStore();

  const isProcessing = uploading || processing;
  const isPaid = isPaidUser();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel'];
      const isValidType = validTypes.includes(file.type) || file.name.endsWith('.csv');
      
      if (!isValidType) {
        toast.error('Invalid file type', {
          description: 'Please upload a PDF or CSV file',
        });
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large', {
          description: 'File size must be less than 10MB',
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('No file selected', {
        description: 'Please select a file to upload',
      });
      return;
    }

    try {
      const result = await uploadAndProcess(selectedFile);

      if (result.error) {
        toast.error('Processing failed', {
          description: result.error,
        });
      } else {
        const transactionCount = result.counts?.inserted || 0;
        const accountName = result.account?.label || 'your account';
        
        toast.success('Statement processed successfully!', {
          description: `Added ${transactionCount} new transaction${transactionCount !== 1 ? 's' : ''} to ${accountName}`,
        });

        // Refresh data
        await Promise.all([fetchAccounts(), fetchTransactions()]);

        // Close dialog and reset
        onOpenChange(false);
        setSelectedFile(null);
        reset();
      }
    } catch (error) {
      toast.error('Failed to process statement', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
      setSelectedFile(null);
      reset();
    }
  };

  const getStageMessage = () => {
    switch (stage) {
      case 'uploading':
        return 'Uploading securely...';
      case 'analyzing':
        return 'AI analyzing your statement...';
      case 'extracting':
        return 'Extracting transactions...';
      case 'saving':
        return 'Saving to your account...';
      default:
        return 'Processing...';
    }
  };

  const getStageIcon = () => {
    switch (stage) {
      case 'uploading':
        return <Upload className="w-12 h-12 text-primary animate-pulse" />;
      case 'analyzing':
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
      case 'extracting':
        return <Sparkles className="w-12 h-12 text-primary animate-pulse" />;
      case 'saving':
        return <CheckCircle2 className="w-12 h-12 text-primary animate-pulse" />;
      default:
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
    }
  };

  // Free user upgrade prompt
  if (!isPaid) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              AI-powered statement processing is a premium feature
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-purple-200 bg-purple-50">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <AlertDescription>
                <strong className="text-purple-900">Premium Features:</strong>
                <ul className="mt-2 space-y-1.5 text-sm text-purple-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Automatic transaction extraction from bank statements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>AI-powered account detection and categorization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Smart duplicate detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Support for PDF and CSV formats</span>
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-secondary/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Contact your administrator to upgrade your account to premium, or continue adding transactions manually.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} variant="outline">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Paid user upload interface
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Bank Statement
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or CSV bank statement to automatically extract transactions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Security message */}
          {!isProcessing && (
            <Alert className="border-blue-200 bg-blue-50">
              <Lock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>🔒 Secure Processing:</strong> Your data is encrypted and not stored. Files are deleted immediately after processing.
              </AlertDescription>
            </Alert>
          )}

          {/* File input */}
          {!isProcessing && (
            <div className="space-y-2">
              <Label htmlFor="statement-file" className="text-base">Select File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="statement-file"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-center space-y-4">
                  {getStageIcon()}
                  <div>
                    <p className="font-medium text-lg">{getStageMessage()}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stage === 'analyzing' && 'This may take 30-90 seconds'}
                      {stage === 'extracting' && 'Detecting account and categories'}
                      {stage === 'saving' && 'Removing duplicates'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={progress} className="w-full h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {progress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Info alert for non-processing state */}
          {!isProcessing && selectedFile && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Our AI will automatically detect the account, extract transactions, categorize them, and remove duplicates.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            onClick={handleClose} 
            variant="outline" 
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isProcessing}
            className="min-w-[140px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Process Statement
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
