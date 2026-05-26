# VaultWise Architecture

**Version**: 2.0  
**Last Updated**: January 6, 2025  
**Status**: Production-Ready MVP

Technical architecture and design decisions for the VaultWise finance dashboard.

---

## 📊 System Overview

VaultWise (SpendWise) is a **personal finance management application** built as a mobile-first web app. It helps users track income, expenses, and account balances across multiple savings accounts and credit cards, with support for bank-synced accounts via India's Account Aggregator framework.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                               │
│  Web Browser (Chrome, Safari, Firefox) + Mobile (iOS, Android) │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (Vercel)                      │
│   React 18 + TypeScript + Vite + Tailwind + shadcn/ui          │
│   Zustand State Management + React Router v6                    │
└─────────────────────────────────────────────────────────────────┘
                              ↕ API Calls
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND LAYER (Supabase)                      │
│  PostgreSQL 17 + Auth + Storage + Row Level Security (RLS)     │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Edge Functions
┌─────────────────────────────────────────────────────────────────┐
│              ACCOUNT AGGREGATOR LAYER (Supabase Edge)           │
│  AA Proxy Edge Function + Consent Management + Data Fetch      │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|------------|
| **Frontend Framework** | React 18 + TypeScript | Type safety, large ecosystem, excellent tooling |
| **Build Tool** | Vite | Fast HMR, optimized builds, modern defaults |
| **Backend** | Supabase (PostgreSQL) | Instant APIs, built-in auth, RLS for security |
| **State Management** | Zustand | Lightweight (3KB), simple API, no boilerplate |
| **UI Library** | shadcn/ui + Radix UI | Accessible, customizable, modern design |
| **Balance Calculation** | Dynamic (computed) | Single source of truth, prevents data inconsistency |
| **Bank Sync** | Account Aggregator (AA) | RBI-regulated, consent-based, no PDF parsing needed |

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.2.0
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Yup validation
- **Charts**: Recharts
- **Routing**: React Router v6
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL 17.6.1)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (temporary files)
- **RLS**: Row Level Security enabled on all tables
- **Real-time**: Not used (simplified architecture)

### Bank Sync (Account Aggregator)
- **Integration**: Supabase Edge Function (`aa-proxy`)
- **Provider**: Setu (RBI-regulated AA) or mock provider for development
- **Flow**: Consent-based data fetch via AA framework

---

## 🏗️ Core Architecture Patterns

### Dynamic Balance Calculation

**Design Decision**: Account balances are **computed dynamically** from transactions, not stored.

```
Transaction Created/Updated/Deleted
    ↓
 recalculateBalances() triggered
    ↓
Fetch ALL transactions for account
    ↓
Savings: opening_balance + ∑(income) - ∑(expense)
Credit:  ∑(expense) - ∑(income)
    ↓
Update in-memory state (no DB write)
```

**Benefits**:
- ✅ **Single source of truth** - Transactions are the only data
- ✅ **Data integrity** - Balances always accurate
- ✅ **Audit trail** - Can reconstruct balance at any point in time
- ✅ **No sync issues** - Impossible for balance to be "off"

**Implementation**: `utils/accountBalanceUtils.ts`

```typescript
// Savings: Opening + Income - Expense
export const calculateSavingsBalance = (
  accountId: string,
  openingBalance: number,
  transactions: Transaction[]
): number => {
  const income = transactions
    .filter(t => t.account_id === accountId && t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expense = transactions
    .filter(t => t.account_id === accountId && t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return openingBalance + income - expense;
};

// Credit: Expense - Income (amount owed)
export const calculateCreditCardBalance = (
  cardId: string,
  transactions: Transaction[]
): number => {
  const expense = transactions
    .filter(t => t.account_id === cardId && t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const income = transactions
    .filter(t => t.account_id === cardId && t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return Math.abs(expense - income);
};
```

### Number Formatting System

**Cross-Cutting Concern**: Display numbers in user's preferred format (Indian vs International).

```
User Preference (in database)
    ↓
'indian' → Lakhs/Crores with 12,34,567 commas
'international' → Millions/Billions with 1,234,567 commas
    ↓
Applied across ALL components:
- Dashboard cards
- Chart labels & legends
- Transaction lists
- Account balances
```

**Two Formatting Functions**:

```typescript
// Abbreviated (for cards, mobile)
formatAmount(1234567, 'indian') → "12.35L"
formatAmount(1234567, 'international') → "1.23M"

// Full with commas (for details)
formatFullAmount(1234567, 'indian') → "12,34,567.00"
formatFullAmount(1234567, 'international') → "1,234,567.00"
```

**Responsive Display**:
- **Mobile**: Abbreviated amounts (saves space)
- **Desktop**: Full amounts with commas

### State Management Pattern

**Zustand Stores** follow consistent structure:

```typescript
interface StorePattern {
  // Data
  items: Item[];
  loading: boolean;
  error: string | null;
  
  // Actions (async)
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<Item, 'id'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  // Computed (sync)
  getItemById: (id: string) => Item | undefined;
}
```

**Key Patterns**:
1. **Loading states** - Always set before async operations
2. **Optimistic updates** - Update local state immediately
3. **Error handling** - Try-catch + toast notifications
4. **Devtools integration** - For debugging
5. **Session persistence** - Date filters persisted in sessionStorage

---

## 🗄️ Database Schema

### Core Tables

#### `user_profiles`
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  currency VARCHAR(3) DEFAULT 'INR',
  subscription_tier VARCHAR(20) DEFAULT 'free',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `categories`
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(50) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Default Categories**: 32 pre-populated categories
- **Income** (12): Salary, Business income, Freelance, Rental income, etc.
- **Expense** (20): Rent, Utilities, Groceries, Dining out, Transportation, etc.

#### `savings_accounts`
```sql
CREATE TABLE savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  account_name VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  current_balance DECIMAL(15,2) DEFAULT 0,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `credit_cards`
```sql
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  card_name VARCHAR(100) NOT NULL,
  card_issuer VARCHAR(100),
  last_four_digits VARCHAR(4),
  credit_limit DECIMAL(15,2),
  current_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `transactions`
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  account_id UUID,  -- References savings_accounts or credit_cards
  account_type VARCHAR(20),  -- 'savings' or 'credit'
  category_id UUID REFERENCES categories(id),
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(10) CHECK (transaction_type IN ('income', 'expense')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Foreign Key Relationships

```
transactions.user_id        → auth.users.id
transactions.account_id     → savings_accounts.id OR credit_cards.id
transactions.category_id    → categories.id

savings_accounts.user_id    → auth.users.id
credit_cards.user_id        → auth.users.id
categories.user_id          → auth.users.id
user_profiles.user_id       → auth.users.id
```

### Row Level Security (RLS)

**All tables have RLS enabled** with policies:

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own data"
ON table_name FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own data
CREATE POLICY "Users can insert own data"
ON table_name FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
ON table_name FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own data
CREATE POLICY "Users can delete own data"
ON table_name FOR DELETE
USING (auth.uid() = user_id);
```

---

## 🔗 Account Aggregator Pipeline

### Architecture Decision: RBI-regulated AA Framework

**Chosen approach**: India's Account Aggregator (AA) framework for bank data sync
- ✅ Consent-based: User controls data sharing
- ✅ No PDF parsing: Direct structured data from banks
- ✅ RBI-regulated: Fully compliant, not screen-scraping
- ✅ Scalable: 126+ live FIPs (banks)

### AA Proxy Edge Function

The `supabase/functions/aa-proxy/index.ts` Edge Function handles:

1. **Create Consent** — Initiates consent with AA provider (Setu)
2. **Check Consent Status** — Polls provider for approval
3. **Fetch Data** — Downloads transactions once consent is active
4. **Sync Account** — Re-fetches latest data for an existing linked account
5. **Revoke Consent** — Revokes consent with the provider
6. **Check & Revoke** — Auto-revokes consent when an account is unlinked

### Data Flow

```
1. User clicks "Connect bank"
   ↓
2. Frontend calls aa-proxy → createConsent
   ↓
3. User approves consent on AA provider redirect
   ↓
4. Frontend polls consentStatus until active
   ↓
5. Frontend calls fetchData → Edge Function fetches from provider
   ↓
6. Edge Function normalises accounts + transactions → upserts into DB
   ↓
7. Frontend refreshes accounts/transactions from Supabase
```

### Account Deduplication

When re-linking accounts (e.g., after a consent revoke + re-create), the Edge Function:
- First tries exact match (same consent)
- Falls back to cross-consent match by `fip_id` + `masked_account_number`
- Reuses existing local accounts to preserve transaction history

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User signs in → Supabase Auth
2. Auth generates JWT token
3. Token includes user_id (sub claim)
4. Frontend stores token in localStorage
5. All API calls include token in Authorization header
6. RLS policies validate auth.uid() matches user_id
```

### Environment Variables

**Frontend** (`.env.local`):
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
```

**Backend** (Supabase secrets / Edge Function env):
- Database connection string
- JWT secret for auth
- `AA_PROVIDER` — `setu` or `mock`
- `SETU_CLIENT_ID` / `SETU_CLIENT_SECRET` (if using Setu)

---

## 🎨 Frontend Architecture

### State Management (Zustand)

**Store Pattern**:
```typescript
interface Store {
  // State
  data: Data | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchData: () => Promise<void>;
  updateData: (data: Data) => Promise<void>;
  deleteData: (id: string) => Promise<void>;
  reset: () => void;
}

const useStore = create<Store>()(
  devtools(
    (set, get) => ({
      // Initial state
      data: null,
      loading: false,
      error: null,
      
      // Actions
      fetchData: async () => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('table')
            .select('*');
          if (error) throw error;
          set({ data, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },
      
      reset: () => set({ data: null, loading: false, error: null })
    })
  )
);
```

**Existing Stores**:
- `useAuthStore` - Authentication state
- `useProfileStore` - User profile and subscription
- `useAccountsStore` - Savings accounts and credit cards
- `useTransactionsStore` - Transactions with categories
- `useAccountAggregatorStore` - AA consent and bank sync
- `usePreferencesStore` - UI preferences

### Component Architecture

**Atomic Design Approach**:
- **Atoms**: `components/ui/` (shadcn/ui components)
- **Molecules**: Feature-specific components
- **Organisms**: Page sections
- **Pages**: Full page components

**Routing Structure**:
```typescript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/accounts" element={<Accounts />} />
    <Route path="/transactions" element={<Transactions />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

---

## 📱 Mobile-First Design

### Responsive Breakpoints

```typescript
// Tailwind breakpoints
sm: '640px'   // Mobile landscape / small tablets
md: '768px'   // Tablets
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large desktop
```

### Touch Targets

- **Minimum size**: 44x44px (Apple HIG)
- **Button padding**: Generous spacing
- **Form inputs**: 16px font size (prevents iOS zoom)

### Bottom Navigation

Mobile-first navigation pattern:
```typescript
<BottomNavigation>
  <NavItem icon={LayoutDashboard} label="Dashboard" />
  <NavItem icon={Wallet} label="Accounts" />
  <NavItem icon={Receipt} label="Transactions" />
  <NavItem icon={Settings} label="Settings" />
</BottomNavigation>
```

---

## 🚀 Performance Optimizations

### Code Splitting

- Route-based code splitting with React.lazy()
- Component lazy loading for heavy features
- Dynamic imports for charts and analytics

### Database Query Optimization

- Indexed columns: user_id, account_id, transaction_date
- Efficient SELECT queries (specific columns only)
- Batched operations for bulk inserts
- Pagination for large datasets

### Caching Strategy

- Zustand persists state in memory
- Categories cached after first fetch
- Accounts cached and invalidated on updates
- Transactions refetched on navigation

---

## 🧪 Testing Strategy

### Manual Testing

- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile device testing (iOS, Android)
- Responsive design testing (all breakpoints)
- Authentication flow testing
- Error scenario testing

### Future: Automated Testing

- Unit tests for utilities and stores
- Integration tests for API calls
- E2E tests for critical user flows
- Visual regression testing

---

## 📈 Scalability Considerations

### Current Limits

- **Users**: No limit (Supabase scales automatically)
- **Transactions per user**: Unlimited
- **AA sync**: Dependent on AA provider rate limits

### Future Scaling

- **Caching layer**: Redis for frequently accessed data
- **CDN**: CloudFlare for static assets
- **Database**: Connection pooling, read replicas
- **Background jobs**: Separate job queue for long tasks
- **Rate limiting**: API rate limits per user tier

---

## 🔄 Deployment Architecture

### Current Setup

- **Frontend**: Vercel / Netlify (planned)
- **Backend**: Supabase Cloud (huxhlktqxdkafbjtbwyr)
- **Edge Functions**: Supabase Edge (Deno runtime)
- **Database**: Supabase PostgreSQL (auto-managed)
- **Storage**: Supabase Storage (auto-managed)

### CI/CD Pipeline (Future)

```
1. Push to GitHub
   ↓
2. GitHub Actions triggered
   ↓
3. Run linter and build
   ↓
4. Run tests
   ↓
5. Deploy to Vercel/Netlify
   ↓
6. Run database migrations
   ↓
7. Smoke tests on production
```

---

## 🔮 Future Architecture Enhancements

### Phase 2 Features

- **Recurring transactions**: Detect and auto-create
- **Budget tracking**: Set and monitor spending budgets
- **Export**: CSV/PDF export of transactions
- **Multi-currency**: Support for international users

### Technical Debt

- Add comprehensive testing suite
- Implement proper error tracking (Sentry)
- Add analytics (PostHog/Mixpanel)
- Optimize bundle size
- Add service worker for PWA
- Implement offline support

---

## 📚 Architecture Decisions Log

### Decision 1: Account Aggregator Integration
**Context**: Need automated bank account data sync
**Decision**: Use India's AA framework via Setu provider
**Rationale**: RBI-regulated, consent-based, no screen scraping
**Status**: ✅ Implemented and working

### Decision 2: Type-Based Categories
**Context**: Need better category organization
**Decision**: Split categories into income/expense types
**Rationale**: Prevents mismatched categorization
**Status**: ✅ Implemented

### Decision 3: Dynamic Balance Computation
**Context**: Need accurate account balances
**Decision**: Compute balances from transactions at runtime
**Rationale**: Single source of truth, prevents stale data
**Status**: ✅ Implemented

---

## 🔄 Data Flow Patterns

### Manual Transaction Entry Flow

```
User clicks "+" button
    ↓
AddTransactionDialog opens
    ↓
User fills form (account, amount, type, description, category)
    ↓
Validation (React Hook Form + Yup)
    ↓
Submit → useTransactionsStore.addTransaction()
    ↓
Supabase INSERT (RLS validates user_id)
    ↓
Success → Update local state
    ↓
recalculateBalances() triggered
    ↓
Dashboard auto-refreshes
```

### Dashboard Load Sequence

```
Page Mount
    ↓
Check Auth → useAuthStore
    ↓
Parallel Fetches:
  - Preferences (currency, number format)
  - Accounts (all savings + credit cards)
  - Transactions (all records)
  - Categories (all user categories)
    ↓
Compute Balances (dynamic calculation)
    ↓
Apply Filters (date range, account)
    ↓
Compute Analytics (income, expense, breakdown)
    ↓
Render UI
```

---

## 🚀 Deployment & Infrastructure

### Frontend (Vercel)

```
Git Push → Vercel Auto-Deploy
    ↓
npm install + npm run build
    ↓
Output: dist/ (static files)
    ↓
Deploy to global CDN
    ↓
Live in <2 minutes
```

**Current URL**: https://spendwise-*.vercel.app

### Backend (Supabase)

- **Project**: huxhlktqxdkafbjtbwyr
- **Database**: PostgreSQL 17.6.1
- **Region**: ap-south-1 (Mumbai)
- **Backups**: Daily automatic

### Edge Functions (Supabase)

- **Runtime**: Deno
- **Function**: `aa-proxy` (Account Aggregator integration)
- **Auth**: JWT-validated via Supabase Auth

---

## ⚡ Performance

### Load Metrics

| Metric | Target | Current |
|--------|--------|--------|
| FCP | <1.5s | ~1.2s |
| LCP | <2.5s | ~1.8s |
| TTI | <3.5s | ~2.5s |
| Bundle | <500KB | 403KB (gzipped) |

### Optimizations

- ✅ Lazy loading for dialogs
- ✅ Memoization (useMemo)
- ✅ Debounced search
- ✅ In-memory balance calculations
- ✅ Single transaction fetch per session

---

## 🔒 Security

### Authentication

```
User Login
    ↓
Supabase Auth validates
    ↓
JWT token generated (sub = user_id)
    ↓
Token in localStorage
    ↓
All API calls include: Authorization: Bearer <token>
    ↓
RLS policies check: auth.uid() = user_id
```

### Data Protection

- ✅ TLS 1.3 encryption (all connections)
- ✅ PostgreSQL encryption at rest
- ✅ RLS policies (complete data isolation)
- ✅ AA data fetched via consent, not stored permanently

---

## 📈 Scalability

### Current Capacity

| Metric | Limit (Free Tier) |
|--------|------------------|
| Users | Unlimited |
| Database | 500MB |
| Bandwidth | 5GB/month |
| Storage | 1GB |
| API Requests | Unlimited |

### Growth Strategy

**0-100 users**: Free tiers sufficient  
**100-1K users**: Upgrade to Supabase Pro ($25/mo)  
**1K-10K users**: Add caching, read replicas  

---

## 📞 Support and Maintenance

### Monitoring

- Supabase dashboard for database metrics
- Supabase Edge Function logs for debugging
- Browser DevTools for frontend errors

### Backup Strategy

- Supabase automatic daily backups
- Point-in-time recovery available
- Database export capability

### Update Process

- Database migrations via Supabase CLI
- Frontend updates via git push
- Edge Function deploys via Supabase CLI

---

---

## 📚 Related Documentation

- **[Product Requirements](./PRD.md)** - Feature roadmap and business goals
- **[Ideal Customer Profile](./ICP.md)** - Target user personas
- **[Development Guide](./DEVELOPMENT.md)** - Setup instructions
- **[Contributing Guide](./CONTRIBUTING.md)** - Code standards and workflow
- **[README](../README.md)** - Project overview

---

**Version**: 2.0  
**Last Updated**: January 6, 2025  
**Status**: Production-Ready MVP
