# VaultWise Development Guide

**Version**: 2.0  
**Last Updated**: January 6, 2025

Complete guide to setting up VaultWise for local development.

---

## ⚡ Quick Start (5 Minutes)

**For experienced developers who want to get running fast:**

```bash
# 1. Clone + Install
git clone https://github.com/Srinidhi94/vaultwise-dash.git
cd vaultwise-dash
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Start development server
npm run dev
# Opens at http://localhost:8080

# 4. Sign up and start using!
```

**That's it!** The database is already set up in the Supabase project. Skip to [Common Tasks](#-common-development-tasks) for day-to-day development workflows.

---

## 📋 Prerequisites

### Required Software

- **Node.js**: 18.0 or higher ([Download](https://nodejs.org/))
- **npm**: 9.0 or higher (comes with Node.js)
- **Git**: Latest version ([Download](https://git-scm.com/))

### Required Accounts

- **Supabase Account**: [supabase.com](https://supabase.com)

### Optional Tools

- **VS Code**: Recommended IDE ([Download](https://code.visualstudio.com/))
- **Supabase CLI**: For database management ([Docs](https://supabase.com/docs/guides/cli))

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Srinidhi94/vaultwise-dash.git
cd vaultwise-dash
```

### 2. Install Dependencies

```bash
npm install
```

If you encounter peer dependency issues:
```bash
npm install --legacy-peer-deps
```

### 3. Configure Environment Variables

Create `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://huxhlktqxdkafbjtbwyr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in terminal)

---

## 🗄️ Database Setup

### Option A: Use Existing Supabase Project

**Project ID**: `huxhlktqxdkafbjtbwyr`

1. Request access to the project
2. Get your `VITE_SUPABASE_ANON_KEY` from project settings
3. All migrations are already applied

### Option B: Create New Supabase Project

#### Step 1: Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in details:
   - **Name**: VaultWise (or your choice)
   - **Database Password**: Strong password (save it!)
   - **Region**: Choose closest to you
4. Wait ~2 minutes for project creation

#### Step 2: Get API Credentials

1. Go to **Settings** → **API**
2. Copy **Project URL** → Use as `VITE_SUPABASE_URL`
3. Copy **anon public** key → Use as `VITE_SUPABASE_ANON_KEY`
4. Update `.env.local`

#### Step 3: Run Database Migrations

Using Supabase Dashboard (easier):

1. Go to **SQL Editor**
2. Open each migration file from `supabase/migrations/`
3. Copy and paste the SQL
4. Click "Run" for each migration in order

Using Supabase CLI (advanced):

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push
```

#### Step 4: Verify Setup

Run this SQL in the SQL Editor:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see:
-- categories
-- credit_cards
-- savings_accounts
-- transactions
-- user_profiles
```

#### Step 5: Create Default Categories

```sql
-- Insert default categories (income)
INSERT INTO categories (name, type, is_default) VALUES
  ('Salary', 'income', true),
  ('Business income', 'income', true),
  ('Freelance income', 'income', true),
  ('Others', 'income', true);

-- Insert default categories (expense)
INSERT INTO categories (name, type, is_default) VALUES
  ('Rent', 'expense', true),
  ('Utilities', 'expense', true),
  ('Groceries', 'expense', true),
  ('Dining out', 'expense', true),
  ('Transportation', 'expense', true),
  ('Healthcare', 'expense', true),
  ('Others', 'expense', true);
```

---

---

## 🧪 Testing Your Setup

### Test 1: Frontend Loads

```bash
npm run dev
```

✅ Should open without errors
✅ Should show auth page

### Test 2: Authentication

1. Click "Sign Up"
2. Enter email and password
3. Should receive confirmation email
4. Confirm email and sign in
5. Should redirect to Dashboard

### Test 3: Database Connection

After signing in:
- Dashboard should load without errors
- No transactions message should appear
- Settings page should load

### Test 4: Create Account

1. Go to **Accounts** page
2. Click **Add Account**
3. Fill in savings account details
4. Click **Save**
5. Account should appear in list

### Test 5: Create Transaction

1. Go to **Transactions** page
2. Click **+** button
3. Fill in transaction details
4. Select category and account
5. Click **Save**
6. Transaction should appear in list

### Test 6: Account Aggregator (AA) Sync

1. Go to **Accounts** page
2. Click **Connect bank account**
3. Grant consent via AA provider redirect
4. Wait for consent approval
5. Transactions should sync automatically

---

## 🛠️ Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

### Useful npm Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Building
npm run build        # Production build
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors

# Type Checking
npm run typecheck    # Check TypeScript types
```

### Browser DevTools

**Zustand Devtools**:
1. Install Redux DevTools extension
2. Open DevTools → Redux tab
3. See all Zustand store actions and state

**React Developer Tools**:
1. Install React DevTools extension
2. Open DevTools → Components/Profiler tabs
3. Inspect component tree and props

---

## 🔍 Troubleshooting

### Issue: `npm install` fails

**Solution 1**: Clear cache
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Solution 2**: Use legacy peer deps
```bash
npm install --legacy-peer-deps
```

### Issue: Supabase connection errors

**Symptoms**: "Invalid API key" or "Failed to fetch"

**Solutions**:
1. Verify `.env.local` has correct values
2. Check no extra spaces in environment variables
3. Restart dev server after changing `.env.local`
4. Verify Supabase project is not paused

### Issue: TypeScript errors

**Solution**:
```bash
# Restart TypeScript server
# In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or regenerate types
npm run build
```

### Issue: Hot reload not working

**Solutions**:
1. Check port 5173 is not in use
2. Try different browser
3. Clear browser cache
4. Restart dev server

### Issue: RLS policy errors

**Symptoms**: "permission denied for table X"

**Solution**: Check RLS policies in Supabase Dashboard
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Issue: Categories not showing

**Solution**: Insert default categories (see Database Setup Step 5)

---

## 📁 Project Structure

```
vaultwise-dash/
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components (don't modify)
│   │   ├── dashboard/     # Dashboard components
│   │   ├── accounts/      # Account components
│   │   ├── transactions/  # Transaction components
│   │   └── settings/      # Settings components
│   ├── pages/             # Page components
│   ├── stores/            # Zustand stores
│   ├── integrations/      # Supabase client
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utility functions
│   └── lib/               # Library configs
├── docs/                  # Documentation
├── public/                # Static assets
├── supabase/              # Supabase migrations
└── *.config.*             # Configuration files
```

---

## 🔐 Security Best Practices

### Environment Variables

- ✅ **DO**: Use `.env.local` for secrets
- ✅ **DO**: Add `.env.local` to `.gitignore`
- ❌ **DON'T**: Commit API keys to git
- ❌ **DON'T**: Share your `service_role` key

### API Keys

- **anon key**: Safe for frontend (has RLS restrictions)
- **service_role key**: Backend only (bypasses RLS)
- Store service_role key in Edge Function env only

### Database

- All tables have RLS enabled
- Users can only access their own data
- Never use `service_role` key in frontend

---

## 🛠️ Common Development Tasks

### Task 1: Adding a New Page

```bash
# 1. Create page component
# File: src/pages/MyNewPage.tsx

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

export function MyNewPage() {
  const { user } = useAuthStore();

  useEffect(() => {
    // Fetch data on mount
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">My New Page</h1>
      {/* Page content */}
    </div>
  );
}

# 2. Add route
# File: src/App.tsx

import { MyNewPage } from '@/pages/MyNewPage';

<Route path="/my-new-page" element={<MyNewPage />} />

# 3. Add navigation link (if needed)
# File: src/components/layout/BottomNav.tsx
```

### Task 2: Creating a New Component

```bash
# 1. Create component file
# File: src/components/dashboard/MyWidget.tsx

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface MyWidgetProps {
  data: DataType;
  onAction: () => void;
}

export function MyWidget({ data, onAction }: MyWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Widget</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Widget content */}
      </CardContent>
    </Card>
  );
}

# 2. Use in parent component
# File: src/pages/Dashboard.tsx

import { MyWidget } from '@/components/dashboard/MyWidget';

<MyWidget data={data} onAction={handleAction} />
```

### Task 3: Adding a New Zustand Store

```bash
# 1. Create store file
# File: src/stores/useMyStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface Item {
  id: string;
  name: string;
}

interface MyStoreState {
  items: Item[];
  loading: boolean;
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<Item, 'id'>) => Promise<void>;
}

export const useMyStore = create<MyStoreState>()(  
  devtools(
    (set) => ({
      items: [],
      loading: false,

      fetchItems: async () => {
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('my_table')
            .select('*');
          if (error) throw error;
          set({ items: data || [], loading: false });
        } catch (error) {
          console.error('Fetch error:', error);
          set({ loading: false });
        }
      },

      addItem: async (item) => {
        const { data, error } = await supabase
          .from('my_table')
          .insert([item])
          .select()
          .single();
        if (error) throw error;
        set((state) => ({ items: [...state.items, data] }));
      }
    }),
    { name: 'my-store' }
  )
);

# 2. Use in component
import { useMyStore } from '@/stores/useMyStore';

function MyComponent() {
  const { items, loading, fetchItems } = useMyStore();
  
  useEffect(() => {
    fetchItems();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  return <div>{items.map(...)}</div>;
}
```

### Task 4: Adding a Database Migration

```bash
# 1. Create migration file
# File: supabase/migrations/YYYYMMDDHHMMSS_description.sql

-- Add new column
ALTER TABLE transactions 
ADD COLUMN receipt_url TEXT;

-- Create new table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  amount DECIMAL(12,2) NOT NULL,
  period VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view own budgets"
ON budgets FOR SELECT
USING (auth.uid() = user_id);

# 2. Apply migration
# Option A: Supabase Dashboard SQL Editor
# - Copy migration SQL
# - Paste in SQL Editor
# - Click "Run"

# Option B: Supabase CLI
supabase db push
```

### Task 5: Debugging Tips

**Using Browser DevTools**:
```bash
# 1. Open DevTools (F12 or Cmd+Option+I)

# 2. Check Console for errors
console.log('Debug value:', value);
console.error('Error:', error);

# 3. Use Network tab
# - Check API calls
# - Verify request/response
# - Check status codes

# 4. Use Redux DevTools for Zustand
# - See all store actions
# - Time-travel debugging
# - State inspection
```

**Using VS Code Debugger**:
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:8080",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

**Common Debugging Scenarios**:
```typescript
// Check if data is loading
console.log('Loading:', loading, 'Data:', data);

// Check store state
const state = useTransactionsStore.getState();
console.log('Store state:', state);

// Check Supabase response
const { data, error } = await supabase.from('table').select('*');
console.log('Supabase response:', { data, error });

// Check RLS policies
console.log('User ID:', auth.uid());
```

### Task 6: Performance Optimization

**Optimize Component Rendering**:
```typescript
import { memo, useMemo } from 'react';

// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize component to prevent re-renders
export const ExpensiveComponent = memo(function ExpensiveComponent(props) {
  return <div>{props.data}</div>;
});
```

**Optimize Database Queries**:
```typescript
// Bad: Multiple queries
const accounts = await supabase.from('accounts').select('*');
const transactions = await supabase.from('transactions').select('*');

// Good: Single query with join (if needed)
const { data } = await supabase
  .from('accounts')
  .select('*, transactions(*)');

// Good: Fetch once, cache in Zustand
const { transactions } = useTransactionsStore();
// Don't re-fetch on every render
```

---

## 📚 Additional Resources

### Documentation

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

### Internal Docs

- [Architecture](./ARCHITECTURE.md) - Technical architecture
- [Contributing](./CONTRIBUTING.md) - Development guidelines
- [README](../README.md) - Project overview

---

## ✅ Setup Verification Checklist

Before starting development, verify:

- [ ] Node.js 18+ installed (`node -v`)
- [ ] npm installed (`npm -v`)
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with valid credentials
- [ ] Dev server starts (`npm run dev`)
- [ ] Can sign up and sign in
- [ ] Dashboard loads
- [ ] Can create account
- [ ] Can create transaction
- [ ] No console errors

---

## 🚀 Ready to Develop!

Your development environment is now set up. Check the [Contributing Guide](./CONTRIBUTING.md) for development workflow and coding standards.

**Happy coding!** 🎉

---

**Need Help?**
- Check [Troubleshooting](#troubleshooting) section
- Review [Architecture Docs](./ARCHITECTURE.md)
- Check archived docs in `docs/archive/` for historical context

---

---

## 📚 Related Documentation

- **[Product Requirements](./PRD.md)** - Feature roadmap and business goals
- **[Ideal Customer Profile](./ICP.md)** - Target user personas  
- **[Architecture](./ARCHITECTURE.md)** - Technical architecture
- **[Contributing](./CONTRIBUTING.md)** - Code standards and workflow
- **[README](../README.md)** - Project overview

---

**Version**: 2.0  
**Last Updated**: January 6, 2025  
**Status**: Production-Ready MVP
