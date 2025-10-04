-- Simplified VaultWise Database Enhancement
-- Migration: Add basic subscription support (no complex processing_jobs)
-- File: supabase/migrations/20241229150000_simplified_subscription_support.sql

-- Add subscription fields to user_profiles (simplified)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription 
ON user_profiles(subscription_tier, trial_expires_at, subscription_expires_at);

-- Create storage bucket for bank statements (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'statements',
  'Bank Statements',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'text/csv', 'application/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for secure file upload
CREATE POLICY IF NOT EXISTS "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'statements' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  -- Only allow premium users or trial users to upload
  (
    SELECT subscription_tier = 'premium' 
    OR (trial_expires_at IS NOT NULL AND trial_expires_at > NOW())
    OR (subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW())
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Users can read own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'statements' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Service role can read all files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'statements' AND
  auth.role() = 'service_role'
);

-- Function to get user context for n8n workflow
CREATE OR REPLACE FUNCTION get_user_context(
  p_user_id UUID,
  p_account_id UUID,
  p_account_type TEXT
)
RETURNS JSON AS $$
DECLARE
  categories JSON;
  existing_transactions JSON;
  statement_month DATE;
BEGIN
  -- Get user categories
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', id,
      'name', name,
      'keywords', keywords
    )
  ) INTO categories
  FROM categories 
  WHERE user_id = p_user_id;
  
  -- Get statement month (current or previous month)
  statement_month := DATE_TRUNC('month', CURRENT_DATE);
  
  -- Get existing transactions for account in last 3 months
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'transaction_date', transaction_date,
      'amount', amount,
      'description', description,
      'transaction_type', transaction_type
    )
  ) INTO existing_transactions
  FROM transactions 
  WHERE user_id = p_user_id 
    AND (account_id = p_account_id OR account_id IS NULL)
    AND transaction_date >= (statement_month - INTERVAL '3 months')
  ORDER BY transaction_date DESC
  LIMIT 200;
  
  -- Return combined context
  RETURN JSON_BUILD_OBJECT(
    'user_categories', COALESCE(categories, '[]'::JSON),
    'existing_transactions', COALESCE(existing_transactions, '[]'::JSON),
    'statement_month', statement_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to service role
GRANT EXECUTE ON FUNCTION get_user_context(UUID, UUID, TEXT) TO service_role;

-- Add account limit function for free users (simplified)
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
    -- Count existing active accounts
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

-- Apply account limit triggers (if not exists)
DROP TRIGGER IF EXISTS enforce_savings_account_limit ON savings_accounts;
CREATE TRIGGER enforce_savings_account_limit
  BEFORE INSERT ON savings_accounts
  FOR EACH ROW EXECUTE FUNCTION check_account_limit();

DROP TRIGGER IF EXISTS enforce_credit_card_limit ON credit_cards;
CREATE TRIGGER enforce_credit_card_limit
  BEFORE INSERT ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION check_account_limit();

-- Add index on transactions table for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date 
ON transactions(user_id, account_id, transaction_date DESC);

-- Comment explaining the simplified approach
COMMENT ON FUNCTION get_user_context IS 'Simplified function to provide user context for n8n workflow processing. Returns categories and recent transactions for deduplication.';
