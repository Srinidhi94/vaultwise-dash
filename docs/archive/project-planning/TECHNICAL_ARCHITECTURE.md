# VaultWise Dashboard - Technical Architecture Document

## 1. Architecture Overview

### 1.1 System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Supabase      │    │   n8n Workflow  │
│   (React PWA)   │◄──►│   (Backend)      │◄──►│  (AI Processing)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │ Service │             │Database │             │   AI    │
    │ Worker  │             │Storage  │             │ Models  │
    │  (PWA)  │             │Realtime │             │OpenAI/  │
    └─────────┘             │  Auth   │             │Claude   │
                            └─────────┘             └─────────┘
```

### 1.2 Technology Stack

#### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development and builds)
- **UI Library**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (lightweight, simple)
- **PWA**: Workbox (service worker, caching)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts (React-based charts)
- **Date Handling**: date-fns (lightweight alternative to moment.js)

#### Backend Stack
- **Backend-as-a-Service**: Supabase
  - **Database**: PostgreSQL with Row Level Security (RLS)
  - **Authentication**: Built-in auth with JWT tokens
  - **Storage**: File storage with CDN
  - **Realtime**: WebSocket-based real-time subscriptions
  - **Edge Functions**: Serverless functions (if needed)

#### Processing Stack
- **Workflow Engine**: n8n (existing workflow)
- **AI Models**: OpenAI GPT-4 Mini + Anthropic Claude 3.5 Sonnet
- **File Processing**: PDF parsing, CSV processing
- **Integration**: HTTP webhooks, Supabase API

#### Infrastructure
- **Frontend Hosting**: Vercel (optimized for React/Next.js)
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics + Supabase Dashboard
- **Payments**: Stripe (simple integration)

## 2. Architecture Decision: Enhanced PWA

### 2.1 Why PWA over React Native?

#### ✅ Advantages of PWA
1. **Single Codebase**: One React app serves web and mobile
2. **Existing Expertise**: Leverage current React/TypeScript skills
3. **Instant Updates**: Deploy updates without app store approval
4. **Cost Effective**: No app store fees or complex deployment
5. **User Requirements**: Perfect fit (no camera, location, offline)
6. **Maintenance**: Significantly simpler than dual codebases
7. **SEO Benefits**: Web app is discoverable and indexable

#### ❌ React Native Disadvantages for This Use Case
1. **Complexity**: Requires learning new platform-specific concepts
2. **Maintenance**: Two codebases (iOS/Android) or complex shared code
3. **App Store**: Approval process, fees, update delays
4. **Overkill**: User doesn't need native features (camera, GPS, etc.)
5. **Team Size**: Single developer benefits more from unified stack

### 2.2 PWA Implementation Strategy

#### Core PWA Features
- **App Manifest**: Makes app installable on mobile devices
- **Service Worker**: Enables offline capabilities and push notifications
- **Responsive Design**: Works seamlessly on all screen sizes
- **App-like Experience**: Full-screen mode, splash screen, app icons

#### PWA Configuration
```json
// public/manifest.json
{
  "name": "VaultWise Dashboard",
  "short_name": "VaultWise",
  "description": "Personal Finance Management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1E3A8A",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 3. Database Architecture

### 3.1 Enhanced Schema Design

#### Existing Tables (Keep as-is)
- `user_profiles` - User settings and preferences
- `savings_accounts` - Bank savings accounts
- `credit_cards` - Credit card accounts
- `categories` - Transaction categories
- `transactions` - All financial transactions

#### New Tables for v2.0
```sql
-- Subscription management
ALTER TABLE user_profiles ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN subscription_expires_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN trial_used BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN trial_expires_at TIMESTAMPTZ;

-- Processing jobs tracking
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  transactions_extracted INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,
  transactions_duplicates INTEGER DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account limits for freemium
ALTER TABLE savings_accounts ADD COLUMN account_order INTEGER DEFAULT 0;
ALTER TABLE credit_cards ADD COLUMN account_order INTEGER DEFAULT 0;

-- Enhanced categories with usage tracking
ALTER TABLE categories ADD COLUMN usage_count INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX idx_processing_jobs_user_status ON processing_jobs(user_id, status);
CREATE INDEX idx_processing_jobs_created ON processing_jobs(created_at DESC);
CREATE INDEX idx_categories_usage ON categories(user_id, usage_count DESC);
```

### 3.2 Row Level Security (RLS) Policies

#### Processing Jobs Security
```sql
-- Enable RLS
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own processing jobs
CREATE POLICY "Users can view own processing jobs" ON processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processing jobs" ON processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update processing jobs" ON processing_jobs
  FOR UPDATE USING (true); -- n8n needs to update status
```

### 3.3 Database Functions

#### Account Limit Enforcement
```sql
-- Function to check account limits for free users
CREATE OR REPLACE FUNCTION check_account_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_tier VARCHAR(20);
  current_count INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM user_profiles
  WHERE id = NEW.user_id;
  
  -- Only enforce limits for free tier
  IF user_tier = 'free' THEN
    -- Count existing accounts
    SELECT COUNT(*) INTO current_count
    FROM (
      SELECT id FROM savings_accounts WHERE user_id = NEW.user_id AND is_active = true
      UNION ALL
      SELECT id FROM credit_cards WHERE user_id = NEW.user_id AND is_active = true
    ) AS all_accounts;
    
    -- Enforce 3 account limit for free users
    IF current_count >= 3 THEN
      RAISE EXCEPTION 'Free tier limited to 3 accounts. Upgrade to Premium for unlimited accounts.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to both account tables
CREATE TRIGGER enforce_savings_account_limit
  BEFORE INSERT ON savings_accounts
  FOR EACH ROW EXECUTE FUNCTION check_account_limit();

CREATE TRIGGER enforce_credit_card_limit
  BEFORE INSERT ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION check_account_limit();
```

## 4. Frontend Architecture

### 4.1 Component Architecture

#### Directory Structure
```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   ├── dashboard/          # Dashboard-specific components
│   ├── transactions/       # Transaction-related components
│   ├── accounts/           # Account management components
│   ├── upload/             # File upload components (NEW)
│   └── subscription/       # Subscription components (NEW)
├── pages/                  # Page components
├── stores/                 # Zustand stores
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── integrations/           # External service integrations
└── types/                  # TypeScript type definitions
```

#### New Components for v2.0
```typescript
// components/upload/FileUploadZone.tsx
interface FileUploadZoneProps {
  accountId: string;
  onUploadStart: (jobId: string) => void;
  onUploadComplete: (result: ProcessingResult) => void;
}

// components/subscription/UpgradePrompt.tsx
interface UpgradePromptProps {
  feature: 'file_upload' | 'unlimited_accounts' | 'advanced_analytics';
  onUpgrade: () => void;
}

// components/transactions/TransactionReview.tsx
interface TransactionReviewProps {
  transactions: ExtractedTransaction[];
  onApprove: (transactions: Transaction[]) => void;
  onReject: () => void;
}
```

### 4.2 State Management with Zustand

#### Enhanced Stores
```typescript
// stores/useSubscriptionStore.ts
interface SubscriptionState {
  tier: 'free' | 'premium';
  expiresAt: Date | null;
  trialUsed: boolean;
  trialExpiresAt: Date | null;
  
  // Actions
  checkSubscription: () => Promise<void>;
  upgradeToPremium: () => Promise<void>;
  startTrial: () => Promise<void>;
  
  // Computed
  isPremium: () => boolean;
  isTrialActive: () => boolean;
  canUseFeature: (feature: string) => boolean;
}

// stores/useProcessingStore.ts
interface ProcessingState {
  jobs: ProcessingJob[];
  activeJob: ProcessingJob | null;
  
  // Actions
  startProcessing: (accountId: string, file: File) => Promise<string>;
  watchJob: (jobId: string) => void;
  stopWatching: () => void;
  
  // Computed
  isProcessing: () => boolean;
  getJobStatus: (jobId: string) => ProcessingStatus;
}
```

### 4.3 Real-time Integration

#### Supabase Realtime Setup
```typescript
// hooks/useRealtimeProcessing.ts
export const useRealtimeProcessing = (userId: string) => {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  
  useEffect(() => {
    const subscription = supabase
      .channel('processing_jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          handleJobUpdate(payload);
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);
  
  return { jobs, isProcessing: jobs.some(j => j.status === 'processing') };
};
```

## 5. Integration Architecture

### 5.1 n8n Workflow Integration

#### Modified Workflow Structure
```
Webhook Trigger (NEW)
├── Validate Request
├── Download File from Supabase Storage
├── Update Job Status: "processing"
├── Process File (PDF/CSV)
├── AI Transaction Extraction
├── Category Mapping (User's Categories)
├── Deduplication Logic
├── Write to Supabase Database
├── Update Job Status: "completed"
└── Send Completion Webhook (Optional)
```

#### Webhook Payload Structure
```json
{
  "user_id": "uuid",
  "job_id": "uuid",
  "account_id": "uuid",
  "file_url": "https://supabase-storage-url",
  "file_name": "statement.pdf",
  "user_categories": [
    {"id": "uuid", "name": "Food", "keywords": ["restaurant", "food"]},
    {"id": "uuid", "name": "Transport", "keywords": ["uber", "metro"]}
  ],
  "account_info": {
    "name": "HDFC Savings",
    "type": "savings",
    "currency": "INR"
  }
}
```

### 5.2 File Processing Flow

#### Detailed Processing Steps
1. **Frontend Upload**
   ```typescript
   const uploadFile = async (file: File, accountId: string) => {
     // Upload to Supabase Storage
     const { data: fileData } = await supabase.storage
       .from('statements')
       .upload(`${userId}/${Date.now()}_${file.name}`, file);
     
     // Create processing job
     const { data: job } = await supabase
       .from('processing_jobs')
       .insert({
         user_id: userId,
         account_id: accountId,
         file_url: fileData.path,
         file_name: file.name
       })
       .select()
       .single();
     
     // Trigger n8n workflow
     await fetch(N8N_WEBHOOK_URL, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         job_id: job.id,
         user_id: userId,
         account_id: accountId,
         file_url: getPublicUrl(fileData.path),
         file_name: file.name,
         user_categories: await getUserCategories(userId),
         account_info: await getAccountInfo(accountId)
       })
     });
     
     return job.id;
   };
   ```

2. **n8n Processing**
   ```javascript
   // n8n Function Node: Process File
   const processFile = async () => {
     const { job_id, file_url, user_categories, account_info } = $json;
     
     try {
       // Update status to processing
       await updateJobStatus(job_id, 'processing');
       
       // Download and process file
       const fileContent = await downloadFile(file_url);
       const extractedTransactions = await extractWithAI(fileContent, user_categories);
       
       // Deduplicate against existing transactions
       const newTransactions = await deduplicateTransactions(extractedTransactions, account_info);
       
       // Save to database
       const savedTransactions = await saveTransactions(newTransactions, account_info);
       
       // Update job status
       await updateJobStatus(job_id, 'completed', {
         transactions_extracted: extractedTransactions.length,
         transactions_new: savedTransactions.length,
         transactions_duplicates: extractedTransactions.length - savedTransactions.length
       });
       
       return { success: true, transactions: savedTransactions };
     } catch (error) {
       await updateJobStatus(job_id, 'failed', { error_message: error.message });
       throw error;
     }
   };
   ```

3. **Frontend Real-time Updates**
   ```typescript
   // Real-time job status updates
   useEffect(() => {
     const subscription = supabase
       .channel(`processing_job_${jobId}`)
       .on('postgres_changes', {
         event: 'UPDATE',
         schema: 'public',
         table: 'processing_jobs',
         filter: `id=eq.${jobId}`
       }, (payload) => {
         const updatedJob = payload.new as ProcessingJob;
         setJobStatus(updatedJob.status);
         
         if (updatedJob.status === 'completed') {
           // Refresh transactions list
           refetchTransactions();
           showSuccessMessage(updatedJob);
         } else if (updatedJob.status === 'failed') {
           showErrorMessage(updatedJob.error_message);
         }
       })
       .subscribe();
     
     return () => subscription.unsubscribe();
   }, [jobId]);
   ```

## 6. Security Architecture

### 6.1 Authentication & Authorization

#### Supabase Auth Configuration
```typescript
// lib/supabase.ts
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Auth helper functions
export const getCurrentUser = () => supabase.auth.getUser();
export const signIn = (email: string, password: string) => 
  supabase.auth.signInWithPassword({ email, password });
export const signUp = (email: string, password: string) => 
  supabase.auth.signUp({ email, password });
```

#### Row Level Security Policies
```sql
-- Ensure users can only access their own data
CREATE POLICY "Users can only access own data" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own accounts" ON savings_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own processing jobs" ON processing_jobs
  FOR SELECT USING (auth.uid() = user_id);
```

### 6.2 Data Security

#### File Storage Security
```sql
-- Storage bucket policies
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'statements' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'statements' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### API Security
```typescript
// Middleware for API routes
const requireAuth = async (req: Request) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No authorization token');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');
  
  return user;
};

// Feature access control
const requirePremium = async (userId: string) => {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_expires_at')
    .eq('id', userId)
    .single();
  
  const isPremium = profile?.subscription_tier === 'premium' && 
    new Date(profile.subscription_expires_at) > new Date();
  
  if (!isPremium) {
    throw new Error('Premium subscription required');
  }
};
```

## 7. Performance Architecture

### 7.1 Frontend Performance

#### Code Splitting & Lazy Loading
```typescript
// Lazy load premium features
const FileUpload = lazy(() => import('../components/upload/FileUpload'));
const AdvancedAnalytics = lazy(() => import('../components/analytics/Advanced'));

// Route-based code splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Transactions = lazy(() => import('../pages/Transactions'));
```

#### Caching Strategy
```typescript
// React Query for server state caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Zustand with persistence
const useTransactionsStore = create(
  persist(
    (set, get) => ({
      transactions: [],
      lastFetch: null,
      // ... store implementation
    }),
    {
      name: 'transactions-storage',
      partialize: (state) => ({ 
        lastFetch: state.lastFetch 
      }),
    }
  )
);
```

### 7.2 Database Performance

#### Query Optimization
```sql
-- Optimized transaction queries with proper indexes
CREATE INDEX CONCURRENTLY idx_transactions_user_date_type 
  ON transactions(user_id, transaction_date DESC, transaction_type);

CREATE INDEX CONCURRENTLY idx_transactions_account_date 
  ON transactions(account_id, transaction_date DESC);

-- Materialized view for dashboard stats
CREATE MATERIALIZED VIEW user_monthly_stats AS
SELECT 
  user_id,
  DATE_TRUNC('month', transaction_date) as month,
  transaction_type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', transaction_date), transaction_type;

-- Refresh stats daily
CREATE OR REPLACE FUNCTION refresh_monthly_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_monthly_stats;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Processing Performance

#### n8n Workflow Optimization
- **Parallel Processing**: Process multiple files simultaneously
- **Chunked Processing**: Split large files into smaller chunks
- **Caching**: Cache AI responses for similar transactions
- **Error Recovery**: Retry failed operations with exponential backoff

## 8. Monitoring & Observability

### 8.1 Application Monitoring

#### Frontend Monitoring
```typescript
// Error boundary with logging
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    console.error('Application Error:', error, errorInfo);
    
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Sentry, LogRocket, or similar
      captureException(error, { extra: errorInfo });
    }
  }
}

// Performance monitoring
const trackPageLoad = (pageName: string) => {
  const startTime = performance.now();
  
  return () => {
    const loadTime = performance.now() - startTime;
    analytics.track('Page Load', {
      page: pageName,
      loadTime: Math.round(loadTime),
    });
  };
};
```

#### Backend Monitoring
```sql
-- Database monitoring queries
CREATE VIEW processing_job_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processing_completed_at - processing_started_at))) as avg_processing_time
FROM processing_jobs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), status;
```

### 8.2 Business Metrics

#### Key Performance Indicators
```typescript
// Analytics tracking
const trackUserAction = (action: string, properties?: object) => {
  analytics.track(action, {
    userId: user.id,
    timestamp: new Date().toISOString(),
    ...properties
  });
};

// Business metrics
const businessMetrics = {
  // User engagement
  trackSignup: () => trackUserAction('User Signup'),
  trackLogin: () => trackUserAction('User Login'),
  trackFeatureUsage: (feature: string) => trackUserAction('Feature Used', { feature }),
  
  // Conversion metrics
  trackTrialStart: () => trackUserAction('Trial Started'),
  trackUpgrade: (plan: string) => trackUserAction('Upgraded to Premium', { plan }),
  trackChurn: () => trackUserAction('User Churned'),
  
  // Product metrics
  trackFileUpload: (fileType: string) => trackUserAction('File Uploaded', { fileType }),
  trackTransactionAdded: (method: 'manual' | 'ai') => trackUserAction('Transaction Added', { method }),
};
```

## 9. Deployment Architecture

### 9.1 Environment Configuration

#### Development Environment
```bash
# .env.development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/process-statement
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENVIRONMENT=development
```

#### Production Environment
```bash
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_N8N_WEBHOOK_URL=https://your-n8n.app/webhook/process-statement
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_ENVIRONMENT=production
```

### 9.2 Deployment Pipeline

#### Vercel Deployment Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

#### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 9. AI Processing Pipeline Architecture

### 9.1 Enhanced n8n Workflow Design

#### Processing Pipeline Overview
```
┌─────────────┐  webhook  ┌──────────────┐  file    ┌─────────────┐
│  Frontend   │──────────►│   n8n        │◄────────►│  Supabase   │
│  File Upload│           │  Workflow    │          │  Storage    │
└─────────────┘           └──────────────┘          └─────────────┘
                               │                           │
                               │ AI Processing             │ Real-time
                               ▼                           ▼ Updates
                        ┌─────────────┐              ┌─────────────┐
                        │ AI Models   │              │ Database    │
                        │ OpenAI/     │              │ Jobs Table  │
                        │ Anthropic   │              │ Realtime    │
                        └─────────────┘              └─────────────┘
```

#### Workflow Node Architecture
```javascript
// Enhanced n8n Workflow Structure (14 nodes)
const workflowNodes = {
  1: "Webhook Trigger (with rate limiting)",
  2: "Request Validation & Authentication", 
  3: "Initialize Processing (Update Job Status: 'processing')",
  4: "File Security Check & Download from Supabase Storage",
  5: "File Content Extraction (PDF/CSV with validation)", 
  6: "Get User Context (Categories, Existing Transactions, Preferences)",
  7: "AI Processing with Retry Logic (User-Aware, Multi-model failover)",
  8: "Transaction Validation & Category Mapping",
  9: "Advanced Deduplication with Confidence Scoring",
  10: "Transaction Batch Processing & Save to Supabase",
  11: "Account Balance Calculation & Update", 
  12: "Success Notification & Job Completion",
  13: "Comprehensive Error Handler with Recovery",
  14: "Processing Analytics & Metrics Collection"
};
```

### 9.2 Multi-Model AI Failover System

#### AI Model Priority & Failover
```javascript
// AI Model Configuration with Failover Logic
const aiModels = [
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    priority: 1,
    costPerToken: 0.000150,
    reliability: 0.95,
    averageResponseTime: '15s'
  },
  {
    provider: 'anthropic', 
    model: 'claude-3-5-sonnet',
    priority: 2,
    costPerToken: 0.003,
    reliability: 0.93,
    averageResponseTime: '25s'
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    priority: 3,
    costPerToken: 0.001,
    reliability: 0.88,
    averageResponseTime: '10s'
  }
];

// Failover Implementation in n8n
const processWithFailover = async (fileContent, userContext) => {
  for (const model of aiModels) {
    try {
      console.log(`🤖 Attempting processing with ${model.provider}/${model.model}`);
      
      const result = await processWithModel(model, fileContent, userContext);
      
      if (result.success && result.transactions.length > 0) {
        // Log successful model usage for analytics
        await logModelUsage(model, result.processingTime, result.transactions.length);
        return { ...result, modelUsed: model };
      }
    } catch (error) {
      console.warn(`⚠️ ${model.provider} failed: ${error.message}`);
      await logModelFailure(model, error);
      continue;
    }
  }
  
  throw new Error('All AI models failed to process the document');
};
```

#### Enhanced AI Prompt Engineering
```javascript
// Context-Aware AI Prompt Template
const generateAIPrompt = (fileContent, userContext) => {
  const { userCategories, existingTransactions, accountInfo, preferences } = userContext;
  
  return `
CRITICAL: RETURN ONLY JSON. NO EXPLANATIONS OR ADDITIONAL TEXT.

You are processing a bank statement for VaultWise Dashboard. Extract ALL transactions with maximum accuracy.

STATEMENT INFORMATION:
- File: ${accountInfo.fileName}
- Account: ${accountInfo.name} (${accountInfo.type})
- Currency: ${accountInfo.currency}
- User Preferences: ${JSON.stringify(preferences)}

USER'S EXISTING CATEGORIES (Use ONLY these categories):
${userCategories.map(cat => 
  `- ${cat.name}: Keywords[${cat.keywords?.join(', ') || 'none'}]`
).join('\n')}

TRANSACTION EXTRACTION RULES:
1. DATE FORMAT: Convert ALL dates to YYYY-MM-DD format
2. EXTRACT EVERYTHING: Include ALL visible transactions, ignore balance entries
3. TRANSACTION TYPES:
   - "income": Salary, deposits, refunds, interest, credits, transfers in
   - "expense": Purchases, withdrawals, bills, fees, debits, transfers out
4. CATEGORIZATION: Map to user's categories using keywords and transaction descriptions
5. AMOUNTS: Always positive numbers (type field indicates income/expense)
6. CONFIDENCE: Rate extraction confidence 0.0-1.0 for each transaction

DEDUPLICATION CONTEXT (Avoid these recent transactions):
${existingTransactions.slice(0, 50).map(txn => 
  `- ${txn.transaction_date}: ${txn.currency_symbol}${txn.amount} - ${txn.description}`
).join('\n')}

REQUIRED JSON OUTPUT SCHEMA:
{
  "bank_name": "Auto-detected bank name",
  "account_type": "${accountInfo.type}",
  "currency": "${accountInfo.currency}",
  "statement_period": {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD"
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Clean transaction description",
      "amount": 1234.56,
      "type": "income|expense", 
      "category": "User Category Name (must match exactly)",
      "confidence": 0.95,
      "raw_text": "Original text from statement"
    }
  ]
}

STATEMENT CONTENT TO PROCESS:
${fileContent}

RETURN ONLY THE JSON OBJECT. NO OTHER TEXT.
  `;
};
```

### 9.3 Advanced Deduplication Engine

#### Confidence-Based Duplicate Detection
```javascript
// Advanced Deduplication Algorithm
const advancedDeduplication = (newTransactions, existingTransactions) => {
  const duplicateThresholds = {
    HIGH_CONFIDENCE: 85,    // Likely duplicate
    MEDIUM_CONFIDENCE: 65,  // Possible duplicate - needs review  
    LOW_CONFIDENCE: 40      // Probably unique
  };
  
  const calculateDuplicateScore = (newTxn, existingTxn) => {
    let score = 0;
    
    // 1. Date Similarity (40 points max)
    const dateDiff = Math.abs(
      new Date(newTxn.date) - new Date(existingTxn.transaction_date)
    );
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 0) score += 40;
    else if (daysDiff <= 1) score += 25;
    else if (daysDiff <= 3) score += 10;
    
    // 2. Amount Similarity (30 points max)
    const amountDiff = Math.abs(newTxn.amount - existingTxn.amount);
    const amountPercent = amountDiff / Math.max(existingTxn.amount, 0.01);
    
    if (amountDiff === 0) score += 30;
    else if (amountPercent <= 0.01) score += 20; // Within 1%
    else if (amountPercent <= 0.05) score += 10; // Within 5%
    
    // 3. Description Similarity (20 points max)  
    const descSimilarity = calculateLevenshteinSimilarity(
      normalizeDescription(newTxn.description),
      normalizeDescription(existingTxn.description)
    );
    score += Math.round(descSimilarity * 20);
    
    // 4. Transaction Type Match (10 points max)
    if (newTxn.type === existingTxn.transaction_type) score += 10;
    
    return Math.min(score, 100); // Cap at 100
  };
  
  // Process each new transaction
  const processedTransactions = newTransactions.map(newTxn => {
    const duplicateScores = existingTransactions.map(existingTxn => ({
      score: calculateDuplicateScore(newTxn, existingTxn),
      existingTransaction: existingTxn
    }));
    
    const maxScore = Math.max(...duplicateScores.map(ds => ds.score), 0);
    const bestMatch = duplicateScores.find(ds => ds.score === maxScore);
    
    // Determine duplicate status
    let duplicateStatus = 'unique';
    if (maxScore >= duplicateThresholds.HIGH_CONFIDENCE) {
      duplicateStatus = 'likely_duplicate';
    } else if (maxScore >= duplicateThresholds.MEDIUM_CONFIDENCE) {
      duplicateStatus = 'possible_duplicate';
    }
    
    return {
      ...newTxn,
      duplicate_status: duplicateStatus,
      duplicate_score: maxScore,
      duplicate_match: bestMatch?.existingTransaction || null
    };
  });
  
  // Filter based on confidence
  const uniqueTransactions = processedTransactions.filter(
    txn => txn.duplicate_status === 'unique'
  );
  
  const needsReview = processedTransactions.filter(
    txn => txn.duplicate_status === 'possible_duplicate'
  );
  
  return {
    unique: uniqueTransactions,
    needsReview: needsReview,
    duplicates: processedTransactions.filter(
      txn => txn.duplicate_status === 'likely_duplicate'
    ),
    stats: {
      total_extracted: newTransactions.length,
      unique_count: uniqueTransactions.length,
      needs_review_count: needsReview.length,
      duplicate_count: processedTransactions.length - uniqueTransactions.length - needsReview.length
    }
  };
};
```

### 9.4 Real-time Status & Monitoring

#### Processing Job Status States
```javascript
// Processing Job State Machine
const processingStates = {
  PENDING: 'pending',           // Job created, waiting to start
  PROCESSING: 'processing',     // File being processed by AI
  EXTRACTING: 'extracting',     // AI extracting transactions
  DEDUPLICATING: 'deduplicating', // Running deduplication logic
  SAVING: 'saving',            // Writing to database
  COMPLETED: 'completed',       // Successfully completed
  FAILED: 'failed',            // Failed with error
  CANCELLED: 'cancelled'        // User cancelled processing
};

// Status Update Implementation
const updateProcessingStatus = async (jobId, status, metadata = {}) => {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...metadata
  };
  
  // Add timestamps for specific states
  const timestampFields = {
    [processingStates.PROCESSING]: 'processing_started_at',
    [processingStates.COMPLETED]: 'processing_completed_at', 
    [processingStates.FAILED]: 'processing_completed_at'
  };
  
  if (timestampFields[status]) {
    updateData[timestampFields[status]] = new Date().toISOString();
  }
  
  // Update job in database
  await supabaseClient
    .from('processing_jobs')
    .update(updateData)
    .eq('id', jobId);
  
  // Log status change for monitoring
  console.log(`📊 Job ${jobId}: ${status}`, metadata);
};
```

#### Processing Analytics & Metrics
```javascript
// Comprehensive Metrics Collection
const collectProcessingMetrics = (jobData, processingResult) => {
  const {
    job_id,
    user_id, 
    file_name,
    file_size_bytes,
    processing_start_time,
    modelUsed,
    deduplicationStats
  } = jobData;
  
  const processingTime = Date.now() - processing_start_time;
  const transactionsPerMinute = (processingResult.transactions.length / (processingTime / 60000)).toFixed(2);
  
  return {
    // Basic metrics
    job_id,
    user_id,
    processing_time_ms: processingTime,
    processing_time_minutes: (processingTime / 60000).toFixed(2),
    
    // File metrics
    file_name,
    file_size_bytes,
    file_size_mb: (file_size_bytes / 1048576).toFixed(2),
    
    // AI metrics
    ai_model_used: `${modelUsed.provider}/${modelUsed.model}`,
    ai_processing_cost_estimate: calculateProcessingCost(modelUsed, processingResult),
    ai_confidence_average: calculateAverageConfidence(processingResult.transactions),
    
    // Transaction metrics
    transactions_extracted: processingResult.transactions.length,
    transactions_per_minute: transactionsPerMinute,
    transactions_income: processingResult.transactions.filter(t => t.type === 'income').length,
    transactions_expense: processingResult.transactions.filter(t => t.type === 'expense').length,
    
    // Deduplication metrics
    deduplication_rate: (deduplicationStats.duplicate_count / deduplicationStats.total_extracted).toFixed(3),
    unique_transactions: deduplicationStats.unique_count,
    needs_review_count: deduplicationStats.needs_review_count,
    
    // Quality metrics
    categorization_success_rate: calculateCategorizationRate(processingResult.transactions),
    extraction_confidence_score: calculateOverallConfidence(processingResult),
    
    // Timestamps
    processing_date: new Date().toISOString().split('T')[0],
    processing_hour: new Date().getHours(),
    timestamp: new Date().toISOString()
  };
};
```

### 9.5 Error Handling & Recovery

#### Comprehensive Error Recovery System
```javascript
// Error Classification and Recovery
const errorHandling = {
  // Retryable errors (automatic retry)
  retryableErrors: [
    'network_timeout',
    'api_rate_limit',
    'temporary_service_unavailable',
    'database_connection_timeout'
  ],
  
  // User-fixable errors (notify user)
  userErrors: [
    'invalid_file_format',
    'file_too_large',
    'corrupted_file',
    'unsupported_bank_format'
  ],
  
  // System errors (alert developers)
  systemErrors: [
    'ai_model_permanent_failure',
    'database_schema_error',
    'authentication_failure',
    'configuration_error'
  ]
};

// Error Recovery Implementation
const handleProcessingError = async (error, jobId, retryCount = 0) => {
  const maxRetries = 3;
  const errorType = classifyError(error);
  
  // Log error with context
  console.error(`❌ Processing error for job ${jobId}:`, {
    error: error.message,
    type: errorType,
    retryCount,
    timestamp: new Date().toISOString()
  });
  
  switch (errorType) {
    case 'retryable':
      if (retryCount < maxRetries) {
        // Exponential backoff retry
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        
        await updateProcessingStatus(jobId, 'processing', {
          retry_count: retryCount + 1,
          last_error: error.message
        });
        
        setTimeout(() => {
          retryProcessing(jobId, retryCount + 1);
        }, delay);
        
        return;
      }
      // Fall through to permanent failure
      
    case 'user_error':
      await updateProcessingStatus(jobId, 'failed', {
        error_message: getUserFriendlyErrorMessage(error),
        error_type: errorType,
        retry_count: retryCount
      });
      break;
      
    case 'system_error':
      await updateProcessingStatus(jobId, 'failed', {
        error_message: 'Internal system error occurred',
        error_type: errorType,
        technical_error: error.message
      });
      
      // Alert development team
      await sendDeveloperAlert({
        severity: 'high',
        jobId,
        error: error.message,
        context: { retryCount, timestamp: new Date().toISOString() }
      });
      break;
  }
};
```

## 10. Scalability Considerations

### 10.1 Database Scalability
- **Connection Pooling**: Supabase handles this automatically
- **Read Replicas**: Available in Supabase Pro plan
- **Partitioning**: Partition transactions table by date if needed
- **Archiving**: Archive old transactions to separate tables

### 10.2 Processing Scalability
- **n8n Cloud**: Auto-scaling workflow execution
- **Queue Management**: Use n8n's built-in queue system
- **Rate Limiting**: Implement rate limits for file uploads
- **Batch Processing**: Process multiple files in batches

### 10.3 Frontend Scalability
- **CDN**: Vercel's global CDN for static assets
- **Code Splitting**: Lazy load components and routes
- **Image Optimization**: Use Vercel's image optimization
- **Bundle Analysis**: Regular bundle size monitoring

---

**Document Version**: 1.0  
**Last Updated**: December 29, 2024  
**Next Review**: January 15, 2025  
**Owner**: Engineering Team