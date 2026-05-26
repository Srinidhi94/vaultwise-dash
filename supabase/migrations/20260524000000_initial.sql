-- ============================================================================
-- SpendWise — Consolidated initial schema
-- ============================================================================
-- Single migration for a fresh Supabase project. Replaces the 6 archived
-- migrations under supabase/migrations/_archive/. All known drift items from
-- docs/KNOWN_ISSUES.md are fixed at the source:
--   * subscription_tier values: only 'free' | 'premium' (no 'paid')
--   * categories has explicit type + is_default columns
--   * no processing_jobs, no statements bucket, no account-count cap
--   * transactions / savings_accounts / credit_cards have a source column
--     ready for AA-fetched data
-- ============================================================================

-- ---------- extensions ------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- helper: updated_at trigger function -----------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. user_profiles
-- ============================================================================
CREATE TABLE public.user_profiles (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name             TEXT,
  currency_symbol          VARCHAR(5)  NOT NULL DEFAULT '$',
  number_format            VARCHAR(20) NOT NULL DEFAULT 'indian'
                              CHECK (number_format IN ('indian','international')),
  subscription_tier        TEXT        NOT NULL DEFAULT 'free'
                              CHECK (subscription_tier IN ('free','premium')),
  subscription_expires_at  TIMESTAMPTZ,
  trial_used               BOOLEAN     NOT NULL DEFAULT FALSE,
  trial_expires_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. savings_accounts
-- ============================================================================
CREATE TABLE public.savings_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  opening_balance      NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance      NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
  -- AA scaffold columns (default 'manual' so legacy/manual rows are unaffected)
  source               TEXT          NOT NULL DEFAULT 'manual'
                          CHECK (source IN ('manual','aa')),
  aa_link_ref_number   TEXT,
  aa_last_synced_at    TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_savings_accounts_user_id  ON public.savings_accounts(user_id);
CREATE INDEX idx_savings_accounts_active   ON public.savings_accounts(user_id, is_active);

CREATE TRIGGER trg_savings_accounts_updated_at
  BEFORE UPDATE ON public.savings_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. credit_cards
-- ============================================================================
CREATE TABLE public.credit_cards (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  credit_limit         NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance      NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
  source               TEXT          NOT NULL DEFAULT 'manual'
                          CHECK (source IN ('manual','aa')),
  aa_link_ref_number   TEXT,
  aa_last_synced_at    TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_cards_user_id  ON public.credit_cards(user_id);
CREATE INDEX idx_credit_cards_active   ON public.credit_cards(user_id, is_active);

CREATE TRIGGER trg_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. categories  (type + is_default present from day one)
-- ============================================================================
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  type        TEXT NOT NULL DEFAULT 'both'
                CHECK (type IN ('income','expense','both')),
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- ============================================================================
-- 5. transactions
-- ============================================================================
CREATE TABLE public.transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_date    DATE NOT NULL,
  amount              NUMERIC(15,2) NOT NULL,
  description         TEXT NOT NULL,
  transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('income','expense')),
  account_type        TEXT NOT NULL CHECK (account_type IN ('savings','credit')),
  account_id          UUID NOT NULL,                     -- intentionally no FK (polymorphic)
  category_id         UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  notes               TEXT,
  -- AA-related provenance
  source              TEXT NOT NULL DEFAULT 'manual'
                         CHECK (source IN ('manual','aa')),
  source_ref          TEXT,                              -- e.g. ReBIT txnId
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id            ON public.transactions(user_id);
CREATE INDEX idx_transactions_user_date          ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_account            ON public.transactions(account_id, account_type);
CREATE INDEX idx_transactions_category           ON public.transactions(category_id);

-- Dedup for AA-fetched rows: same (account_id, source_ref) must be unique.
-- Non-partial so PostgREST upsert's ON CONFLICT inference works. Manual rows
-- (source_ref IS NULL) still coexist freely because Postgres unique indexes
-- treat each NULL as distinct by default.
CREATE UNIQUE INDEX uniq_txn_source_ref
  ON public.transactions(account_id, source_ref);

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. aa_consents  (AA scaffold)
-- ============================================================================
CREATE TABLE public.aa_consents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL DEFAULT 'mock'
                           CHECK (provider IN ('mock','setu')),
  provider_consent_id   TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','active','revoked','expired','failed')),
  fi_types              TEXT[] NOT NULL DEFAULT '{DEPOSIT}',
  valid_from            TIMESTAMPTZ,
  valid_until           TIMESTAMPTZ,
  fetch_frequency       TEXT CHECK (fetch_frequency IN ('ONETIME','DAILY','MONTHLY')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aa_consents_user_id ON public.aa_consents(user_id);
CREATE INDEX idx_aa_consents_status  ON public.aa_consents(user_id, status);

CREATE TRIGGER trg_aa_consents_updated_at
  BEFORE UPDATE ON public.aa_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. aa_link_refs  (link between an AA consent and a local savings/credit account)
-- ============================================================================
CREATE TABLE public.aa_link_refs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id               UUID NOT NULL REFERENCES public.aa_consents(id) ON DELETE CASCADE,
  fip_id                   TEXT NOT NULL,
  account_type             TEXT NOT NULL CHECK (account_type IN ('savings','credit')),
  masked_account_number    TEXT,
  link_ref_number          TEXT NOT NULL,
  local_account_id         UUID,                         -- soft link to savings_accounts/credit_cards
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aa_link_refs_consent ON public.aa_link_refs(consent_id);

-- ============================================================================
-- RLS — enable + per-user policies on everything
-- ============================================================================
ALTER TABLE public.user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aa_consents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aa_link_refs     ENABLE ROW LEVEL SECURITY;

-- Standard user_id = auth.uid() policy for ALL actions on the 5 owned tables.
-- One ALL-policy per table keeps the migration short and the rules consistent.
CREATE POLICY user_profiles_owner    ON public.user_profiles
  FOR ALL USING (auth.uid() = id)              WITH CHECK (auth.uid() = id);

CREATE POLICY savings_accounts_owner ON public.savings_accounts
  FOR ALL USING (auth.uid() = user_id)         WITH CHECK (auth.uid() = user_id);

CREATE POLICY credit_cards_owner     ON public.credit_cards
  FOR ALL USING (auth.uid() = user_id)         WITH CHECK (auth.uid() = user_id);

CREATE POLICY categories_owner       ON public.categories
  FOR ALL USING (auth.uid() = user_id)         WITH CHECK (auth.uid() = user_id);

CREATE POLICY transactions_owner     ON public.transactions
  FOR ALL USING (auth.uid() = user_id)         WITH CHECK (auth.uid() = user_id);

CREATE POLICY aa_consents_owner      ON public.aa_consents
  FOR ALL USING (auth.uid() = user_id)         WITH CHECK (auth.uid() = user_id);

-- aa_link_refs joins through consent → user
CREATE POLICY aa_link_refs_owner ON public.aa_link_refs
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.aa_consents c
            WHERE c.id = consent_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.aa_consents c
            WHERE c.id = consent_id AND c.user_id = auth.uid())
  );

-- ============================================================================
-- Default categories trigger — seeds 10 standard categories on signup,
-- with correct type + is_default values baked in.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    (NEW.id, 'Food & Dining',  'utensils',     '#ef4444', 'expense', TRUE),
    (NEW.id, 'Transportation', 'car',          '#3b82f6', 'expense', TRUE),
    (NEW.id, 'Shopping',       'shopping-bag', '#f59e0b', 'expense', TRUE),
    (NEW.id, 'Entertainment',  'film',         '#8b5cf6', 'expense', TRUE),
    (NEW.id, 'Bills & Utilities', 'receipt',   '#10b981', 'expense', TRUE),
    (NEW.id, 'Healthcare',     'heart',        '#ec4899', 'expense', TRUE),
    (NEW.id, 'Salary',         'banknote',     '#22c55e', 'income',  TRUE),
    (NEW.id, 'Freelance',      'briefcase',    '#06b6d4', 'income',  TRUE),
    (NEW.id, 'Investment',     'trending-up',  '#6366f1', 'income',  TRUE),
    (NEW.id, 'Others',         'more-horizontal','#6b7280','both',   TRUE);
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Auth signup hook — create profile + seed categories atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, currency_symbol, number_format, subscription_tier)
  VALUES (NEW.id, '$', 'indian', 'free');

  -- Inline the default-categories seed so we don't need a second trigger
  -- on user_profiles. Same payload as create_default_categories().
  INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    (NEW.id, 'Food & Dining',     'utensils',        '#ef4444', 'expense', TRUE),
    (NEW.id, 'Transportation',    'car',             '#3b82f6', 'expense', TRUE),
    (NEW.id, 'Shopping',          'shopping-bag',    '#f59e0b', 'expense', TRUE),
    (NEW.id, 'Entertainment',     'film',            '#8b5cf6', 'expense', TRUE),
    (NEW.id, 'Bills & Utilities', 'receipt',         '#10b981', 'expense', TRUE),
    (NEW.id, 'Healthcare',        'heart',           '#ec4899', 'expense', TRUE),
    (NEW.id, 'Salary',            'banknote',        '#22c55e', 'income',  TRUE),
    (NEW.id, 'Freelance',         'briefcase',       '#06b6d4', 'income',  TRUE),
    (NEW.id, 'Investment',        'trending-up',     '#6366f1', 'income',  TRUE),
    (NEW.id, 'Others',            'more-horizontal', '#6b7280', 'both',    TRUE);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
