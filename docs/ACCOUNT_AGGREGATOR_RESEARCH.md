# Replacing AI Statement Parsing with India's Account Aggregator Framework

> **Goal**: Swap out the current "upload statement → AI parse" flow with a **"Connect bank / credit card → fetch transactions"** flow, while keeping the rest of the UI/UX identical. Stay focused on **transactions** as the single entity — no investments, insurance, assets.
>
> **Bottom line up front**: India's RBI-regulated **Account Aggregator (AA)** framework is the right rail for **savings/current account transactions** — fast, consent-based, no PDF parsing, no AI hallucination. **However, credit-card transaction support via AA (`CCT` FI type) is still rolling out** and is not yet broadly live across card issuers. To match INDmoney / Fi / Jupiter / CRED, you need a **hybrid pipeline: AA for bank accounts + email/Gmail parsing for credit-card statements** (with manual entry as a final fallback). The current AI/n8n statement parser can be retired or repurposed as a third fallback for niche/co-op banks.
>
> All claims in this doc are dated **end-2025 / early-2026**. The AA ecosystem is moving fast — re-verify quarterly.

---

## 1. The Account Aggregator (AA) Framework in 90 seconds

- **Who governs it**: RBI Master Direction on NBFC-Account Aggregator, 2016 (last amended 2023). Inter-regulator (RBI + SEBI + IRDAI + PFRDA) — fully legal, not screen-scraping.
- **Three parties** (per [Sahamati](https://sahamati.org.in/what-is-account-aggregator/)):
  - **FIP** — Financial Information Provider: holds your data (banks, NBFCs, AMCs, insurers, GSTN).
  - **AA** — Account Aggregator: an **NBFC-AA** that is a "blind pipe" between FIP and FIU. **Cannot read, decrypt, or store** the data. 17 are licensed today.
  - **FIU** — Financial Information User: the app that requests data (= **VaultWise / SpendWise**).
- **Ecosystem size** (Dec 2025, per [Precisa](https://precisa.in/blog/account-aggregator-lenders-guide-2026/) and [HyperVerge](https://hyperverge.co/blog/best-account-aggregators/)):
  - 17 RBI-licensed AAs
  - 126–179 live FIPs (all major private + most public-sector banks, expanding into AMCs, GSTN, insurance)
  - 400–950 registered FIUs
  - **2.61 B enabled accounts**, **223 M linked users**
  - AA-facilitated lending: ₹1.47 lakh crore across 1.5 cr loans in H1 FY26 (≈10% of total personal loans)
- **What it replaces**: net-banking screen scraping (Yodlee-style), PDF statement uploads, manual data entry. PDFs and AI parsing become a **fallback for the 62% of users whose banks are not yet AA-enabled**.

### How a fetch works (FIU's point of view)

```
[Your app, FIU]                  [AA]                   [FIP/Bank]
   1. POST createConsent ───────▶
                                  2. Hosts consent UI
                                     (mobile redirect / WebView)
   3. User selects FIP, taps approve on AA UI
                                  4. Forwards encrypted consent
                                  ───────────────────────────▶
   5. AA notifies FIU via webhook
   ◀────────────── consent.approved
   6. POST createDataSession ──▶
                                  7. AA requests FI data ──▶
                                                          8. FIP returns
                                                             encrypted JSON
                                  ◀───────────────────────────
   9. Webhook: data.ready
   ◀────────────── session.ready
   10. GET /data/{sessionId} ──▶
   ◀── encrypted FI JSON (JWE)
   11. Decrypt locally → normalize → write to transactions table
```

- Fetch time end-to-end is typically **2–5 seconds** once consent is approved.
- Output is **standardized JSON/XML defined by ReBIT** — same schema regardless of which bank. One parser, all banks.
- Consents are **time-bound, purpose-limited, revocable** by the user from the AA app at any time.

---

## 2. What data is actually available — does it cover credit cards?

This is the question that determines product viability.

### 2.1 Currently live FI types (per [Setu FI Data Types](https://docs.setu.co/data/account-aggregator/fi-data-types))

The AA spec defines **23 FI types**. Categories actually live in production:

| Category | Live FI types | Useful for VaultWise? |
|---|---|---|
| **Bank** | `DEPOSIT` (savings/current), `TERM_DEPOSIT`, `RECURRING_DEPOSIT` | ✅ **YES** — this is the core for savings accounts |
| **Credit Cards** | `CREDIT_CARD` / `CCT` — defined in spec, **rollout patchy** | ⚠️ Partial — see §2.2 |
| Investment | `MUTUAL_FUNDS`, `ETF`, `EQUITIES`, `NPS`, `CD`, `IDR`, `AIF`, `INVIT`, `REIT`, `BONDS`, `GOVT_SECURITIES` | ❌ Out of scope |
| Insurance | `INSURANCE_POLICIES`, `ULIP` | ❌ Out of scope |
| Pension | `EPF`, `PPF`, `SUPERANNUATION`, `OTHER_PENSION` | ❌ Out of scope |
| Tax / Business | `GSTR1_3B` | ❌ Out of scope |

Each FI type returns a consistent schema with three sections: **profile** (holder name/PAN/DOB), **summary** (account number masked, balance, IFSC), and **transactions** (list with `transactionTimestamp`, `amount`, `type=CREDIT|DEBIT`, `mode=UPI|NEFT|IMPS|...`, `narration`, `txnId`, `currentBalance`). The transaction shape **maps almost 1:1 to your existing `transactions` table** — see §6.

### 2.2 The credit-card reality check 🚨

**Setu's own pricing policy** ([source](https://setu-aa.com/pricing-policy), revision Feb 2024) explicitly says:

> *"The pricing construct under this Policy is applicable only to currently available types of financial information, viz, (i) Current accounts, (ii) Savings accounts, (iii) Term deposits and (iv) Recurring deposits."*

In other words, as of early-2024, only deposit accounts were within the AA commercial scope. The `CREDIT_CARD` FI type **exists in the ReBIT spec** and RBI has been pushing card issuers to onboard, but adoption is gradual:

- HDFC, ICICI, Axis, SBI started enabling **savings-account FIP services in 2022**; credit-card FIP rollout is later and uneven.
- Sahamati's live FIP directory is the source of truth — check the **"Card products / CCT"** column per bank.
- Field reports on Reddit ([r/IndiaInvestments](https://www.reddit.com/r/IndiaInvestments/comments/1huy78e/do_you_use_account_aggregator_apps_like_anumati/), [r/CreditCardsIndia](https://www.reddit.com/r/CreditCardsIndia/comments/1fgg4pt/from_here_does_cred_fetch_the_bills/)) confirm that **CRED, INDmoney, Fi, and Jupiter still rely on Gmail/email parsing for credit-card statements**, not AA.

> **Practical implication for VaultWise**: AA gives you 100% of what you need for savings-account transactions. For credit cards you will need a second mechanism for ~12–18 months. See §5.

---

## 3. How INDmoney / Fi / Jupiter / CRED actually do this

Synthesized from public docs, Reddit threads, and [TechnoFino community discussions](https://technofino.in/community/threads/lets-talk-about-account-aggregators.4184/):

| App | Savings account transactions | Credit card transactions |
|---|---|---|
| **INDmoney** | AA framework (via licensed AA partner) | Gmail OAuth → parses HTML statement emails from issuers |
| **Fi.Money** | AA framework | Gmail parsing + manual links |
| **Jupiter** | AA via **Finvu** (Cookiejar) | Gmail parsing |
| **Fold.money** | AA framework | Gmail parsing |
| **CRED** | Doesn't focus on bank transactions | **Gmail parsing** (statement PDFs + transaction alerts). Will move to AA-CCT once FIPs go live. |

**Why Gmail?** Indian banks/issuers send standardized **statement emails** (PDF attachments + HTML body) and **transaction alert emails/SMS** the moment a card transaction occurs. Parsing those gives near-real-time coverage **without** needing the issuer to be an AA-FIP. The cost is fragile templates, OAuth scope creep (`gmail.readonly`), and Google's app-verification gauntlet (which is now stricter under Google's Sensitive Scopes policy).

**SMS parsing** (Android only, used by older apps like Walnut/Money Lover) is **dead in 2024+**: Google Play restricts the `READ_SMS` permission to default-SMS apps only. Not a viable path going forward.

---

## 4. AA provider selection (which AA to integrate with)

Per [HyperVerge's 2026 AA selection guide](https://hyperverge.co/blog/best-account-aggregators/), the 7 with meaningful traction:

| AA | Operator | Live FIPs | DX score | Best for VaultWise? |
|---|---|---|---|---|
| **Anumati** | Perfios | **80+** (broadest) | OK | ✅ Best FIP coverage, lending-oriented |
| **CAMS AA** | CAMS | 70+ | OK | Wealth-leaning; less relevant for txn-only PFM |
| **OneMoney** | FinSec AA | 65+ | OK | Solid all-rounder, oldest license |
| **Finvu** | Cookiejar | 60+ | Good | Jupiter uses this; AA-pure-play, focused |
| **NADL** | NSDL/NeSL | 60+ | OK | Debt-instrument leaning |
| **Setu AA** | Agya / Pine Labs | Mid | **Best** | **Top developer DX**, sandbox, themeable consent screens, SDKs |
| **Protean SurakshAA** | Protean (NSDL eGov) | Mid | OK | Retail/PAN reach |

### Recommendation for VaultWise

**Start with Setu AA**, plan to add Anumati or Finvu later when FIP coverage gaps surface:

1. **Setu's developer experience is the strongest** — fully themeable WebView consent screens, hosted mock FIP, Postman collection, sample app on GitHub ([SetuHQ/account-aggregator-sample-app](https://github.com/SetuHQ/account-aggregator-sample-app)), per-product callback URLs configured via their "Bridge" console.
- **Sandbox is free** and lets you test the entire consent → data-fetch loop against mock FIPs before signing any commercial contract.
- **Setu is RBI-licensed as NBFC-AA** (CoR Aug 31, 2023). You become the FIU; Setu hosts the consent layer.
- After production go-live, plan to **integrate a second AA (likely Anumati)** to fill FIP coverage gaps. Most production FIUs integrate 2–3 AAs.

### Pricing (rough order of magnitude)

- **Setu**: ₹0.01–₹25 per fetch ([Setu Pricing Policy](https://setu-aa.com/pricing-policy)) — varies by FI type and contract.
- **Industry**: ₹50–₹100 per fetch is typical for full bank-statement pulls ([Precisa](https://precisa.in/blog/account-aggregator-lenders-guide-2026/)).
- **FIP pass-through charges** exist on top and vary per bank — Setu passes these through.
- For VaultWise: 1 user × 2 accounts × monthly refresh = 24 fetches/year × ~₹20 average = **~₹480/user/year in AA costs alone**. This is meaningful at scale and must be modeled in your subscription pricing.

---

## 5. The hybrid pipeline VaultWise actually needs

Given the credit-card gap, here is the realistic ingestion stack:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     "Connect account" UX (single button)             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────────────┐
        ▼                         ▼                                 ▼
  ┌──────────┐             ┌──────────────┐                ┌─────────────────┐
  │ Bank A/C │             │ Credit Card  │                │ Niche / Co-op   │
  │  (AA)    │             │  (Gmail or   │                │  bank / fallback│
  │          │             │   AA-CCT     │                │  (manual entry  │
  │          │             │   if avail.) │                │   or PDF+AI)    │
  └────┬─────┘             └──────┬───────┘                └────────┬────────┘
       │                          │                                 │
       │ Setu AA (FIU API)        │ Gmail OAuth + parser            │ Existing
       │ → ReBIT JSON             │ (statement HTML/PDF)            │ n8n workflow
       │ → normalize              │ → normalize                     │ → normalize
       │                          │                                 │
       └──────────────┬───────────┴────────────────┬────────────────┘
                      ▼                            ▼
              ┌────────────────────────────────────────┐
              │  transactions table (existing schema)  │
              │  + new metadata: source, source_ref    │
              └────────────────────────────────────────┘
```

Phasing:

1. **Phase 1 (4–6 weeks)**: Setu AA integration for savings/current accounts. Replace `UploadStatementDialog` with `ConnectAccountDialog`. Mock-FIP testing in sandbox.
2. **Phase 2 (4–6 weeks)**: Gmail OAuth + parser for credit cards. Start with the top 5 issuers (HDFC, ICICI, Axis, SBI Card, Amex) — those email templates are stable.
3. **Phase 3 (ongoing)**: As more issuers come live on AA-CCT, swap Gmail parsing → AA for those issuers per-user (UX picks the better path automatically).
4. **Phase 4 (optional)**: Retain the n8n AI parser as a fallback for users on niche/co-op banks not on AA. Deprecate eventually.

---

## 6. Mapping to the existing VaultWise/SpendWise architecture

Goal: **keep the UI/UX nearly unchanged** — only the data-ingestion mechanism swaps. Below maps each existing piece to what changes.

### 6.1 Frontend swaps

| Today | After |
|---|---|
| `@/Users/srinidhr/Sri/Personal/Learning/vaultwise-dash/src/components/accounts/UploadStatementDialog.tsx` | Renamed → `ConnectAccountDialog.tsx`. Same paid-tier gate. Instead of file picker, two buttons: "Connect Bank Account" → opens Setu AA WebView; "Connect Credit Card" → opens Gmail OAuth (Phase 2) or shows "AA-CCT support coming for your issuer". |
| `src/stores/useStatementStore.ts` (`uploadAndProcess` → n8n) | Renamed → `useAccountAggregatorStore.ts`. New methods: `requestConsent(fipType)`, `pollConsent(consentId)`, `fetchData(consentId)`, `linkedAccounts()`. |
| `src/components/accounts/UploadStatementDialog.tsx` paid-tier gate (`isPaidUser`) | Keep — Phase 2 (Gmail/AI) stays premium; **AA could be free tier** because the per-fetch cost is low. Recompute pricing model. |
| Existing dashboard, transactions list, filters, charts, category mapping, dialogs, FAB, BottomNav | **Unchanged.** The transactions table feeds them and AA just writes there. |
| FactoryReset, ExportData dialogs | Add an extra "Disconnect all linked accounts" / "Revoke AA consents" action. |

### 6.2 Backend / data swaps

| Today | After |
|---|---|
| `useStatementStore` POSTs the file URL to a public n8n webhook from the browser | **Cannot** call Setu directly from the browser — FIU client credentials must stay server-side. Add a Supabase **Edge Function** (`supabase/functions/aa-bridge/index.ts`) that proxies Setu's FIU API. The frontend talks only to Supabase. |
| `statements` storage bucket | **Delete** in Phase 3. Not needed once AA replaces uploads. Keep until Phase 4 for the niche-bank fallback. |
| `processing_jobs` table (dead) | Either drop, or **repurpose** as `aa_data_sessions` — actually fits its original async design. |
| `savings_accounts` / `credit_cards` tables | Add columns: `aa_link_ref_number TEXT`, `aa_consent_id TEXT`, `aa_last_synced_at TIMESTAMPTZ`, `source TEXT` (`'manual' \| 'aa' \| 'gmail' \| 'pdf'`). |
| `transactions` table | Add: `source TEXT`, `source_ref TEXT` (e.g. ReBIT `txnId`), unique index on `(account_id, source_ref)` for **dedup at insert time**. This removes the need for the n8n "date±1day, amount±₹1" fuzzy dedup. |
| New tables | `aa_consents(id, user_id, fiu_consent_id, aa_handle, status, fi_types, valid_from, valid_until, fetch_frequency, created_at)`, `aa_link_refs(id, consent_id, fip_id, account_type, masked_account_number, link_ref_number)`. |

### 6.3 Where the AI/n8n bits land

| Today | After |
|---|---|
| n8n workflow extracts transactions from PDF/CSV via GPT-4.1-mini + Claude | **Retire from primary flow.** Move to a "niche bank fallback" lane only. Keep the workflow JSON in `n8n/` directory (currently it's only in n8n Cloud — fix the bus-factor risk while you're here). |
| n8n dedup logic | **Delete.** Replace with DB unique constraint on `(account_id, source_ref)`. ReBIT `txnId` is stable and unique per FIP. |
| AI category mapping | **Keep** as a server-side enrichment step (Supabase Edge Function) — categorization is still useful no matter the data source. Switch from "AI extracts from PDF" to "AI categorizes already-extracted transactions". Much cheaper, more accurate. |

### 6.4 New consent flow UX (sketch)

```
Settings → Connected Accounts
  ┌─────────────────────────────────────────────────────────┐
  │  [+] Connect Bank Account     (uses Account Aggregator) │
  │  [+] Connect Credit Card      (uses Gmail / coming AA)  │
  │                                                         │
  │  HDFC Savings ••••1234   Last synced 2 mins ago   ⟳ ⓘ  │
  │  ICICI Credit ••••5678   Last synced 1 hour ago   ⟳ ⓘ  │
  │  Manual Account (Cash)                            ✎    │
  └─────────────────────────────────────────────────────────┘
```

The "Connect Bank Account" tap opens Setu's themeable WebView. User picks an AA handle (mobile-number-based; e.g. `9876543210@onemoney`), picks the bank, taps approve. The WebView closes; Supabase Edge Function receives the `consent.approved` webhook; data fetch fires; transactions appear in the existing dashboard within seconds. **No file upload, no progress bar, no "AI is analyzing your statement" screen.**

### 6.5 Things you can delete after Phase 1

- `UploadStatementDialog.tsx` PDF/CSV pickers, progress stages, error messages about "AI processing".
- `unlock_pdf.py`, `unlock_pdf.sh`, `requirements-pdf.txt`, `.venv/` — all helpers for handling password-protected PDFs.
- `statements` storage bucket + all related RLS policies (after Phase 3).
- `processing_jobs` table (or repurpose).
- `get_user_context()` RPC (already unused).

---

## 7. UX/UI principles that stay the same (per your brief)

- **Mobile-first, bottom-nav layout** unchanged.
- **Dashboard 2×2 analytics grid** unchanged.
- **Transaction list, filters (date/account/category/type/keyword), categories editor, charts, FAB → Add Transaction sheet** all unchanged.
- **Number-format toggle** (Indian/International) unchanged.
- **Manual transaction add** remains for cash purchases / corrections (the AA flow doesn't capture these).
- **Settings → Subscription / Currency / Export / Manage Categories** unchanged.
- The single visible change is on the **Accounts** page: "Add Account" + "Upload Statement" become "**Connect Account**" with provider picker. Everything downstream is identical.

---

## 8. Compliance & operational checklist

Drawn from [productgrowth.in's AA framework guide](https://productgrowth.in/insights/fintech/account-aggregator-framework-guide/) and Setu's go-live docs:

- [ ] **Register as FIU with RBI** via your chosen AA (Setu handles paperwork for FIU onboarding to Sahamati).
- [ ] **DPDP Act 2023 compliance**: granular consent, purpose limitation, right to erasure, data retention policy.
- [ ] **Consent screen must state** purpose ("Show your transactions in SpendWise"), data scope ("Last 6 months of transactions"), duration, retention period. **No dark patterns.**
- [ ] **Encrypted at rest + in transit**: ReBIT requires JWE for payloads; you already have HTTPS via Vercel + Supabase.
- [ ] **Consent dashboard** in-app: users see active consents and can trigger revocation that propagates back to the AA.
- [ ] **Data purge on revocation**: when user revokes, stop fetches and either delete fetched data or freeze it. Document this in your privacy policy.
- [ ] **Audit log** of every fetch (timestamp, consent ID, FIP, data size, success/failure).
- [ ] **7-year audit retention** required by RBI Master Direction.
- [ ] **ISO 27001 / SOC 2** — table-stakes for serious FIU eventually, not Day 1.

---

## 9. Risks & honest limitations

| Risk | Detail | Mitigation |
|---|---|---|
| **Credit-card AA coverage** | `CCT` FI type adoption is patchy through 2026 | Gmail parsing fallback (Phase 2); show UX clearly distinguishing the two |
| **38% bank coverage** | Per Precisa, ~62% of borrowers' banks weren't AA-enabled end-2025 (mainly co-op + RRB banks) | Keep manual entry + niche-bank PDF/AI lane (Phase 4); for your ICP (Indian tech professional 25–35), the **top 10 banks cover 90%+** — this gap is small |
| **Joint accounts excluded** under current AA rules | Some couples will hit this | Provide manual entry for joint accounts |
| **Cost per fetch** | At scale (10k+ users, monthly refreshes) AA fees become meaningful | Cache aggressively; refresh on-demand not always; let users choose refresh frequency |
| **Consent fatigue** | AA consents auto-expire (90 days typical) | Auto-renewal UX with reminder before expiry; one-tap re-consent |
| **Bus factor — single AA partner** | If Setu goes down, every user's fetch fails | Integrate a second AA (Anumati) in Phase 1.5 |
| **Gmail scope** | `gmail.readonly` is a Google "Sensitive Scope" — requires CASA Tier 2 audit | Budget 4–8 weeks + $5–15k for the CASA audit before Phase 2 launch |
| **Setu credit-card support timeline unknown** | They have not publicly committed | Track [Setu changelog](https://docs.setu.co/) and Sahamati FIP directory monthly |

---

## 10. Concrete next-steps roadmap

> No code yet. This is the plan. Pick the items you want to start with and I'll implement.

**Week 0 — Decisions & accounts**
- [ ] Sign up for **Setu Bridge sandbox** ([bridge.setu.co](https://bridge.setu.co/v2/signup)).
- [ ] Read Setu's sample FIU app ([SetuHQ/account-aggregator-sample-app](https://github.com/SetuHQ/account-aggregator-sample-app)).
- [ ] Decide: free-tier AA or paid-tier AA? (Recommend: free tier includes 1 connected bank account, paid tier unlocks unlimited + credit cards.)
- [ ] Resolve the open `subscription_tier` bug from `docs/KNOWN_ISSUES.md` before launching paid features.

**Week 1–2 — Backend foundation**
- [ ] New migrations: `aa_consents`, `aa_link_refs`, alter `transactions` to add `source` + `source_ref` + unique index.
- [ ] New Supabase Edge Function `aa-bridge` (TypeScript) that calls Setu's FIU APIs server-side. Store Setu client_id/secret in Edge Function secrets.
- [ ] Webhook endpoint (Supabase Edge Function) for `consent.approved` and `data.ready`.

**Week 3–4 — Frontend swap**
- [ ] Rename `useStatementStore` → `useAccountAggregatorStore`; new methods `requestConsent`, `fetchData`, `listLinkedAccounts`, `revokeConsent`.
- [ ] Rename `UploadStatementDialog` → `ConnectAccountDialog`; replace file picker with Setu WebView launcher.
- [ ] Add "Connected Accounts" section in Settings with sync status + revoke button.
- [ ] Verify dashboard, transactions, filters all still work with `source='aa'` rows (should — schema is unchanged).

**Week 5–6 — Production go-live**
- [ ] Setu FIU production onboarding (KYC, callback URL, Sahamati onboarding — Setu helps).
- [ ] DPDP-compliant privacy policy + consent screens.
- [ ] First live test with a real HDFC/ICICI/SBI savings account.
- [ ] Decommission `statements` storage bucket (Phase 3).
- [ ] Optional: keep n8n workflow + `UploadStatementDialog` behind a feature flag for niche-bank fallback (Phase 4).

**Phase 2 (later) — Credit cards**
- [ ] Google Cloud project + OAuth client, request `gmail.readonly` scope.
- [ ] Edge Function `gmail-statement-parser` — fetches by sender filter, parses HTML + PDF attachments per issuer template.
- [ ] CASA Tier 2 audit ($5–15k, 4–8 weeks).
- [ ] In `ConnectAccountDialog`, second button: "Connect Credit Card via Gmail".
- [ ] As issuers come live on AA-CCT, auto-detect and prefer AA for those.

---

## 11. References

- [RBI Master Direction — NBFC-Account Aggregator (2016)](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=10598)
- [Sahamati — What is an Account Aggregator](https://sahamati.org.in/what-is-account-aggregator/)
- [Sahamati — Live FIPs & FIUs directory](https://sahamati.org.in/fip-fiu-in-account-aggregators-ecosystem/)
- [Setu AA Docs — Quickstart](https://docs.setu.co/data/account-aggregator/quickstart)
- [Setu AA Docs — FI Data Types](https://docs.setu.co/data/account-aggregator/fi-data-types)
- [Setu AA — Pricing Policy](https://setu-aa.com/pricing-policy)
- [Setu sample FIU app on GitHub](https://github.com/SetuHQ/account-aggregator-sample-app)
- [HyperVerge — Pick the right AA (2026)](https://hyperverge.co/blog/best-account-aggregators/)
- [Precisa — AA Lender's Guide 2026](https://precisa.in/blog/account-aggregator-lenders-guide-2026/)
- [Product Growth — AA framework guide](https://productgrowth.in/insights/fintech/account-aggregator-framework-guide/)
- [Cleartax — What is an Account Aggregator](https://cleartax.in/s/account-aggregator)
- [TechnoFino community thread on AA + credit cards](https://technofino.in/community/threads/lets-talk-about-account-aggregators.4184/)
- [r/IndiaInvestments — AA app experiences](https://www.reddit.com/r/IndiaInvestments/comments/1huy78e/do_you_use_account_aggregator_apps_like_anumati/)

---

*Generated by Cascade after extensive research across RBI, Sahamati, Setu, HyperVerge, Precisa, ProductGrowth, and field reports from Reddit communities. Verify all stats against live Sahamati directory and Setu docs before commercial commitments.*
