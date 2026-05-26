# VaultWise / SpendWise — Project Deep Dive

> **Code-grounded reference**, generated from a full walkthrough of `src/`, `supabase/migrations/`, `docs/`, and git history. Every claim below is observable in the repo unless explicitly flagged as **(uncertainty)**.
>
> **Last synthesized**: see commit at time of writing (`5ec95fe`).

---

## 1. Executive Summary

VaultWise (rebranded to **SpendWise** in commit `30696f5`) is a mobile-first personal finance dashboard. It started as a Lovable.dev-scaffolded React/TS app talking to Supabase for manual transaction tracking, then added automated bank-account sync via India’s Account Aggregator (AA) framework.

- **Type**: Web SPA (Vite + React 18 + TS) wrapped for iOS via Capacitor.
- **Backend**: Supabase (`huxhlktqxdkafbjtbwyr`, region ap-south-1 Mumbai).
- **Bank Sync**: Supabase Edge Function (`aa-proxy`) integrating with Setu AA provider.
- **State**: Zustand stores; React Query is mounted (`@/components/ui/toaster`-level `QueryClientProvider`) but not actually used for data fetching — stores call Supabase directly.
- **Maturity**: Solid MVP for manual flow + AA bank sync.

---

## 2. Product Vision (PRD/ICP distilled)

- **Value prop**: "Track your finances effortlessly — connect your bank accounts and let SpendWise do the rest."
- **Primary persona**: Indian tech-savvy professional, 25–35, ₹10–30 LPA, 2–4 accounts (`@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/docs/ICP.md:8-31`).
- **Pricing model** (planned): Free (3 accounts max, manual only) vs Premium ($5/mo, AA bank sync, unlimited accounts). 7-day trial.
- **Roadmap status**: Phase 1 (MVP) done; Phase 2 (AA integration) done; Phase 3 (PWA) planned; Phase 4 (budgets/recurring/multi-currency) future.

---

## 3. Tech Stack

| Layer | Choice | Version (from `package.json`) |
|---|---|---|
| Build | Vite + `@vitejs/plugin-react-swc` | 5.4 / 3.11 |
| UI runtime | React + ReactDOM | 18.3.1 |
| Language | TypeScript | 5.8 |
| Styling | Tailwind CSS + `tailwindcss-animate` + `@tailwindcss/typography` | 3.4 |
| Components | shadcn/ui (~50 components in `src/components/ui/`) on Radix primitives | — |
| Icons | `lucide-react` | 0.462 |
| State | `zustand` (+ `devtools`, `persist`) | 5.0 |
| Server state | `@tanstack/react-query` (provider only; not used for fetching) | 5.83 |
| Routing | `react-router-dom` | 6.30 |
| Forms | `react-hook-form` + `@hookform/resolvers`, both Yup **and** Zod listed | 7.61 / 1.7 / 3.25 |
| Charts | `recharts` | 2.15 |
| Toasts | `sonner` + shadcn `toaster` (both mounted) | 1.7 |
| Date | `date-fns` | 4.1 |
| Export | `xlsx` | 0.18 |
| Backend SDK | `@supabase/supabase-js` | 2.57 |
| Mobile shell | Capacitor iOS (`capacitor.config.ts`, `ios/` folder) | n/a |
| Deploy | Vercel (`vercel.json`, `.npmrc` with `legacy-peer-deps`) | — |

`package.json` `name` is **`spendwise-dashboard`** v1.0.0 — confirms rebrand.

---

## 4. Repo Structure (top level)

```
vaultwise-dash/
├── src/                       # SPA source
│   ├── App.tsx                # Routing + auth gate
│   ├── main.tsx               # Entry
│   ├── pages/                 # 7 route pages
│   ├── components/
│   │   ├── ui/                # shadcn (~50 files, don't edit)
│   │   ├── layout/            # BottomNavigation only
│   │   ├── dashboard/         # 9 widgets (cards, charts, filters)
│   │   ├── accounts/          # 4 (Edit/Delete/Reactivate/UploadStatement)
│   │   ├── transactions/      # 7 (Add sheet+dialog, filters, edit, detail, bulk delete)
│   │   └── settings/          # 10 (subscription, currency, export, mgmt, categories, profile, password, reset)
│   ├── stores/                # 7 Zustand stores
│   ├── integrations/supabase/ # client.ts + generated types.ts
│   ├── hooks/                 # use-mobile, use-toast
│   ├── utils/                 # balance calc, credit utilization, number format, excel export
│   └── lib/                   # cn() helper (shadcn)
├── supabase/
│   ├── config.toml            # nearly empty
│   └── migrations/            # 6 SQL files (see §5)
├── docs/                      # ARCHITECTURE, PRD, ICP, DEVELOPMENT, CONTRIBUTING
├── ios/                       # Capacitor iOS wrapper
├── public/                    # static assets
├── finance-app-lovable-prompt.md   # original Lovable spec
├── capacitor.config.ts        # appId com.spendwise.app
├── vercel.json, vite.config.ts, tailwind.config.ts, tsconfig.*.json
├── .env, .env.local           # Supabase config (gitignored properly)
├── unlock_pdf.py / .sh        # standalone helper, unrelated to app runtime
└── requirements-pdf.txt       # pypdf + pycryptodome (helper only)
```

`unlock_pdf.py` + `requirements-pdf.txt` + `.venv/` are an unrelated helper kept in the repo. They are **not** part of the runtime.

---

## 5. Database & Supabase

### 5.1 Supabase project

- Project ref `huxhlktqxdkafbjtbwyr` is hard-coded as a fallback in `@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/integrations/supabase/client.ts:5-6`, along with a hard-coded anon JWT. Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` override at build time.
- Auth uses `localStorage` for session persistence + autoRefresh (`@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/integrations/supabase/client.ts:11-17`).

### 5.2 Migration timeline

| Date | File | Purpose |
|---|---|---|
| 2024-12-29 12:00 | `20241229120000_add_processing_jobs_and_subscription.sql` | Adds `subscription_tier/expires/trial_*` to `user_profiles`; creates **`processing_jobs`** table + indexes + RLS + `validate_account_exists()` constraint + `cleanup_old_processing_jobs()` + `processing_job_stats` view. **This is the "complex" approach.** |
| 2024-12-29 15:00 | `20241229150000_simplified_subscription_support.sql` | "Simplified" pass: re-adds subscription cols with `IF NOT EXISTS`, creates **`statements` storage bucket** (private, 10 MB, PDF/CSV only), storage RLS policies (only premium/trial users can upload), `get_user_context()` RPC, `check_account_limit()` trigger enforcing **3-account free-tier cap** on inserts to `savings_accounts` + `credit_cards`. |
| 2025-09-20 11:18:19 | `20250920111819_…f82506ca.sql` | Initial Lovable scaffold (created **after** the Dec migrations were committed — see §9): core tables `user_profiles`, `savings_accounts`, `credit_cards`, `categories`, `transactions`; indexes; full RLS; **10 default categories** trigger; `update_updated_at_column()` triggers. |
| 2025-09-20 11:18:50 | `20250920111850_…de10828d.sql` | Adds `SET search_path = public` to functions (security hardening). |
| 2025-09-28 04:29:34 | `20250928042934_…3c0a18e0.sql` | Same search-path fix re-applied via `CREATE OR REPLACE`; **adds `handle_new_user()` trigger on `auth.users`** that inserts a `user_profiles` row on signup. This is what makes signup "just work" without explicit profile creation in the client. |
| 2025-10-12 00:00 | `20251012000000_add_number_format_preference.sql` | Adds `user_profiles.number_format` enum (`indian`/`international`, default `indian`). |

### 5.3 Final schema (as reflected by generated `types.ts`)

```
auth.users (Supabase managed)
   └─◀── user_profiles(id PK = auth.users.id)
            ├ currency_symbol VARCHAR(5) DEFAULT '$'
            ├ number_format   VARCHAR(20) DEFAULT 'indian'  -- migration 6
            ├ subscription_tier / subscription_expires_at / trial_used / trial_expires_at  -- migration 1+2
            ├ display_name (used by useProfileStore — but NOT in types.ts; see §10)
            └ created_at / updated_at

   └─◀── savings_accounts(id, user_id, name, description, opening_balance, current_balance, is_active, …)
   └─◀── credit_cards(id, user_id, name, description, credit_limit, current_balance, is_active, …)
   └─◀── categories(id, user_id, name, icon, color, created_at)
   └─◀── transactions(id, user_id, transaction_date, amount, description,
                       transaction_type ∈ {income,expense},
                       account_type ∈ {savings,credit},
                       account_id UUID NOT NULL,            -- no FK enforced!
                       category_id → categories.id,
                       notes, created_at, updated_at)
```

Plus (from migration 1):
```
processing_jobs(...)        -- legacy, unused
processing_job_stats VIEW   -- legacy, unused
```

### 5.4 Notable schema observations / inconsistencies

- **`transactions.account_id` has no foreign key** in any migration; it's a bare UUID disambiguated by `account_type`. `CURRENT_STATUS.md` claims a normalized `accounts` table was added with FK constraints, but **no such migration exists in the repo** — if it exists, it was applied directly in the Supabase dashboard, not version-controlled.
- **`categories` schema mismatch**: migrations define `name, icon, color` (no `type` or `is_default`). However `@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/stores/useTransactionsStore.ts:101-116` selects `id, user_id, name, type, is_default, created_at` and `addCategory` inserts `type` and `is_default`. This means **either** (a) migration outside repo added the columns, **or** (b) those columns silently fail / return null at runtime. The generated `types.ts` (`@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/integrations/supabase/types.ts:17-43`) does not list them, suggesting types are stale. **(uncertainty — needs DB inspection)**.
- **Default category count**: migration trigger inserts **10** categories. README claims "32 default categories" — documentation drift.
- **Two competing subscription migrations** sit side-by-side. The simplified one runs second and uses `IF NOT EXISTS`, so it's idempotent. `processing_jobs` table exists in DB but is **not used by the frontend** (see §6).
- **`processing_jobs`** and **`get_user_context()` RPC** are legacy artifacts from a prior AI/n8n integration plan. Neither is used by the current app. Consider dropping.

### 5.5 RLS posture

All 5 core tables + `processing_jobs` have RLS enabled with per-action `auth.uid() = user_id` policies. Cascading `ON DELETE CASCADE` from `auth.users` propagates to all owned rows.

---

## 6. Frontend Architecture

### 6.1 Entry and routing

`@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/main.tsx` → renders `<App/>`.

`@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/App.tsx`:
- Wraps app in `QueryClientProvider`, `TooltipProvider`, two toasters (`Toaster` + `Sonner`), `BrowserRouter`.
- `ProtectedRoute` / `PublicRoute` gates redirect based on `useAuthStore` (`@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/App.tsx:18-44`).
- On mount: calls `useAuthStore.initialize()` and, once a user exists, `usePreferencesStore.load()` (`@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/App.tsx:50-59`).
- Routes: `/auth` (public), `/`, `/accounts`, `/transactions`, `/settings` (protected), `*` → `NotFound`.

### 6.2 Stores (Zustand)

| Store | Purpose | Notes |
|---|---|---|
| `useAuthStore` (`src/stores/useAuthStore.ts:1-118`) | Wraps Supabase Auth: `initialize`, `signIn`, `signUp`, `signOut`. Subscribes to `onAuthStateChange` + fetches initial session. | Comment at L67 confirms profile creation is delegated to the DB trigger (`handle_new_user`). |
| `useProfileStore` (`src/stores/useProfileStore.ts:1-93`) | Fetches `user_profiles` row, exposes `display_name`, `subscription_tier`, `isPaidUser()`. | Selects `*` so it works even though `types.ts` is stale. Tier values it knows: `'free' | 'paid'` (note: not `'premium'` — see §10). |
| `usePreferencesStore` (`src/stores/usePreferencesStore.ts:1-95`) | `currencySymbol`, `numberFormat` (`indian`/`international`). Read + write `user_profiles`. | Loaded once on auth. |
| `useAccountsStore` (`src/stores/useAccountsStore.ts:1-303`) | CRUD for savings + credit, inactivate/reactivate (soft) and hard delete (cascade). | **Balances are computed in-memory** via `recalculateBalances()` after every fetch and after any transaction mutation — see §6.4. |
| `useTransactionsStore` (`src/stores/useTransactionsStore.ts:1-467`) | Transactions + categories CRUD, filters (date/account/category/type/keyword), monthly aggregations, bulk delete. | Persisted to `sessionStorage` (filters + sort only, not transactions). Uses `category.type` & `is_default` which aren't in `types.ts` — see §5.4. |
| `useAccountAggregatorStore` (`src/stores/useAccountAggregatorStore.ts`) | AA consent lifecycle: create consent, poll status, fetch data. | Calls the `aa-proxy` Edge Function. |
| `useDashboardStore` (`src/stores/useDashboardStore.ts:1-53`) | UI-only: dashboard date range + selected account. Persists to `sessionStorage`. | |

**Cross-store coupling**: `useAccountsStore` and `useTransactionsStore` import each other via dynamic `import()` to avoid a static circular dependency (`src/stores/useAccountsStore.ts:232,250` and `src/stores/useTransactionsStore.ts:274,293,310,329`). Transaction mutations trigger account balance recalculation.

### 6.3 Pages

| Page | Path | Highlights |
|---|---|---|
| `Index.tsx` | `/` (briefly) | 469 bytes — likely redirect helper. |
| `Auth.tsx` (`src/pages/Auth.tsx:1-168`) | `/auth` | Tabs for sign-in/up; uses `useAuthStore`; calls `debugSupabaseConfig()` (now harmless after commit `e51fca0` removed test-DB-conn button). Branded "SpendWise". |
| `Dashboard.tsx` (`src/pages/Dashboard.tsx:1-303`) | `/` | Fetches accounts/transactions/categories/profile on mount; in-memory `useMemo` analytics (income, expense, credit utilization, expense-by-category, income-by-category); renders `DashboardFilters`, 2×2 grid of stat cards, `IncomeByCategory`/`CreditUtilization` (swap based on selected credit account), `SpendsByCategory`, recent 5 transactions, FAB → `AddTransactionSheet`. |
| `Accounts.tsx` | `/accounts` | 19 KB — full CRUD UI for savings + credit, hosts `ConnectAccountDialog` for AA sync. |
| `Transactions.tsx` | `/transactions` | 15 KB — list, filters, search, bulk select, edit/delete dialogs. |
| `Settings.tsx` (`src/pages/Settings.tsx:1-316`) | `/settings` | Dispatches to 8 dialogs in `components/settings/`. Shows "Free Plan" / "Paid Plan" badge via `isPaidUser()`. |
| `NotFound.tsx` | `*` | 404. |

### 6.4 Dynamic balance calculation

Single source of truth = `transactions`. Stored `current_balance` columns exist but are **overwritten in memory** on every fetch via `useAccountsStore.recalculateBalances()` (`src/stores/useAccountsStore.ts:275-299`).

- Savings: `opening_balance + Σincome − Σexpense` (`src/utils/accountBalanceUtils.ts:7-25`).
- Credit: `|Σexpense − Σincome|` (`src/utils/accountBalanceUtils.ts:32-50`) — always positive = "amount owed".

Credit utilization across date ranges is computed in `src/utils/creditCardUtils.ts:70-126` with month-count-aware "effective limit".

### 6.5 Number formatting

`src/utils/numberFormat.ts`:
- `formatAmount(n, 'indian')` → `K / L / Cr` abbreviated; `'international'` → `K / M / B`.
- `formatFullAmount(n, 'indian')` → `12,34,567.89` Indian grouping; `'international'` → `1,234,567.89`.

Dashboard uses abbreviated on mobile (`sm:hidden`) and full on desktop (`sm:inline`) — see `Dashboard.tsx:198-199`.

### 6.6 Components inventory

- **Layout**: `BottomNavigation` (only file in `layout/`) — mobile-first nav bar.
- **Dashboard widgets** (`components/dashboard/`): `AccountActivity`, `AnalyticsCards`, `CategoryBreakdownDialog`, `CategoryCharts`, `CreditUtilization`, `DashboardFilters`, `IncomeByCategory`, `SpendsByCategory`, `StatsCards`.
- **Accounts** (`components/accounts/`): `EditAccountDialog`, `DeleteAccountDialog`, `ReactivateAccountDialog`, `UploadStatementDialog`.
- **Transactions** (`components/transactions/`): `AddTransactionDialog`, `AddTransactionSheet` (FAB sheet variant), `EditTransactionDialog`, `DeleteTransactionDialog`, `DeleteAllDialog`, `TransactionDetailDialog`, `TransactionFilters`.
- **Settings** (`components/settings/`): `SubscriptionCard`, `SubscriptionDialog`, `CurrencySettingsDialog`, `DataExportDialog`, `AccountManagementDialog`, `ManageCategoriesDialog`, `ResetCategoriesDialog`, `ProfileSettingsDialog`, `ChangePasswordDialog`, `FactoryResetDialog`.
- **UI primitives** (`components/ui/`): ~50 shadcn files — do not edit per `CONTRIBUTING.md`.

---

## 7. Account Aggregator (AA) Pipeline

### 7.1 Frontend → Edge Function contract

`useAccountAggregatorStore` (`src/stores/useAccountAggregatorStore.ts`) manages the full consent lifecycle:

1. **Create consent**: Calls the `aa-proxy` Edge Function with `action: create-consent`, phone number, and duration. Returns a redirect URL for user authorization.
2. **Poll consent status**: Periodically checks consent status via `action: consent-status` until the user approves or rejects.
3. **Fetch data**: Once consent is `active`, calls `action: fetch-data` to pull transactions from the AA provider.
4. The Edge Function normalizes data, ensures local accounts exist, and upserts transactions with deduplication.

`ConnectAccountDialog.tsx` (`src/components/accounts/ConnectAccountDialog.tsx`):
- Guides users through the consent flow.
- Redirects to the AA provider for consent approval.
- Shows sync status and results.

### 7.2 Edge Function (`aa-proxy`)

The `aa-proxy` Edge Function (`supabase/functions/aa-proxy/index.ts`) is the server-side integration point:

- **Providers**: Supports `setu` (production AA provider) and `mock` (for local development).
- **Actions**: `create-consent`, `consent-status`, `fetch-data`.
- **Data flow**: Fetches normalized transaction data from the AA provider, creates/links local accounts (`aa_link_refs` table), and upserts transactions with `source='aa'` and `source_ref=txnId` for deduplication.
- **Auth**: JWT-validated via Supabase Auth headers.

### 7.3 Security model

- AA data access is **consent-gated** — users must explicitly approve via the provider.
- Edge Function validates the JWT and scopes all operations to the authenticated user.
- Transaction data is stored locally after fetch; raw AA payloads are not retained.

---

## 8. Authentication & User Bootstrap

Flow:

1. User signs up via `useAuthStore.signUp` → `supabase.auth.signUp({ emailRedirectTo: <origin>/ })`.
2. Supabase creates the `auth.users` row → fires the `on_auth_user_created` trigger → `handle_new_user()` inserts a `user_profiles` row with `currency_symbol='$'` (migration 5 L37-54).
3. That insert fires `create_user_default_categories` → seeds 10 default categories for the user (migration 3 L159-162).
4. Auth store sleeps 1 s after signup to let triggers settle (`src/stores/useAuthStore.ts:69`).
5. Email confirmation required before sign-in (default Supabase setting; not overridden).

---

## 9. Git History — Milestone Walkthrough

Total commits on `main`: **14** (very small repo; bulk of work was inside Lovable.dev sessions). All commits squashed below in chronological order:

| Date | SHA | Commit | What it actually contained |
|---|---|---|---|
| 2025-09-20 | `797450c` | `[skip lovable] Use tech stack vite_react_shadcn_ts_20250728_minor` | Stack pin. |
| 2025-09-20 | `17ec767` | `Add personal finance dashboard` | **Initial Lovable scaffold** of the entire app — pages, stores, shadcn components, the original schema migration `20250920111819_…f82506ca.sql`, plus the **already-prepared** Dec 2024 enhancement migrations (`processing_jobs` + `simplified_subscription_support`). Note the timestamp paradox: migrations dated Dec 2024 were committed in Sep 2025 — they were authored ahead of time during planning (see `docs/archive/`) and bundled with the scaffold. |
| 2025-09-20 | `90a9b9e` / `0e5f437` | `Approve Lovable tool use` (×2) | Lovable.dev permission commits. |
| 2025-09-28 | `6ba37d6` | `Fix authentication and database issues` | Added the `handle_new_user` trigger migration (`20250928042934_…`) plus search-path fixes. This is when self-serve signup actually started working. |
| 2025-09-28 | `14fa528` | `Fix UI and page loading issues` | UI polish wave. |
| 2025-10-04 | `44a13ee` | `docs: comprehensive documentation cleanup and restructuring` | Created the current `docs/` set (`ARCHITECTURE`, `PRD`, `ICP`, `DEVELOPMENT`, `CONTRIBUTING`) and moved planning docs to `docs/archive/`. **Also includes the `number_format` migration** dated 2025-10-12 (future-dated) — likely added together. |
| 2025-10-04 | `d95609b` | `fix: reorder Transactions filters - This Month first, All Time last` | Small UX fix. |
| 2025-10-04 | `ff61812` / `c5358b2` | `index on main / WIP on main` | Stash refs (auto). |
| 2025-10-04 | `d7025ae` | `fix: add iOS safe area support for proper status bar handling` | Capacitor/iOS polish. |
| 2025-10-04 | `30696f5` | `rebrand: rename VaultWise to SpendWise` | Brand change in `package.json`, `capacitor.config.ts`, `Auth.tsx` (header "SpendWise"), `Settings.tsx` (copy). Folder + docs still use "VaultWise". |
| 2025-10-04 | `e51fca0` | `chore: remove test database connection button from auth page` | Cleanup. |
| 2025-10-04 | `5ec95fe` (HEAD) | `fix: add .npmrc for Vercel deployment with legacy-peer-deps` | Deployment fix for the date-fns 4 peer conflict. |

**Evolutionary arc**: Sep 20 scaffold → Sep 28 auth/DB fixups → Oct 4 doc cleanup + rebrand + Vercel/iOS productionization.

---

## 10. Documentation Drift & Known Gaps

Things where docs or code disagree with each other or with the live system:

1. **Brand**: repo / folder / some docs say "VaultWise"; `package.json`, `capacitor.config.ts`, `Auth.tsx`, `Settings.tsx`, and `FactoryResetDialog` say "SpendWise". Pick one and align.
2. **Default categories**: migration trigger seeds **10**; some docs claim more.
3. **`categories` table type/is_default columns**: used in `useTransactionsStore`, missing from migrations and `types.ts`. Either applied out-of-band or silently broken at runtime. **(verify with `mcp16_list_tables` if you want certainty)**.
4. **`transactions.account_id` FK**: no foreign key exists in migrations. Verify in production.
5. **`processing_jobs` table**: legacy, never used. Drop.
6. **React Query**: provider is mounted but not used; stores call Supabase directly. Either the dep is dead weight or future work is planned.
7. **Both Yup and Zod** present in deps; `CONTRIBUTING.md` standardizes on Yup. Pick one.
8. **Hard-coded Supabase URL + anon key** in `src/integrations/supabase/client.ts`. Anon keys are designed to be public, but checking them into source is still a code-smell — recommend env-only.

---

## 11. Operational Notes

- **Dev server**: `npm run dev` → Vite at port 8080 (per `vite.config.ts` / docs). Quick start in `@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/docs/DEVELOPMENT.md:10-31`.
- **Deploy**: Vercel; `vercel.json` SPA rewrite; `.npmrc` adds `legacy-peer-deps=true` for date-fns 4 conflict.
- **iOS**: `npx cap sync ios` after `npm run build`; appId `com.spendwise.app`; safe-area handling added in `d7025ae`.
- **Env vars expected** (`.env.local`):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## 12. Open Questions / Suggested Verifications

These would be worth confirming via Supabase MCP / live DB inspection before relying on them:

1. Does `categories` actually have `type` and `is_default` columns in production?
2. Is there an FK on `transactions.account_id`?
3. What `subscription_tier` value does the DB hold for the user? `'free'`, `'premium'`, or `'paid'`?
4. Is `processing_jobs` empty (confirming it’s dead)?

---

## 13. Strengths & Risks (one-liners)

**Strengths**
- Clean store layering, single-responsibility Zustand patterns.
- Dynamic balance calc removes a whole class of sync bugs.
- Mobile-first done well (bottom nav, FAB, responsive abbreviation).
- AA pipeline uses RBI-regulated consent flow (privacy-first).
- Edge Function architecture keeps secrets server-side.

**Risks**
- Documentation drift is widespread; relying on docs alone will mislead.
- `processing_jobs` and `get_user_context` are unused — legacy dead code in DB.
- Hard-coded Supabase fallbacks weaken env hygiene.
- No automated tests anywhere in the repo.

---

*Generated by Cascade after a full read of source, migrations, and docs. Use `mcp16_list_tables` / `mcp16_execute_sql` to verify §12 items against the live DB.*
