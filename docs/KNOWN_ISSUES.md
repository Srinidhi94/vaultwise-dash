# Known Issues, Gaps & Bugs — Backlog

> Tracking file for issues uncovered during the project deep-dive (see `docs/PROJECT_DEEP_DIVE.md` §10/§12). Revisit and triage later. **Do not close items without DB verification where flagged.**

Status legend: 🔴 likely-bug · 🟡 drift / inconsistency · 🟢 dead code / cleanup · 🔵 needs verification

---

## Bugs (likely behavioral impact)

-  **`categories.type` and `categories.is_default` used by code but missing from migrations**
  - `useTransactionsStore.fetchCategories/addCategory/deleteCategory` rely on both columns (`@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/stores/useTransactionsStore.ts:101-235`).
  - Neither column appears in `supabase/migrations/*.sql` or generated `src/integrations/supabase/types.ts`.
  - Either applied directly in Supabase dashboard (untracked) or silently no-op at runtime.
  - Action: run `\d categories` against prod via Supabase MCP; if applied out-of-band, backfill a migration.

- 🔵 **`transactions.account_id` has no FK constraint**
  - `transactions.account_id` is a bare UUID disambiguated by `account_type` — no foreign key to any table.
  - Action: verify in production and decide whether to add a proper FK constraint.

---

## Documentation Drift

- 🟡 **Brand inconsistency**: `package.json`, `capacitor.config.ts`, `Auth.tsx`, `Settings.tsx`, `FactoryResetDialog` → "SpendWise". Folder name (`vaultwise-dash`), some docs → "VaultWise". Pick one and rename comprehensively.
- 🟡 **Default category count**: migration trigger inserts **10**; some docs claim more — verify and align.

---

## Dead Code / Schema

- 🟢 **`processing_jobs` table** + indexes + `validate_account_exists()` + `processing_job_stats` view (`supabase/migrations/20241229120000_…sql`) — never used by the app. Drop the table.
- 🟢 **`get_user_context()` RPC** (`supabase/migrations/20241229150000_…sql`) — never called. Drop the function.
- 🟢 **React Query** (`@tanstack/react-query`) — `QueryClientProvider` is mounted in `App.tsx` but zero hooks (`useQuery`, `useMutation`) are used anywhere. Either remove the dep or actually adopt it.
- 🟢 **Yup vs Zod** — both present in `package.json`; `docs/CONTRIBUTING.md` standardizes on Yup. Remove the unused one.
- 🟢 **`unlock_pdf.py`, `unlock_pdf.sh`, `requirements-pdf.txt`, `.venv/`** — appear unrelated to runtime; likely test-prep tooling. Consider moving to `scripts/` or a separate repo.

---

## Hygiene

- 🟡 **Hard-coded Supabase URL + anon key fallback** in `src/integrations/supabase/client.ts`. Prefer env-only, fail loudly if missing.
- 🟡 **No automated tests** anywhere in the repo. Even smoke tests for the stores would catch regressions.
- 🟡 **`.env` committed to repo?** — confirm `.gitignore` covers `.env*.local` and that the existing `.env` only holds non-secret defaults.

---

## Open Verification Questions (Supabase MCP / live DB)

These can be answered authoritatively with `mcp16_list_tables` / `mcp16_execute_sql` against project `huxhlktqxdkafbjtbwyr`:

1. Does `categories` have `type` and `is_default` columns?
2. Is there a FK from `transactions.account_id` to any table?
3. What value(s) of `subscription_tier` appear in `user_profiles`?
4. Is `processing_jobs` empty (confirming it's dead)?

---

*Maintained alongside `docs/PROJECT_DEEP_DIVE.md`. Update when items are resolved or new ones surface.*
