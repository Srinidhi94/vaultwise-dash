-- Add subscription fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
ADD COLUMN subscription_expires_at TIMESTAMPTZ,
ADD COLUMN trial_used BOOLEAN DEFAULT false,
ADD COLUMN trial_expires_at TIMESTAMPTZ;

-- Create processing_jobs table for n8n workflow status tracking
CREATE TABLE public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('savings', 'credit')),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  transactions_extracted INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,
  transactions_duplicates INTEGER DEFAULT 0,
  processing_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at DESC);
CREATE INDEX idx_processing_jobs_user_status ON processing_jobs(user_id, status);

-- Enable RLS on processing_jobs table
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for processing_jobs
CREATE POLICY "Users can view own processing jobs" ON processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processing jobs" ON processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processing jobs" ON processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own processing jobs" ON processing_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger for processing_jobs
CREATE TRIGGER update_processing_jobs_updated_at
  BEFORE UPDATE ON public.processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate account_id exists based on account_type
CREATE OR REPLACE FUNCTION public.validate_account_exists(
  p_user_id UUID,
  p_account_id UUID,
  p_account_type VARCHAR
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  account_exists BOOLEAN := false;
BEGIN
  IF p_account_type = 'savings' THEN
    SELECT EXISTS(
      SELECT 1 FROM savings_accounts 
      WHERE id = p_account_id AND user_id = p_user_id AND is_active = true
    ) INTO account_exists;
  ELSIF p_account_type = 'credit' THEN
    SELECT EXISTS(
      SELECT 1 FROM credit_cards 
      WHERE id = p_account_id AND user_id = p_user_id AND is_active = true
    ) INTO account_exists;
  END IF;
  
  RETURN account_exists;
END;
$function$;

-- Add constraint to ensure account_id exists and belongs to user
ALTER TABLE processing_jobs 
ADD CONSTRAINT check_account_exists 
CHECK (validate_account_exists(user_id, account_id, account_type));

-- Create function to clean up old processing jobs (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_processing_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processing_jobs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Create view for job statistics
CREATE VIEW public.processing_job_stats AS
SELECT 
  user_id,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
  SUM(transactions_new) as total_transactions_processed,
  AVG(EXTRACT(EPOCH FROM (processing_completed_at - processing_started_at))) as avg_processing_time_seconds
FROM processing_jobs
GROUP BY user_id;

-- RLS policy for the view
ALTER VIEW processing_job_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own job stats" ON processing_job_stats
  FOR SELECT USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE processing_jobs IS 'Tracks file processing jobs for AI-powered bank statement processing via n8n workflows';
COMMENT ON COLUMN processing_jobs.status IS 'Job status: pending (queued), processing (in progress), completed (success), failed (error)';
COMMENT ON COLUMN processing_jobs.processing_metadata IS 'Additional metadata from processing: AI confidence scores, processing duration, etc.';
COMMENT ON VIEW processing_job_stats IS 'Aggregated statistics for processing jobs per user for analytics and monitoring';
