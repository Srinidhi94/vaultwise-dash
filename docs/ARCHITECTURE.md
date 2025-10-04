# VaultWise Architecture

Technical architecture and design decisions for the VaultWise finance dashboard.

---

## 📊 System Overview

VaultWise is a personal finance management application with AI-powered bank statement processing capabilities.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Supabase Cloud  │────▶│   PostgreSQL    │
│  (TypeScript)   │     │  (Auth, Storage) │     │   (Database)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         │ webhook
         ▼
┌─────────────────┐     ┌──────────────────┐
│  n8n Workflow   │────▶│   AI Models      │
│  (28 nodes)     │     │ GPT-4.1 + Claude │
└─────────────────┘     └──────────────────┘
```

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

### AI Processing
- **Workflow Engine**: n8n Cloud
- **LLM Models**: 
  - GPT-4.1-mini (OpenAI)
  - Claude Sonnet 4 (Anthropic)
- **Processing**: Synchronous webhook-based

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

## 🤖 AI Processing Pipeline

### Architecture Decision: Synchronous Processing

**Chosen approach**: Direct webhook with synchronous response
- ✅ Simpler: No job queue, no background processing
- ✅ Faster: Immediate feedback to user
- ✅ Reliable: Fewer failure points
- ✅ Debuggable: Easy to trace issues

**Rejected approaches**:
- ❌ Async job queue (too complex)
- ❌ Real-time notifications (unnecessary)
- ❌ `processing_jobs` table (over-engineering)

### n8n Workflow Structure (28 Nodes)

**Phase 1: File Processing** (4 nodes)
1. Webhook Trigger - Receives file URL
2. Download File - Fetches from Supabase Storage
3. File Type Switch - Routes to PDF or CSV handler
4. Read PDF / Process CSV - Extracts text

**Phase 2: Context Fetching** (4 nodes)
5. Format User Data - Extracts user_id
6. Read User Categories - Fetches from database
7. Format Categories - Groups by type (income/expense)
8. Read User Accounts - Fetches registered accounts
9. Format Accounts - Prepares for AI

**Phase 3: AI Processing** (3 nodes)
10. AI Transaction Processor (LangChain)
    - Input: Statement text + categories + accounts
    - Output: Structured JSON with transactions
11. OpenAI Chat Model (GPT-4.1-mini)
12. Claude Chat Model (Sonnet 4)
13. Structured Output Parser - Validates JSON schema

**Phase 4: Account Resolution** (3 nodes)
14. Resolve Account - Matches AI-detected account to database
15. If Account Matched - Validates account exists
16. Format Error Response - Handles unmatched accounts

**Phase 5: Deduplication** (4 nodes)
17. Compute Statement Range - Extracts date range
18. Fetch Existing Transactions - Gets transactions in range
19. Format & Deduplicate - Removes duplicates (fuzzy matching)
20. Prepare Save Payload - Formats for Supabase

**Phase 6: Save & Cleanup** (4 nodes)
21. If Has Payload - Checks for new transactions
22. Save to Supabase - Bulk insert
23. Format Response - Prepares success message
24. Return Response - Sends webhook response

### AI Prompt Strategy

**Structured Output Parser**: JSON schema enforcement
```json
{
  "account": {
    "label": "string (exact match)",
    "type": "savings|credit",
    "matched": "boolean"
  },
  "transactions": [{
    "date": "DD/MM/YYYY",
    "description": "string",
    "amount": "number",
    "type": "income|expense",
    "category": "string (from provided list)",
    "account": "string (matches account.label)"
  }],
  "summary": {
    "total_transactions": "number",
    "consistency": "pass|warn|fail"
  }
}
```

**Category Matching**: Type-aware categorization
- Income transactions → Only income categories
- Expense transactions → Only expense categories
- Fallback to "Others" if no match

**Account Detection**: Multi-signal matching
- Account numbers, bank names, holder names
- Confidence scoring
- Explicit match flag

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

### File Upload Security

**Temporary Storage Pattern**:
```
1. User uploads file (PDF/CSV)
   ↓
2. Upload to Supabase Storage (statements bucket)
   - Private bucket
   - User-specific folder: /{user_id}/filename.pdf
   ↓
3. Generate signed URL (5-minute expiry)
   ↓
4. Call n8n webhook with signed URL
   ↓
5. n8n downloads and processes file
   ↓
6. DELETE file from storage immediately
   ↓
7. Return results to frontend
```

**Key Security Measures**:
- ✅ Files never publicly accessible
- ✅ Signed URLs with short expiry (5 minutes)
- ✅ Automatic deletion after processing
- ✅ RLS policies prevent cross-user access
- ✅ File type and size validation
- ✅ No permanent storage of bank statements

### Environment Variables

**Frontend** (`.env.local`):
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_N8N_WEBHOOK_URL=https://n8n.example.com/webhook/vaultwise-process
```

**Backend** (Supabase secrets):
- Database connection string
- JWT secret for auth
- Storage keys

**n8n** (workflow credentials):
- Supabase API key
- OpenAI API key
- Anthropic API key

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
- `useStatementStore` - File upload and processing
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
- **File uploads**: 10 MB max, PDF/CSV only
- **Processing time**: 30-120 seconds per statement
- **n8n**: Cloud plan limits (executions/month)

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
- **n8n**: n8n Cloud (venom94.app.n8n.cloud)
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

- **Multi-file upload**: Batch processing
- **Processing history**: Track past uploads
- **Email ingestion**: Forward statements to email
- **OCR improvements**: Better extraction accuracy
- **International banks**: Support more formats

### Technical Debt

- Add comprehensive testing suite
- Implement proper error tracking (Sentry)
- Add analytics (PostHog/Mixpanel)
- Optimize bundle size
- Add service worker for PWA
- Implement offline support

---

## 📚 Architecture Decisions Log

### Decision 1: Synchronous Processing
**Context**: Need to process bank statements with AI
**Decision**: Synchronous webhook instead of async jobs
**Rationale**: Simpler, faster, fewer failure points
**Status**: ✅ Implemented and working

### Decision 2: Type-Based Categories
**Context**: Need better category organization
**Decision**: Split categories into income/expense types
**Rationale**: Prevents mismatched categorization by AI
**Status**: ✅ Implemented

### Decision 3: No Permanent File Storage
**Context**: Security and privacy concerns
**Decision**: Delete files immediately after processing
**Rationale**: Reduces liability, improves security
**Status**: ✅ Implemented

### Decision 4: Dual LLM Strategy
**Context**: Need reliable AI extraction
**Decision**: Use GPT-4.1-mini + Claude Sonnet 4
**Rationale**: Fallback option, better accuracy
**Status**: ✅ Implemented

---

## 📞 Support and Maintenance

### Monitoring

- Supabase dashboard for database metrics
- n8n execution logs for workflow debugging
- Browser console for frontend errors

### Backup Strategy

- Supabase automatic daily backups
- Point-in-time recovery available
- Database export capability

### Update Process

- Database migrations via Supabase CLI
- Frontend updates via git push
- n8n workflow updates via UI

---

**Last Updated**: October 4, 2025
