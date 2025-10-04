# VaultWise Mobile UX & Settings Enhancement Plan

## Executive Summary
Comprehensive plan to enhance mobile experience with unified transaction entry flow, simplified settings page, and improved mobile UI. Focus on seamless UX without overengineering.

**Generated**: 2025-10-02
**Status**: Ready for Implementation

---

## 🎯 CORE REQUIREMENTS

### 1. Unified Transaction Entry Experience
- **Single entry point** for adding transactions (manual or file upload)
- **Paid users**: Choose between "Manual Entry" or "Upload Statement"
- **Free users**: Only "Manual Entry" with elegant upgrade nudge for file upload
- **Seamless integration**: Works from both + button (FAB) and Transactions page
- **No code duplication**: Reuse existing dialogs

### 1.5 Transaction Filtering & Editing
- **Comprehensive filters**: Date range, account, category, transaction type (income/expense)
- **Date range**: Presets (Today, Last 7/30 days, This/Last Month) + custom range picker
- **Account filter**: All accounts, specific savings accounts, specific credit cards
- **Category filter**: All categories or specific category
- **Type filter**: All, Income only, Expense only
- **Edit transactions**: Allow editing description, category, notes, type (lock date, amount, account)
- **No totals on Transactions page**: Keep focused on filtering and finding transactions
- **Dashboard has all visuals**: Charts and metrics with month/date selector

### 2. Settings Page Simplification
- **Remove**: "Payment Methods" section, "Since [date]" badge, "Built with Lovable" reference
- **Add**: Prominent subscription tier display (Free/Premium) with upgrade CTA
- **Simplify**: Focus on actionable settings only
- **Clean up**: Remove redundant navigation links

### 3. Mobile UI Improvements
- Fix contrast issues on stat cards
- Standardize mobile headers
- Improve transaction list display
- Add proper safe area handling (iOS notch, gesture bars)
- Ensure bottom nav doesn't cut off content

### 4. Remove Lovable References
- Settings page "Built with" badge
- index.html meta tags
- README.md acknowledgments
- Any other references throughout codebase

---

## 📐 DESIGN PRINCIPLES

1. **Mobile-First**: Design for thumb zones, touch targets minimum 44×44px
2. **Progressive Disclosure**: Show features locked for free users (creates desire)
3. **One-Tap Actions**: Primary actions should be immediately accessible
4. **Consistent Patterns**: Follow established shadcn/ui and Material Design patterns
5. **No Overengineering**: Reuse existing components, thin orchestration layers only

---

## 🏗️ COMPONENT ARCHITECTURE

### New Components to Create

#### 1. AddTransactionSheet
**Location**: `src/components/transactions/AddTransactionSheet.tsx`

**Purpose**: Bottom sheet (mobile drawer) that shows transaction entry options

**Props**:
```typescript
interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Behavior**:
- Renders shadcn Sheet component (native mobile feel)
- Shows 2 options for paid users, 1 + upgrade card for free
- Orchestrates opening of child dialogs
- No business logic - pure UI orchestration

**Layout**:
```
Sheet Header: "Add Transaction"
└─ Option 1: Manual Entry
   ├─ Icon: Edit/PenSquare
   ├─ Title: "Manual Entry"
   ├─ Description: "Add a transaction manually"
   └─ Click → Opens AddTransactionDialog

└─ Option 2: Upload Statement
   ├─ Icon: Upload + Lock (if free user)
   ├─ Title: "Upload Statement"
   ├─ Description: "AI-powered extraction" (paid) / "Premium Feature" (free)
   └─ Click → Opens UploadStatementDialog (paid) or Upgrade prompt (free)
```

---

#### 2. AddTransactionDialog
**Location**: `src/components/transactions/AddTransactionDialog.tsx`

**Purpose**: Extract existing manual transaction form into reusable dialog

**Current State**: Form is inline in Transactions.tsx (lines 135-270)

**Action**: Extract to separate component

**Props**:
```typescript
interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // Callback after successful addition
}
```

**Changes from existing code**:
- Move all form state and logic into component
- Keep exact same fields and validation
- Add onSuccess callback for parent notification
- No functional changes - pure extraction

---

#### 3. FloatingActionButton (FAB)
**Location**: `src/components/ui/floating-action-button.tsx`

**Purpose**: Reusable FAB component for primary actions

**Props**:
```typescript
interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  ariaLabel: string;
  className?: string;
}
```

**Styling**:
```css
position: fixed
bottom: 80px (clear of bottom nav)
right: 16px
z-index: 40 (below dialogs, above content)
size: 56px × 56px
shadow: elevated
animation: hover scale
```

**Accessibility**:
- Keyboard accessible (Tab + Enter)
- Screen reader friendly
- Visible focus ring
- aria-label required

---

#### 4. TransactionFilters
**Location**: `src/components/transactions/TransactionFilters.tsx`

**Purpose**: Comprehensive filtering controls for transactions page

**Props**:
```typescript
interface TransactionFiltersProps {
  // All state managed by useTransactionsStore
}
```

**Features**:
- Date range selector (presets + custom)
- Account dropdown (all/specific)
- Category dropdown  
- Transaction type toggle (all/income/expense)
- Clear all filters button
- Active filter count badge

**Layout**: Collapsible Card on mobile, always visible on desktop

---

#### 5. EditTransactionDialog
**Location**: `src/components/transactions/EditTransactionDialog.tsx`

**Purpose**: Edit existing transaction details

**Props**:
```typescript
interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess?: () => void;
}
```

**Editable Fields**:
- description (text input)
- category_id (select)
- notes (textarea)
- transaction_type (income/expense toggle)

**Locked Fields** (display only with note):
- transaction_date
- amount
- account_id
- Note: "To change these fields, delete and re-add the transaction"

---

#### 6. SubscriptionCard
**Location**: `src/components/settings/SubscriptionCard.tsx`

**Purpose**: Prominent display of subscription status in Settings

**Layout**:
```
Card (gradient background based on tier)
├─ Badge: "Free Tier" or "Premium"
├─ Title: Tier name
├─ Description: Features summary
├─ If Free:
│  ├─ Feature list with lock icons
│  └─ "Upgrade to Premium" button
└─ If Premium:
   ├─ "Active" status
   ├─ Expiry date (if applicable)
   └─ "Manage Subscription" button
```

**Data Source**: `useProfileStore().subscription_tier`

---

### Updated Components

#### 5. Transactions.tsx
**Changes**:
- Remove inline Dialog code (lines 135-270)
- Import AddTransactionSheet
- Replace "Add Transaction" button click with sheet open
- Keep all other logic unchanged

**Before**:
```tsx
<Button onClick={() => setIsAddTransactionOpen(true)}>
  Add Transaction
</Button>
<Dialog>...</Dialog> // Inline form
```

**After**:
```tsx
<Button onClick={() => setIsAddSheetOpen(true)}>
  Add Transaction
</Button>
<AddTransactionSheet 
  open={isAddSheetOpen} 
  onOpenChange={setIsAddSheetOpen} 
/>
```

---

#### 6. Dashboard.tsx
**Changes**:
- Add FAB component
- Remove "Add Transaction" from Quick Actions (redundant with FAB)
- Keep rest of page unchanged

**Addition**:
```tsx
<FloatingActionButton 
  onClick={() => setIsAddSheetOpen(true)}
  ariaLabel="Add transaction"
/>
<AddTransactionSheet 
  open={isAddSheetOpen} 
  onOpenChange={setIsAddSheetOpen} 
/>
```

---

#### 7. Settings.tsx
**Complete Redesign**:

**Remove**:
- Lines 86-91: "Since [date]" badge
- Lines 57-58: "Payment Methods" item from Financial section
- Lines 142-144: "Built with Lovable" badge

**Add** (at top, after profile card):
- SubscriptionCard component

**Restructure**:
```tsx
// New structure
<SubscriptionCard /> // NEW - prominent position

<Section title="Account">
  - Profile Settings
  - Privacy & Security
  - Notifications
</Section>

<Section title="Preferences">
  - Currency & Region (moved from Financial)
  - [Future: Theme, Language]
</Section>

<Section title="About">
  - Version: 1.0.0
  - Support & Feedback
  - Terms & Privacy
</Section>

<Sign Out Button>
```

---

#### 8. UploadStatementDialog.tsx
**Changes**: None required
- Already a controlled component
- Just needs to be imported in new locations
- Works as-is

---

#### 9. Accounts.tsx
**Changes**:
- **Remove**: "Upload Statement" button from header (lines 108-117)
- **Reason**: Moved to unified transaction entry experience
- **Note**: Keep "Add Account" button

---

## 📱 MOBILE UI IMPROVEMENTS

### Safe Area Handling

**Issue**: iOS devices with notch/dynamic island and gesture bars need safe area handling

**Solution**: Update root layout wrapper

**File**: `src/App.tsx` or individual page wrappers

**CSS Addition**:
```css
.page-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

**Also update**: `index.html` meta tags
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

---

### Stats Cards Contrast Fix

**File**: `src/components/dashboard/StatsCards.tsx`

**Current Issue**: White/colored text directly on gradient backgrounds = poor contrast

**Solution Options**:

**Option A** (Recommended): Add semi-transparent overlay
```tsx
<CardContent className={`p-4 relative ${stat.gradient}`}>
  <div className="absolute inset-0 bg-black/10 rounded-lg" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</CardContent>
```

**Option B**: Use solid backgrounds with gradient border
```tsx
<Card className="border-2 border-transparent bg-gradient-to-r from-primary to-primary-600">
  <CardContent className="bg-card p-4">
    {/* Content with normal text colors */}
  </CardContent>
</Card>
```

**Option C**: Remove gradients entirely, use semantic colors
```tsx
<Card className="bg-card border-l-4 border-success">
  <CardContent className="p-4">
    {/* High contrast by default */}
  </CardContent>
</Card>
```

**Recommendation**: Start with Option A (minimal change), if still poor contrast, move to Option C

---

### Transaction List Enhancement

**File**: `src/pages/Transactions.tsx` (lines 326-381)

**Current**: Shows icon, description, category badge, date, amount, delete button

**Enhancement**: Improve mobile layout and information hierarchy

**Changes**:
```tsx
<Card key={transaction.id} className="financial-card">
  <CardContent className="p-3 sm:p-4"> {/* Reduce padding on mobile */}
    <div className="flex items-start justify-between gap-3"> {/* items-start for multiline */}
      <div className="flex items-start space-x-2 flex-1 min-w-0"> {/* space-x-2 tighter */}
        {/* Icon */}
        <div className={`p-2 rounded-full shrink-0 ${...}`}>
          {/* ... */}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm sm:text-base">
            {transaction.description}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-xs">
              {category?.name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
              {/* Show full date, not just created_at */}
            </span>
            {transaction.account_type && (
              <Badge variant="secondary" className="text-xs">
                {transaction.account_type === 'savings' ? '💰' : '💳'}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Amount and Actions */}
      <div className="flex flex-col items-end gap-2 shrink-0"> {/* Stack on mobile */}
        <div className={`text-base sm:text-lg font-semibold whitespace-nowrap ${...}`}>
          {transaction.transaction_type === 'income' ? '+' : '-'}
          {formatCurrency(Math.abs(transaction.amount))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteTransaction(transaction.id)}
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

**Key Improvements**:
- Tighter spacing on mobile
- Better text sizing with responsive classes
- Shows actual transaction_date instead of created_at
- Account type indicator emoji badge
- Improved touch targets

---

### Bottom Navigation Safe Area

**File**: `src/components/layout/BottomNavigation.tsx`

**Add**:
```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 pb-safe">
  {/* existing content */}
</nav>
```

**And in CSS** (`index.css`):
```css
.pb-safe {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}
```

---

## 🔒 SUBSCRIPTION TIER INTEGRATION

### useProfileStore Enhancement

**File**: `src/stores/useProfileStore.ts`

**Verify** these methods exist (they should based on earlier code):
```typescript
interface ProfileStore {
  subscription_tier: 'free' | 'premium';
  isPaidUser: () => boolean;
  // ...
}
```

**If missing, add**:
```typescript
isPaidUser: () => {
  const { subscription_tier, subscription_expires_at } = get();
  if (subscription_tier === 'premium') {
    // Check if not expired
    if (subscription_expires_at) {
      return new Date(subscription_expires_at) > new Date();
    }
    return true; // No expiry = lifetime
  }
  return false;
},
```

---

## 🧹 REMOVE LOVABLE REFERENCES

### Files to Update:

#### 1. Settings.tsx
**Line 142-144**: Remove
```tsx
// REMOVE THIS:
<div className="flex justify-between items-center">
  <span className="text-sm text-muted-foreground">Built with</span>
  <Badge variant="outline">Lovable</Badge>
</div>
```

---

#### 2. index.html
**Check and update**:
```html
<!-- Current (check exact content) -->
<title>VaultWise - Personal Finance Dashboard</title>
<meta name="description" content="VaultWise Finance Dashboard" />

<!-- If any Lovable references exist in meta tags or comments, remove them -->
```

---

#### 3. README.md
**Update**: Remove any "Built with Lovable" or similar acknowledgments
- Keep project description
- Keep tech stack info
- Remove attribution to Lovable platform

---

#### 4. package.json
**Line check**: `"name": "vaultwise-dash"` (should be fine)
- If homepage or description mentions Lovable, update

---

#### 5. finance-app-lovable-prompt.md
**Action**: This file is the original prompt, can keep for reference or delete
- Not visible to end users
- Up to user preference

---

## 📦 IMPLEMENTATION PHASES

### Phase A: Component Extraction & Setup (2 hours)
**Priority**: P0 - Foundation

**Tasks**:
1. Create `AddTransactionDialog.tsx` by extracting from Transactions.tsx
2. Create `FloatingActionButton.tsx` component
3. Create `AddTransactionSheet.tsx` component
4. Create `SubscriptionCard.tsx` component

**Acceptance Criteria**:
- [ ] All components compile without errors
- [ ] AddTransactionDialog maintains existing functionality
- [ ] FAB renders correctly with proper styling
- [ ] AddTransactionSheet shows appropriate options based on user tier

---

### Phase B: Integration & Wiring (2 hours)
**Priority**: P0 - Core Functionality

**Tasks**:
1. Update Transactions.tsx to use new components
2. Update Dashboard.tsx to add FAB
3. Remove upload button from Accounts.tsx
4. Wire up subscription checks in AddTransactionSheet

**Acceptance Criteria**:
- [ ] Transactions page works identically to before
- [ ] FAB visible on Dashboard and Transactions pages
- [ ] Clicking FAB opens AddTransactionSheet
- [ ] Sheet correctly shows options based on subscription tier
- [ ] Manual entry flow works end-to-end
- [ ] File upload flow works for paid users
- [ ] Free users see upgrade prompt when attempting upload

---

### Phase C: Settings Page Redesign (1.5 hours)
**Priority**: P1 - High

**Tasks**:
1. Add SubscriptionCard to Settings page
2. Remove "Payment Methods" section
3. Remove "Since [date]" badge
4. Remove "Built with Lovable" badge
5. Reorganize sections

**Acceptance Criteria**:
- [ ] Subscription status prominently displayed at top
- [ ] Free users see upgrade CTA
- [ ] Premium users see active status
- [ ] Settings are simplified and focused
- [ ] No broken links or UI glitches

---

### Phase D: Mobile UI Polish (2 hours)
**Priority**: P1 - High

**Tasks**:
1. Fix stats cards contrast (try Option A first)
2. Add safe area handling to layouts
3. Update BottomNavigation with safe area padding
4. Enhance transaction list items per spec
5. Test on various mobile viewports

**Acceptance Criteria**:
- [ ] All text meets WCAG AA contrast (4.5:1 minimum)
- [ ] No content cut off by notches or gesture bars
- [ ] Transaction list readable and well-spaced on mobile
- [ ] Touch targets are appropriately sized (44×44px min)

---

### Phase E: Remove Lovable References (0.5 hours)
**Priority**: P2 - Medium

**Tasks**:
1. Update Settings.tsx
2. Check and update index.html
3. Update README.md
4. Check package.json
5. Search entire codebase for any remaining references

**Command**:
```bash
grep -r -i "lovable" --exclude-dir=node_modules --exclude-dir=.git
```

**Acceptance Criteria**:
- [ ] No "Lovable" references in user-visible UI
- [ ] Documentation updated
- [ ] App feels fully branded as VaultWise

---

### Phase F: Testing & Documentation (1 hour)
**Priority**: P2 - Medium

**Tasks**:
1. Manual testing on mobile simulator (iPhone 14, Pixel 7)
2. Test all user flows:
   - Free user attempting to upload statement
   - Paid user uploading statement
   - Manual transaction entry from both pages
   - Settings page navigation
3. Update documentation
4. Create changelog entry

**Acceptance Criteria**:
- [ ] All flows work smoothly on mobile
- [ ] No console errors
- [ ] Performance is acceptable (<3s to interactive)
- [ ] Documentation reflects new features
- [ ] Ready for production deployment

---

## 🎨 VISUAL DESIGN SPECS

### Color Palette (from existing theme)
```
Primary Blue: hsl(221, 83%, 53%)
Success Green: hsl(142, 76%, 36%)
Warning/Expense Red: hsl(0, 84%, 60%)
Background: hsl(220, 23%, 95%)
Card: hsl(0, 0%, 100%)
```

### FAB Styling
```css
.fab {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: hsl(221, 83%, 53%);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
}

.fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.fab:active {
  transform: scale(0.95);
}
```

### AddTransactionSheet Option Card
```tsx
<button className="w-full p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all">
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <div className="flex-1 text-left">
      <h3 className="font-semibold text-base">Option Title</h3>
      <p className="text-sm text-muted-foreground">Description</p>
    </div>
    {isLocked && <Lock className="w-5 h-5 text-muted-foreground" />}
  </div>
</button>
```

### SubscriptionCard
```tsx
// Free Tier
<Card className="bg-gradient-to-br from-secondary to-secondary/50 border-2">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Free Tier</CardTitle>
      <Badge variant="outline">Free</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <ul className="space-y-2 text-sm">
      <li className="flex items-center gap-2">
        <Check className="w-4 h-4 text-success" />
        Manual transaction entry
      </li>
      <li className="flex items-center gap-2 text-muted-foreground">
        <Lock className="w-4 h-4" />
        AI-powered statement upload
      </li>
    </ul>
    <Button className="w-full mt-4" variant="default">
      Upgrade to Premium
    </Button>
  </CardContent>
</Card>

// Premium Tier
<Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/50">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Premium</CardTitle>
      <Badge className="bg-primary">Active</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground mb-4">
      All features unlocked
    </p>
    <Button className="w-full" variant="outline">
      Manage Subscription
    </Button>
  </CardContent>
</Card>
```

---

## 📊 TECHNICAL SPECIFICATIONS

### Component File Structure
```
src/
├── components/
│   ├── transactions/
│   │   ├── AddTransactionDialog.tsx ← NEW
│   │   ├── AddTransactionSheet.tsx ← NEW
│   │   └── TransactionList.tsx (future extraction)
│   ├── settings/
│   │   └── SubscriptionCard.tsx ← NEW
│   └── ui/
│       └── floating-action-button.tsx ← NEW
```

### State Management Flow
```
AddTransactionSheet (local state)
  ├─ isManualDialogOpen: boolean
  ├─ isUploadDialogOpen: boolean
  └─ isPaid: boolean (from useProfileStore)
  
  Orchestrates:
  ├─→ AddTransactionDialog
  │    └─ useTransactionsStore (add transaction)
  └─→ UploadStatementDialog
       └─ useStatementStore (upload & process)
```

### Props Interface Summary
```typescript
// AddTransactionSheet.tsx
interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// AddTransactionDialog.tsx
interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// FloatingActionButton.tsx
interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  ariaLabel: string;
  className?: string;
}

// SubscriptionCard.tsx
interface SubscriptionCardProps {
  // No props needed - reads from store
}
```

---

## ⚠️ EDGE CASES & ERROR HANDLING

### Edge Case 1: Subscription Changes While Sheet Open
**Scenario**: User upgrades to premium while AddTransactionSheet is open

**Solution**: Zustand store is reactive, component will re-render automatically

**Test**: Open sheet as free user → upgrade in another tab → verify sheet updates

---

### Edge Case 2: Network Error During Subscription Check
**Scenario**: Unable to fetch user profile

**Solution**: Graceful degradation to free tier features
```typescript
const isPaid = useProfileStore(state => state.isPaidUser()) ?? false;
// If error/undefined, defaults to false (free tier)
```

---

### Edge Case 3: FAB Overlapping with Toasts
**Scenario**: Toast notification appears near FAB

**Solution**: Z-index layering
- FAB: z-40
- Toasts (sonner): z-50 (default)
- Dialogs/Sheets: z-50

---

### Edge Case 4: Deep Link to Transaction Entry
**Scenario**: User navigates to app via URL with intent to add transaction

**Future Enhancement**: Support URL parameter like `?action=add-transaction`
```typescript
// In Dashboard or Transactions page
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'add-transaction') {
    setIsAddSheetOpen(true);
  }
}, []);
```

---

### Edge Case 5: Offline Mode
**Scenario**: User tries to upload statement while offline

**Current**: Network error from fetch
**Enhancement** (future): Check navigator.onLine first, show helpful message

---

## 🧪 TESTING CHECKLIST

### Manual Testing

#### Free User Flow
- [ ] Open app as free user
- [ ] Click FAB on Dashboard
- [ ] AddTransactionSheet opens
- [ ] See "Manual Entry" option (enabled)
- [ ] See "Upload Statement" option with lock icon
- [ ] Click "Manual Entry" → Opens dialog, works correctly
- [ ] Click "Upload Statement" → Shows upgrade prompt
- [ ] Upgrade prompt is clear and non-blocking
- [ ] Navigate to Settings → See "Free Tier" card with upgrade CTA

#### Paid User Flow
- [ ] Open app as paid user (or set subscription_tier='premium' in DB)
- [ ] Click FAB on Dashboard
- [ ] AddTransactionSheet opens
- [ ] See both options enabled
- [ ] Click "Manual Entry" → Works
- [ ] Click "Upload Statement" → Opens upload dialog
- [ ] Upload a test PDF → Processes successfully
- [ ] Navigate to Settings → See "Premium" card with active badge

#### Mobile Responsiveness
- [ ] Test on iPhone 14 Pro Max (430×932) - with notch
- [ ] Test on iPhone SE (375×667) - no notch
- [ ] Test on Pixel 7 (412×915) - punch hole
- [ ] FAB doesn't overlap with bottom nav
- [ ] Safe areas respected (no content behind notch)
- [ ] Transaction list readable and well-spaced
- [ ] All touch targets >= 44px
- [ ] Text contrast meets WCAG AA

#### Settings Page
- [ ] No "Built with Lovable" reference
- [ ] No "Since [date]" badge
- [ ] No "Payment Methods" section
- [ ] Subscription card at top
- [ ] All settings links work or show "Coming soon"
- [ ] Sign out works correctly

### Automated Testing (Future)
```typescript
// Example with React Testing Library
describe('AddTransactionSheet', () => {
  it('shows both options for paid users', () => {
    // Mock isPaidUser to return true
    // Render component
    // Assert both options visible
  });

  it('shows upgrade prompt for free users', () => {
    // Mock isPaidUser to return false
    // Render component
    // Click upload option
    // Assert upgrade prompt shown
  });
});
```

---

## 📈 SUCCESS METRICS

### User Experience
- **Task Completion Time**: Add transaction <30 seconds (from intent to save)
- **Error Rate**: <5% failed transaction additions
- **User Satisfaction**: Qualitative feedback on ease of use

### Technical
- **First Paint**: <1s
- **Time to Interactive**: <3s
- **Lighthouse Accessibility Score**: >90
- **Mobile Performance Score**: >80

### Business
- **Conversion Rate**: Free to Premium (from unified flow)
- **Feature Discovery**: % of users who try upload statement
- **Retention**: Impact on D7 retention rate

---

## 🚀 DEPLOYMENT PLAN

### Pre-Deployment
1. Create feature branch: `feature/mobile-ux-enhancement`
2. Implement phases A-F
3. Manual testing on staging environment
4. Cross-browser testing (Chrome, Safari, Firefox mobile)
5. Review with stakeholders

### Deployment
1. Merge to main
2. Deploy to staging
3. Smoke test all flows
4. Deploy to production
5. Monitor error logs for 24 hours
6. Collect user feedback

### Rollback Plan
If critical issues arise:
1. Revert to previous commit
2. Redeploy
3. Investigate and fix in dev
4. Re-test and redeploy

---

## 📚 DOCUMENTATION UPDATES

### Files to Update

#### 1. README.md
**Add**:
- Updated screenshots showing new UI
- Feature list update (unified transaction entry)
- Mobile-first design emphasis

#### 2. CHANGELOG.md
**Create if doesn't exist**:
```markdown
# Changelog

## [1.1.0] - 2025-10-03

### Added
- Unified transaction entry experience with FAB
- Subscription tier display in Settings
- Mobile UI improvements with safe area handling

### Changed
- Settings page redesigned and simplified
- Transaction list improved for mobile
- Upload statement moved from Accounts to unified flow

### Removed
- "Built with Lovable" references
- "Payment Methods" section from Settings
- "Since [date]" badge from profile

### Fixed
- Stats cards contrast issues
- Bottom navigation safe area handling
- Transaction list spacing on mobile
```

#### 3. CONTRIBUTING.md (if exists)
**Update**: Component structure and best practices

---

## 🎓 BEST PRACTICES REFERENCES

### Mobile Design
- [Material Design - Bottom Sheets](https://m3.material.io/components/bottom-sheets)
- [iOS Human Interface Guidelines - Modals](https://developer.apple.com/design/human-interface-guidelines/modality)
- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

### React Patterns
- [Controlled vs Uncontrolled Components](https://react.dev/learn/sharing-state-between-components)
- [Compound Components Pattern](https://kentcdodds.com/blog/compound-components-with-react-hooks)

### Zustand
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)

---

## 🏁 FINAL CHECKLIST

Before marking as complete:

- [ ] All components created and tested
- [ ] Manual transaction entry works from both pages
- [ ] File upload works for paid users
- [ ] Free users see appropriate upgrade prompts
- [ ] Settings page simplified
- [ ] All Lovable references removed
- [ ] Mobile UI polished (contrast, spacing, safe areas)
- [ ] No console errors
- [ ] No broken links
- [ ] Documentation updated
- [ ] Changelog created
- [ ] Stakeholder approval

---

**Total Estimated Time**: ~9 hours of focused development

**Priority**: P0 (Phase A-B), P1 (Phase C-D), P2 (Phase E-F)

**Risk Level**: Low (reuses existing components, minimal new logic)

**Dependencies**: None (self-contained feature)

---

**Document Status**: ✅ Ready for Implementation

**Next Steps**: Begin with Phase A (Component Extraction & Setup)
