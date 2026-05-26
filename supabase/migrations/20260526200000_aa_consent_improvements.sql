-- Add last_fetched_at to aa_consents
ALTER TABLE aa_consents ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz;

-- Index for webhook/API lookups by provider_consent_id
CREATE INDEX IF NOT EXISTS idx_aa_consents_provider_consent_id ON aa_consents(provider_consent_id);

-- Index for cross-consent dedup in ensureLocalAccount
CREATE INDEX IF NOT EXISTS idx_aa_link_refs_fip_masked ON aa_link_refs(fip_id, masked_account_number);
