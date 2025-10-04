# Frontend Implementation Plan - AI Statement Processing

**Date**: October 2, 2025  
**Objective**: Add AI-powered statement processing to existing VaultWise frontend  
**Approach**: Minimal changes, follow existing patterns, freemium UX

---

## 🎯 Executive Summary

Add a clean, intuitive file upload feature that integrates seamlessly with the existing mobile-first dashboard. Users can upload bank statements (PDF/CSV), which are processed via the working n8n backend, with transactions automatically added to their account.

**Key Principle**: Keep it simple. Don't reinvent the wheel. Follow existing patterns.

---

## 📊 Current State Analysis

### ✅ What's Already Built

#### Frontend Architecture
- **Framework**: React 18 + TypeScript + Vite
- **State**: Zustand stores (useAuthStore, useAccountsStore, useTransactionsStore)
- **UI**: shadcn/ui components (Dialog, Card, Button, Input, Select, etc.)
- **Patterns**: 
  - Direct Supabase queries from stores
  - Toast notifications (sonner)
  - Loading states with spinners
  - Mobile-first with BottomNavigation
  - Clean async/await with try/catch

#### Existing Pages
1. **Dashboard** - Total balance, quick actions, recent transactions
2. **Accounts** - List savings/credit accounts, add/delete accounts
3. **Transactions** - List/add/edit transactions (not reviewed yet)
4. **Settings** - User preferences

#### Database State
- `user_profiles.subscription_tier` - 'free' or 'paid' (default: 'free')
- `accounts` table - Normalized view of savings + credit accounts
- `transactions` - Linked to accounts via FK
- `categories` - 10 default categories per user

#### n8n Workflow
- **Name**: "VaultWise Statement Processor - Optimized"
- **Status**: ⚠️ Inactive (needs activation)
- **Webhook**: POST `/webhook/vaultwise-process`
- **Expected Payload**:
  ```json
  {
    "user_id": "uuid",
    "file_url": "https://supabase-storage-url/path/to/file.pdf",
    "file_name": "statement.pdf"
  }
  ```
- **Response** (30-120s later):
  ```json
  {
    "account": {
      "id": "uuid",
      "label": "HDFC Bank",
      "matched": true
    },
    "summary": {
      "statement_period": {"from": "2025-05-01", "to": "2025-05-31"},
      "total_transactions": 41,
      "sum_income": 175000,
      "sum_expense": 105000
    },
    "counts": {
      "extracted": 41,
      "new": 41,
      "duplicates": 0,
      "inserted": 41
    },
    "status": "inserted"
  }
  ```
  OR error:
  ```json
  {
    "error": "Account not registered",
    "account": "HDFC Bank",
    "summary": {...}
  }
  ```

### ❌ What's Missing

1. **Supabase Storage** - No `statements` bucket configured
2. **Upload UI** - No file upload component
3. **Freemium Check** - No UI for subscription_tier validation
4. **Webhook Integration** - No frontend code to call n8n
5. **Loading States** - No UI for 30-120s processing time

---

## 🎨 UX Design

### User Flow (Paid Users)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Upload Statement" on Accounts page             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Dialog opens with:                                           │
│    - File input (PDF/CSV)                                       │
│    - Account selector dropdown (optional - AI detects)          │
│    - "Process Statement" button                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. User selects file and clicks "Process Statement"            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. File uploads to Supabase Storage (2-5s)                     │
│    - Show progress bar                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Call n8n webhook with file_url                              │
│    - Dialog shows: "Processing your statement..."              │
│    - Animated spinner + progress text                           │
│    - "This may take 30-120 seconds"                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Webhook responds (30-120s later)                            │
│    SUCCESS:                                                     │
│    - Close dialog                                               │
│    - Show success toast: "Added 41 transactions to HDFC Bank"  │
│    - Refresh accounts & transactions data                       │
│    - User sees updated balance & transactions                   │
│                                                                 │
│    ERROR:                                                       │
│    - Show error in dialog: "Account not found"                 │
│    - Suggest adding account first                              │
│    - Keep dialog open for retry                                │
└─────────────────────────────────────────────────────────────────┘
```

### User Flow (Free Users)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Upload Statement" on Accounts page             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Dialog opens with upgrade prompt:                           │
│    - "Upgrade to Premium"                                       │
│    - "AI statement processing is a premium feature"            │
│    - "Contact admin to upgrade your account"                    │
│    - "Or continue adding transactions manually"                │
└─────────────────────────────────────────────────────────────────┘
```

### Placement

#### Option 1: Accounts Page (RECOMMENDED)
- Add button next to "Add Account"
- Makes sense: statements belong to accounts
- Natural workflow: Create account → Upload statement

#### Option 2: Dashboard Quick Actions
- Add third quick action: "Upload Statement"
- Requires account selection in dialog

**Recommendation**: Start with Accounts page, add Dashboard later if needed.

---

## 🏗️ Implementation Steps

### Phase 1: Setup (Week 1, Day 1-2)

#### 1.1 Configure Supabase Storage Bucket

**Create `statements` bucket via Supabase Dashboard:**

```sql
-- Storage bucket configuration
-- Navigate to: Supabase Dashboard → Storage → Create new bucket

Bucket name: statements
Public: false (private)
File size limit: 10 MB
Allowed MIME types: 
  - application/pdf
  - text/csv
  - application/vnd.ms-excel
```

**Create RLS policies:**

```sql
-- Policy: Users can upload their own statements
CREATE POLICY "Users can upload own statements"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can read their own statements
CREATE POLICY "Users can read own statements"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own statements
CREATE POLICY "Users can delete own statements"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'statements' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### 1.2 Get n8n Webhook URL

1. Activate n8n workflow "VaultWise Statement Processor - Optimized"
2. Get production webhook URL (format: `https://[n8n-cloud-instance]/webhook/vaultwise-process`)
3. Store in `.env.local`:
   ```
   VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud/webhook/vaultwise-process
   ```

#### 1.3 Test n8n Webhook

**Test with curl:**
```bash
curl -X POST https://your-n8n-instance/webhook/vaultwise-process \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-id",
    "file_url": "https://test-url/statement.pdf",
    "file_name": "test_statement.pdf"
  }'
```

---

### Phase 2: Backend Integration (Week 1, Day 2-3)

#### 2.1 Create Statement Processing Store

**File**: `src/stores/useStatementStore.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface StatementProcessingResponse {
  account?: {
    id: string;
    label: string;
    matched: boolean;
  };
  summary?: {
    statement_period: { from: string; to: string };
    total_transactions: number;
    sum_income: number;
    sum_expense: number;
    consistency?: string;
  };
  counts?: {
    extracted: number;
    new: number;
    duplicates: number;
    inserted: number;
  };
  status?: string;
  error?: string;
}

interface StatementState {
  uploading: boolean;
  processing: boolean;
  error: string | null;
  lastResult: StatementProcessingResponse | null;

  // Actions
  uploadAndProcess: (file: File) => Promise<StatementProcessingResponse>;
  reset: () => void;
}

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export const useStatementStore = create<StatementState>()(
  devtools(
    (set) => ({
      uploading: false,
      processing: false,
      error: null,
      lastResult: null,

      uploadAndProcess: async (file: File) => {
        set({ uploading: true, processing: false, error: null });

        try {
          // 1. Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // 2. Upload file to Supabase Storage
          const fileName = `${Date.now()}_${file.name}`;
          const filePath = `${user.id}/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('statements')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // 3. Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('statements')
            .getPublicUrl(filePath);

          set({ uploading: false, processing: true });

          // 4. Call n8n webhook
          const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              file_url: publicUrl,
              file_name: file.name,
            }),
          });

          if (!response.ok) {
            throw new Error(`Webhook failed: ${response.statusText}`);
          }

          const result: StatementProcessingResponse = await response.json();

          set({ processing: false, lastResult: result });

          // 5. Cleanup: Delete uploaded file (optional)
          // Uncomment if you want to auto-delete after processing
          // await supabase.storage.from('statements').remove([filePath]);

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({ uploading: false, processing: false, error: errorMessage });
          throw error;
        }
      },

      reset: () => set({ uploading: false, processing: false, error: null, lastResult: null }),
    }),
    { name: 'statement-store' }
  )
);
```

#### 2.2 Add User Profile Store

**File**: `src/stores/useProfileStore.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  currency_symbol: string;
  subscription_tier: 'free' | 'paid';
  trial_expires_at: string | null;
  subscription_expires_at: string | null;
}

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;

  fetchProfile: () => Promise<void>;
  isPaidUser: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  devtools(
    (set, get) => ({
      profile: null,
      loading: false,

      fetchProfile: async () => {
        set({ loading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          set({ profile: data });
        } catch (error) {
          console.error('Error fetching profile:', error);
        } finally {
          set({ loading: false });
        }
      },

      isPaidUser: () => {
        const { profile } = get();
        return profile?.subscription_tier === 'paid';
      },
    }),
    { name: 'profile-store' }
  )
);
```

---

### Phase 3: UI Components (Week 1, Day 3-4)

#### 3.1 Create Upload Statement Dialog Component

**File**: `src/components/accounts/UploadStatementDialog.tsx`

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
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
  const { uploading, processing, uploadAndProcess, reset } = useStatementStore();
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
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        toast.error('Please upload a PDF or CSV file');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      const result = await uploadAndProcess(selectedFile);

      if (result.error) {
        toast.error(result.error, {
          description: result.account ? `Account: ${result.account}` : undefined,
        });
      } else {
        toast.success('Statement processed successfully!', {
          description: result.counts
            ? `Added ${result.counts.inserted} new transactions`
            : undefined,
        });

        // Refresh data
        await Promise.all([fetchAccounts(), fetchTransactions()]);

        // Close dialog
        onOpenChange(false);
        setSelectedFile(null);
        reset();
      }
    } catch (error) {
      toast.error('Failed to process statement', {
        description: error instanceof Error ? error.message : 'Unknown error',
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

  // Free user upgrade prompt
  if (!isPaid) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              AI-powered statement processing is a premium feature
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <strong>Premium Features:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Automatic transaction extraction from bank statements</li>
                  <li>• AI-powered account detection and categorization</li>
                  <li>• Smart deduplication</li>
                  <li>• Support for PDF and CSV formats</li>
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
          {/* File input */}
          {!isProcessing && (
            <div className="space-y-2">
              <Label htmlFor="statement-file">Select File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="statement-file"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={handleFileChange}
                  disabled={isProcessing}
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
            <div className="space-y-3">
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  <div>
                    <p className="font-medium">
                      {uploading ? 'Uploading file...' : 'Processing your statement...'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {processing && 'This may take 30-120 seconds'}
                    </p>
                  </div>
                </div>
              </div>
              <Progress value={uploading ? 50 : 75} className="w-full" />
            </div>
          )}

          {/* Info alert */}
          {!isProcessing && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Our AI will automatically detect the account, extract transactions, categorize them, and remove duplicates.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} variant="outline" disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isProcessing}>
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
```

---

### Phase 4: Integration (Week 1, Day 4-5)

#### 4.1 Update Accounts Page

**File**: `src/pages/Accounts.tsx`

Add import:
```typescript
import { UploadStatementDialog } from "@/components/accounts/UploadStatementDialog";
import { Upload } from "lucide-react";
import { useProfileStore } from "@/stores/useProfileStore";
```

Add state and fetch profile:
```typescript
const [isUploadOpen, setIsUploadOpen] = useState(false);
const { fetchProfile } = useProfileStore();

useEffect(() => {
  fetchAccounts();
  fetchProfile(); // Fetch user profile to check subscription
}, [fetchAccounts, fetchProfile]);
```

Update header section to add "Upload Statement" button:
```typescript
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
    <p className="text-muted-foreground">Manage your financial accounts</p>
  </div>
  
  <div className="flex items-center gap-2">
    <Button 
      size="sm" 
      variant="outline"
      className="flex items-center gap-2"
      onClick={() => setIsUploadOpen(true)}
    >
      <Upload className="h-4 w-4" />
      <span className="hidden sm:inline">Upload Statement</span>
    </Button>
    
    <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
      {/* existing Add Account dialog */}
    </Dialog>
  </div>
</div>
```

Add dialog at the end before BottomNavigation:
```typescript
<UploadStatementDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />

<BottomNavigation />
```

#### 4.2 Update Dashboard (Optional - Phase 2)

Add "Upload Statement" as a third quick action button for quick access.

---

## 🧪 Testing Plan

### Manual Testing Checklist

#### Setup Tests
- [ ] Supabase Storage bucket created and accessible
- [ ] RLS policies working (can upload/read/delete own files only)
- [ ] n8n workflow active and responding to webhook
- [ ] Environment variable `VITE_N8N_WEBHOOK_URL` set correctly

#### Free User Tests
- [ ] Free user sees "Upgrade to Premium" prompt
- [ ] Cannot upload files
- [ ] Clear message about premium feature
- [ ] Can close dialog and continue using app

#### Paid User Tests
- [ ] Can select PDF file
- [ ] Can select CSV file
- [ ] File size validation works (reject >10MB)
- [ ] File type validation works (reject non-PDF/CSV)
- [ ] Upload progress shown
- [ ] Processing spinner shown (30-120s)
- [ ] Cannot close dialog during processing

#### Success Scenarios
- [ ] Successful processing shows success toast
- [ ] Toast shows transaction count
- [ ] Accounts data refreshes
- [ ] Transactions data refreshes
- [ ] Dashboard shows updated balance
- [ ] Dialog closes automatically

#### Error Scenarios
- [ ] Account not found error shown clearly
- [ ] Network error handled gracefully
- [ ] Upload failure shows error message
- [ ] Webhook timeout handled (>120s)
- [ ] Invalid file format rejected

#### Edge Cases
- [ ] Large file (9.9MB) uploads successfully
- [ ] Multiple rapid clicks handled
- [ ] App remains functional during processing
- [ ] Can sign out during processing
- [ ] File with special characters in name

---

## 📝 Environment Setup

### Local Development

**`.env.local`**:
```bash
# Supabase (already configured)
VITE_SUPABASE_URL=https://huxhlktqxdkafbjtbwyr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# n8n Webhook (ADD THIS)
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud/webhook/vaultwise-process
```

### Testing Users

**Manually set subscription tier in Supabase:**

```sql
-- Make a user "paid" for testing
UPDATE user_profiles 
SET subscription_tier = 'paid'
WHERE id = 'your-test-user-id';

-- Reset to free
UPDATE user_profiles 
SET subscription_tier = 'free'
WHERE id = 'your-test-user-id';
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Error handling comprehensive
- [ ] Loading states polished
- [ ] Mobile responsive
- [ ] Toast messages clear and helpful

### Deployment
- [ ] Set `VITE_N8N_WEBHOOK_URL` in production env
- [ ] Verify n8n workflow active in production
- [ ] Verify Supabase Storage bucket exists
- [ ] Verify RLS policies applied
- [ ] Test with real bank statements

### Post-Deployment
- [ ] Monitor n8n execution logs
- [ ] Monitor Supabase Storage usage
- [ ] Check error rates
- [ ] Collect user feedback

---

## 🎯 Success Metrics

### Technical Metrics
- **Upload Success Rate**: >95%
- **Processing Success Rate**: >90%
- **Average Processing Time**: 30-120 seconds
- **Error Rate**: <5%

### User Experience
- **User Satisfaction**: Positive feedback on ease of use
- **Adoption Rate**: % of paid users using upload feature
- **Time Saved**: vs manual entry

---

## 🔮 Future Enhancements (Phase 2+)

### Nice-to-Have Features
1. **Multi-File Upload** - Upload multiple statements at once
2. **Processing History** - See past uploads and results
3. **Account Mapping** - Manual override if AI detection fails
4. **Transaction Preview** - Review before saving
5. **Batch Operations** - Bulk edit extracted transactions
6. **Email Upload** - Forward statements to email address
7. **Scheduled Processing** - Auto-process on schedule

### Analytics & Insights
1. **Processing Stats** - Show accuracy metrics
2. **Category Insights** - Most common categories
3. **Account Activity** - Which accounts most active

---

## 📋 File Checklist

### New Files to Create
- [ ] `src/stores/useStatementStore.ts` - Statement processing store
- [ ] `src/stores/useProfileStore.ts` - User profile store
- [ ] `src/components/accounts/UploadStatementDialog.tsx` - Upload dialog component

### Files to Modify
- [ ] `src/pages/Accounts.tsx` - Add upload button and dialog
- [ ] `.env.local` - Add n8n webhook URL
- [ ] `src/App.tsx` - (no changes needed)

### Configuration Changes
- [ ] Supabase Storage: Create `statements` bucket
- [ ] Supabase Storage: Apply RLS policies
- [ ] n8n: Activate workflow
- [ ] n8n: Get production webhook URL

---

## 💡 Key Principles

1. **Follow Existing Patterns** - Use same store structure, same UI components
2. **Mobile-First** - All dialogs and buttons work perfectly on mobile
3. **Error Handling** - Clear, actionable error messages
4. **Loading States** - Always show what's happening
5. **User Feedback** - Toast notifications for all actions
6. **Data Refresh** - Always refetch after changes
7. **Freemium UX** - Clear upgrade path, no broken features

---

**Status**: ✅ Ready to implement  
**Estimated Time**: 4-5 days for core functionality  
**Next Step**: Create Supabase Storage bucket and activate n8n workflow
