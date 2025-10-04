# Frontend Implementation Guide - Statement Upload Feature

**Version**: 2.0 (Simplified & Security-Enhanced)  
**Date**: October 2, 2025  
**Ready for**: Windsurf AI-assisted development

> 📖 **For detailed dev guidelines**: See `WINDSURF_GUIDELINES.md` in root folder

---

## 🎯 Objective

Add AI-powered bank statement processing to the Accounts page with:
- ✅ Secure temporary file storage (auto-delete after processing)
- ✅ 4-stage animated progress indicator (30-120s)
- ✅ Freemium UX (free users see upgrade prompt)
- ✅ Mobile-first responsive design
- ✅ Professional financial app UI/UX

---

## 🔐 Security Requirements (CRITICAL)

### **DO NOT Store Bank Statements Permanently**

**Flow**:
```
1. Upload file → Supabase Storage (temp location)
2. Generate signed URL (valid 5 minutes)
3. Call n8n webhook with URL
4. n8n downloads and processes
5. DELETE file immediately (success or error)
6. Show results to user
```

**User Messaging**:
- Show 🔒 icon next to "Upload Statement" button
- In dialog: "🔒 Your data is encrypted and not stored"
- Trust signal: "Files are deleted immediately after processing"

---

## 🎨 UX Design Principles

### Color Psychology (Financial Apps)
- **Blue** (#3B82F6): Trust, security, processing → Primary actions
- **Green** (#10B981): Success, positive → Success states
- **Amber** (#F59E0B): Warning, attention → Warnings
- **Red** (#EF4444): Error, danger → Error states
- **Purple** (#8B5CF6): Premium → Freemium prompts

### Progress Indicators (Nielsen Norman Group)
For processes >10 seconds:
1. ✅ Show what's happening NOW (not just "loading")
2. ✅ Show estimated time remaining
3. ✅ Break into stages with visual progress
4. ✅ Use animations to show activity
5. ✅ Keep user engaged, reduce anxiety

### Mobile-First
- Minimum touch target: 44x44px
- Minimum text size: 16px
- Bottom sheet style dialogs
- Large, clear buttons
- Readable progress messages

---

## 📊 User Flows

### Paid User Flow

```
Accounts Page
    ↓
[🔒 Upload Statement] button
    ↓
Dialog Opens
├─ "🔒 Your data is encrypted and not stored"
├─ File input (drag-drop support)
├─ File validation (PDF/CSV, <10MB)
└─ [Process Statement] button
    ↓
Processing (4 stages with animations):
├─ 1. Uploading... (⬆️ 25% blue)
├─ 2. Analyzing... (🔍 50% blue, "30-60 seconds")
├─ 3. Extracting... (✨ 75% blue, "Detecting account")
└─ 4. Saving... (💾 90% blue, "Removing duplicates")
    ↓
Success (✓ green):
├─ Summary card (2s display)
│   ├─ "Account: HDFC Bank"
│   ├─ "Period: May 2025"
│   ├─ "Added: 41 new transactions"
│   └─ "Duplicates: 0"
├─ Toast: "✓ Added 41 transactions to HDFC Bank"
├─ File deleted from storage
├─ Data refreshed
└─ Dialog closes
    ↓
Dashboard updated with new data
```

### Free User Flow

```
Accounts Page
    ↓
[Upload Statement] button (with ✨ badge)
    ↓
Upgrade Prompt Dialog
├─ "✨ Upgrade to Premium"
├─ Premium features list (✓ bullets)
├─ "Contact admin to upgrade"
└─ [Maybe Later] button
```

---

## 🏗️ Implementation Steps

### Phase 1: Setup (1 hour)

**1. Configure Supabase Storage**
- Create `statements` bucket (private, 10MB limit, PDF/CSV only)
- Set lifecycle rule: Auto-delete files older than 1 hour
- Apply RLS policies (user isolation)

**2. Activate n8n Workflow**
- Turn on "VaultWise Statement Processor - Optimized"
- Get webhook URL
- Add to `.env.local`: `VITE_N8N_WEBHOOK_URL=...`

**3. Test Setup**
- Test webhook with curl
- Verify file upload/delete works
- Create test user with `subscription_tier = 'paid'`

### Phase 2: Backend Stores (2-3 hours)

**File 1**: `src/stores/useStatementStore.ts`
```
Purpose: Handle file upload, n8n webhook call, processing states
Key functions:
- uploadAndProcess(file: File)
- deleteFile(path: string)
- Track stages: uploading → analyzing → extracting → saving
- Track progress: 0% → 25% → 50% → 75% → 90% → 100%
- Handle errors gracefully
Pattern: Follow useAccountsStore.ts structure
```

**File 2**: `src/stores/useProfileStore.ts`
```
Purpose: Fetch user profile, check subscription tier
Key functions:
- fetchProfile()
- isPaidUser() → boolean
Used for: Freemium checks in upload dialog
Pattern: Follow useAuthStore.ts structure
```

### Phase 3: UI Component (3-4 hours)

**File 3**: `src/components/accounts/UploadStatementDialog.tsx`
```
Purpose: Upload dialog with freemium logic and progress UI
Components used:
- Dialog, DialogContent, DialogHeader (shadcn/ui)
- Button, Input, Progress (shadcn/ui)
- Alert (for security messaging)
- Icons: Upload, Lock, Sparkles, Loader2, CheckCircle2

Free User View:
- Purple gradient header
- ✨ Sparkles icon
- Premium features list
- "Contact admin" CTA

Paid User View:
- File input with validation
- Security badge: "🔒 Secure processing"
- 4-stage animated progress
- Success summary or error handling
- Toast notifications

Mobile responsive:
- Max width on desktop
- Full width on mobile
- Large touch targets
- Readable 16px+ text

Pattern: Reference src/pages/Accounts.tsx (Add Account dialog)
```

### Phase 4: Integration (1-2 hours)

**Modify**: `src/pages/Accounts.tsx`
```
Changes needed:
1. Import UploadStatementDialog component
2. Import useProfileStore
3. Add state: isUploadOpen
4. Fetch profile on mount: fetchProfile()
5. Add button in header:
   <Button onClick={() => setIsUploadOpen(true)}>
     <Lock className="h-4 w-4" />
     Upload Statement
   </Button>
6. Add dialog before BottomNavigation:
   <UploadStatementDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />

Mobile: Button shows icon only on small screens
Desktop: Button shows icon + text
```

---

## 🧪 Testing Checklist

### Setup Verification
- [ ] Storage bucket exists and configured
- [ ] RLS policies prevent cross-user access
- [ ] n8n webhook responds to test request
- [ ] Environment variable set correctly

### Free User Tests
- [ ] See upgrade prompt (no file upload)
- [ ] Premium features listed clearly
- [ ] Can close and continue using app
- [ ] Button shows premium badge

### Paid User Tests
- [ ] Can select PDF file
- [ ] Can select CSV file
- [ ] Reject >10MB files with clear error
- [ ] Reject non-PDF/CSV with clear error
- [ ] Upload progress shown (25%)
- [ ] Processing stages shown (50% → 75% → 90%)
- [ ] Cannot close dialog during processing
- [ ] File deleted after processing

### Success Flow
- [ ] Success summary shows for 2s
- [ ] Toast shows transaction count
- [ ] Data refreshes automatically
- [ ] Dialog closes automatically
- [ ] Dashboard shows updated balance

### Error Handling
- [ ] Account not found → Clear message + action button
- [ ] Network error → Retry option
- [ ] Timeout (>120s) → Clear error
- [ ] File upload fails → Error message

### Mobile Testing
- [ ] Touch targets minimum 44px
- [ ] Text readable (16px+)
- [ ] Dialog fits mobile screen
- [ ] Progress messages clear
- [ ] Buttons accessible

---

## 🎓 Development Guidelines

### Before Coding
1. Read `WINDSURF_GUIDELINES.md` (comprehensive patterns)
2. Review `CURRENT_STATUS.md` (current state)
3. Look at existing code patterns

### Code Style
- Follow existing Zustand store patterns
- Use shadcn/ui components only
- TypeScript interfaces for all props
- Error handling with toast notifications
- Loading states for all async operations

### Security Checklist
- [ ] Never store files permanently
- [ ] Always delete after processing
- [ ] Show security messaging to users
- [ ] Use RLS for user isolation
- [ ] Validate file type and size

### UX Checklist
- [ ] 4-stage progress indicator
- [ ] Estimated time shown
- [ ] Clear error messages with actions
- [ ] Success feedback with details
- [ ] Mobile-responsive design

---

## 🚀 Ready to Code

**Prerequisites Complete:**
- ✅ Supabase Storage bucket created
- ✅ n8n workflow activated
- ✅ Environment variable set
- ✅ Test user with paid subscription

**Files to Create:**
1. `src/stores/useStatementStore.ts`
2. `src/stores/useProfileStore.ts`
3. `src/components/accounts/UploadStatementDialog.tsx`

**Files to Modify:**
1. `src/pages/Accounts.tsx`

**Estimated Time:** 6-8 hours total for full feature

---

## 📚 Reference Materials

- **Component Patterns**: `src/pages/Accounts.tsx` (Add Account dialog)
- **Store Patterns**: `src/stores/useAccountsStore.ts`
- **Toast Usage**: Throughout existing codebase
- **Code Guidelines**: `WINDSURF_GUIDELINES.md`
- **Current Status**: `CURRENT_STATUS.md`

---

**Status**: ✅ Ready for Windsurf AI development  
**Security**: ✅ Enhanced - no permanent file storage  
**UX**: ✅ Enhanced - 4-stage progress, professional design  
**Next**: Start coding with Windsurf following patterns in WINDSURF_GUIDELINES.md
