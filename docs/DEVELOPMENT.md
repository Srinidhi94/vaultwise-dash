# Development Setup Guide

Complete guide to setting up VaultWise for local development.

---

## 📋 Prerequisites

### Required Software

- **Node.js**: 18.0 or higher ([Download](https://nodejs.org/))
- **npm**: 9.0 or higher (comes with Node.js)
- **Git**: Latest version ([Download](https://git-scm.com/))

### Required Accounts

- **Supabase Account**: [supabase.com](https://supabase.com)
- **n8n Cloud Account** (for AI processing): [n8n.io](https://n8n.io)

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
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# n8n Webhook (for AI statement processing)
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/vaultwise-process
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

## 🤖 n8n Setup (AI Processing)

### Option A: Use Existing Workflow

Request access to the shared n8n workspace:
- **Instance**: venom94.app.n8n.cloud
- **Workflow**: "VaultWise Statement Processor - Optimized"
- **Webhook URL**: `https://venom94.app.n8n.cloud/webhook/vaultwise-process`

### Option B: Create Your Own n8n Instance

#### Step 1: Create n8n Cloud Account

1. Go to [n8n.io/cloud](https://n8n.io/cloud)
2. Sign up for free trial or paid plan
3. Create a new workspace

#### Step 2: Import Workflow

1. Contact for workflow export JSON
2. In n8n, go to **Workflows** → **Import from File**
3. Upload the JSON file

#### Step 3: Configure Credentials

You'll need to set up:

**Supabase API**:
- URL: Your Supabase project URL
- Key: Your `service_role` key (from Supabase Settings → API)

**OpenAI API**:
- API Key: Get from [platform.openai.com](https://platform.openai.com/api-keys)
- Model: gpt-4.1-mini

**Anthropic API** (optional):
- API Key: Get from [console.anthropic.com](https://console.anthropic.com/)
- Model: claude-sonnet-4

#### Step 4: Activate Workflow

1. Open the workflow
2. Click **Active** toggle in top right
3. Copy the webhook URL
4. Update `VITE_N8N_WEBHOOK_URL` in `.env.local`

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

### Test 6: AI Processing (if n8n configured)

1. Go to **Accounts** page
2. Click **Upload Statement**
3. Select a test PDF/CSV bank statement
4. Click **Process**
5. Wait 30-120 seconds
6. Should see success message
7. Transactions should appear in dashboard

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

### Issue: n8n workflow fails

**Check**:
1. Workflow is **Active**
2. All credentials are configured
3. Supabase credentials use `service_role` key
4. OpenAI API key is valid
5. Check execution logs in n8n

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
- Store service_role key in n8n credentials only

### Database

- All tables have RLS enabled
- Users can only access their own data
- Never use `service_role` key in frontend

---

## 📚 Additional Resources

### Documentation

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Supabase Docs](https://supabase.com/docs)
- [n8n Documentation](https://docs.n8n.io)
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

Optional (for AI processing):
- [ ] n8n workflow access or created
- [ ] Webhook URL configured
- [ ] Can upload and process statement

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

**Last Updated**: October 4, 2025
