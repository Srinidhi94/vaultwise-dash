# Supabase Storage Setup - VaultWise Dashboard

> ⚠️ **DOCUMENTATION STATUS**: This document describes storage setup with `processing_jobs` table.
> 
> **ACTUAL IMPLEMENTATION**: Simplified architecture WITHOUT `processing_jobs` table.
> 
> **Key Changes**:
> - ❌ NO `processing_jobs` table (removed for simplicity)
> - ❌ NO real-time job status tracking via Supabase Realtime
> - ✅ Direct synchronous webhook processing instead
> - ⏳ Storage bucket configuration still needed for frontend
>
> **See [`CURRENT_STATUS.md`](CURRENT_STATUS.md) for accurate implementation.**

---

## 📁 Storage Configuration

### Storage Bucket: `statements`
```sql
-- Create storage bucket for bank statements
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'statements',
  'Bank Statements',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'text/csv', 'application/csv']
);
```

### Directory Structure
```
statements/
├── {user_id}/
│   ├── {account_id}/
│   │   ├── HDFC_Statement_202412.pdf
│   │   ├── SBI_Transactions_202412.csv
│   │   └── ...
│   └── processed/
│       ├── {job_id}_HDFC_Statement_202412.pdf
│       └── ...
└── temp/
    └── {job_id}/
        └── processing_files...
```

## 🔒 Security Policies

### Row Level Security (RLS) Policies
```sql
-- Policy: Users can only upload to their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'statements' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  -- Only allow premium users to upload (checked via function)
  is_premium_user(auth.uid())
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'statements' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: n8n workflow can read all files (service role)
CREATE POLICY "System can read all files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'statements' AND
  auth.role() = 'service_role'
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'statements' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Premium User Validation Function
```sql
-- Function to check if user has premium access for file uploads
CREATE OR REPLACE FUNCTION is_premium_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_tier VARCHAR(20);
  trial_active BOOLEAN := false;
BEGIN
  -- Get user's subscription information
  SELECT 
    subscription_tier,
    CASE 
      WHEN trial_expires_at IS NOT NULL AND trial_expires_at > NOW() THEN true
      WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW() THEN true
      ELSE false
    END
  INTO user_tier, trial_active
  FROM user_profiles
  WHERE id = user_id;
  
  -- Allow upload if premium subscriber or active trial
  RETURN (user_tier = 'premium') OR trial_active;
END;
$function$;
```

## 📤 File Upload Implementation

### Frontend Upload Component
```typescript
// hooks/useFileUpload.ts
import { supabase } from '@/integrations/supabase/client';
import { useProcessingStore } from '@/stores/useProcessingStore';

export const useFileUpload = () => {
  const { startProcessing } = useProcessingStore();

  const uploadFile = async (
    file: File,
    accountId: string,
    userId: string
  ): Promise<string> => {
    // Validate file type and size
    const allowedTypes = ['application/pdf', 'text/csv', 'application/csv'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF and CSV files are allowed');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      throw new Error('File size must be less than 10MB');
    }

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${userId}/${accountId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('statements')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL for n8n processing
    const { data: urlData } = supabase.storage
      .from('statements')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const startFileProcessing = async (
    file: File,
    accountId: string,
    accountInfo: {
      name: string;
      type: 'savings' | 'credit';
      currency: string;
    }
  ) => {
    try {
      // Upload file first
      const fileUrl = await uploadFile(file, accountId, supabase.auth.getUser().data.user?.id || '');
      
      // Create processing job and trigger n8n workflow
      const jobId = await startProcessing({
        accountId,
        fileUrl,
        fileName: file.name,
        accountInfo
      });

      return { jobId, fileUrl };
    } catch (error) {
      throw error;
    }
  };

  return { uploadFile, startFileProcessing };
};
```

### Processing Job Creation
```typescript
// stores/useProcessingStore.ts
interface ProcessingJob {
  id: string;
  accountId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  error?: string;
  transactionsExtracted?: number;
  transactionsNew?: number;
}

export const useProcessingStore = create<ProcessingState>((set, get) => ({
  jobs: [],
  currentJob: null,

  startProcessing: async (params: {
    accountId: string;
    fileUrl: string;
    fileName: string;
    accountInfo: AccountInfo;
  }) => {
    const user = supabase.auth.getUser().data.user;
    if (!user) throw new Error('User not authenticated');

    // Create processing job in database
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .insert({
        user_id: user.id,
        account_id: params.accountId,
        account_type: params.accountInfo.type,
        file_url: params.fileUrl,
        file_name: params.fileName,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Get user categories for AI context
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, keywords')
      .eq('user_id', user.id);

    // Trigger n8n workflow
    const webhookPayload = {
      job_id: job.id,
      user_id: user.id,
      account_id: params.accountId,
      file_url: params.fileUrl,
      file_name: params.fileName,
      user_categories: categories || [],
      account_info: params.accountInfo,
      webhook_secret: import.meta.env.VITE_N8N_WEBHOOK_SECRET
    };

    const webhookResponse = await fetch(
      import.meta.env.VITE_N8N_WEBHOOK_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_N8N_API_KEY}`
        },
        body: JSON.stringify(webhookPayload)
      }
    );

    if (!webhookResponse.ok) {
      throw new Error('Failed to start processing workflow');
    }

    // Update local state
    set((state) => ({
      jobs: [...state.jobs, job],
      currentJob: job
    }));

    return job.id;
  }
}));
```

## 📊 Real-time Status Updates

### Supabase Realtime Integration
```typescript
// hooks/useRealtimeProcessing.ts
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProcessingStore } from '@/stores/useProcessingStore';

export const useRealtimeProcessing = (userId: string) => {
  const { updateJobStatus } = useProcessingStore();

  useEffect(() => {
    // Subscribe to processing job changes
    const subscription = supabase
      .channel('processing-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Processing job update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            updateJobStatus(payload.new as ProcessingJob);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, updateJobStatus]);
};
```

## 🧹 File Cleanup & Management

### Automatic Cleanup Policies
```sql
-- Function to clean up old files (runs daily via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_old_statement_files()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete files older than 30 days
  DELETE FROM storage.objects
  WHERE bucket_id = 'statements'
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO processing_jobs (user_id, status, processing_metadata)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- System user
    'completed',
    jsonb_build_object('cleanup_files_deleted', deleted_count, 'timestamp', NOW())
  );
  
  RETURN deleted_count;
END;
$function$;

-- Schedule daily cleanup (requires pg_cron extension)
SELECT cron.schedule('cleanup-statement-files', '0 2 * * *', 'SELECT cleanup_old_statement_files();');
```

### Manual File Management
```typescript
// utils/fileManager.ts
export const fileManager = {
  // Delete file after successful processing
  deleteProcessedFile: async (filePath: string) => {
    const { error } = await supabase.storage
      .from('statements')
      .remove([filePath]);
    
    if (error) {
      console.error('Failed to delete processed file:', error);
    }
  },

  // Move file to processed folder
  moveToProcessed: async (originalPath: string, jobId: string) => {
    const fileName = originalPath.split('/').pop();
    const processedPath = `processed/${jobId}_${fileName}`;
    
    const { error } = await supabase.storage
      .from('statements')
      .move(originalPath, processedPath);
    
    if (error) {
      console.error('Failed to move file to processed folder:', error);
    }
    
    return processedPath;
  },

  // Get file size and metadata
  getFileInfo: async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('statements')
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });
    
    if (error) {
      throw error;
    }
    
    return data[0];
  }
};
```

## 🔧 Environment Configuration

### Required Environment Variables
```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/vaultwise-process
VITE_N8N_WEBHOOK_SECRET=your-webhook-secret-key
VITE_N8N_API_KEY=your-n8n-api-key

# Production only
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for n8n)
```

### Supabase Dashboard Configuration
1. **Storage Settings**:
   - Navigate to Storage > Settings
   - Set file size limit: 10MB
   - Enable RLS on storage.objects
   - Configure CORS for your domain

2. **Database Settings**:
   - Enable Realtime for `processing_jobs` table
   - Set up database webhooks if needed
   - Configure connection pooling for high load

## 🧪 Testing Strategy

### File Upload Testing
```typescript
// __tests__/fileUpload.test.ts
describe('File Upload', () => {
  it('should upload PDF files successfully', async () => {
    const mockFile = new File(['mock content'], 'statement.pdf', {
      type: 'application/pdf'
    });
    
    const { uploadFile } = useFileUpload();
    const result = await uploadFile(mockFile, 'account-id', 'user-id');
    
    expect(result).toContain('supabase.co/storage/v1/object/public/statements/');
  });

  it('should reject files larger than 10MB', async () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf'
    });
    
    await expect(uploadFile(largeFile, 'account-id', 'user-id'))
      .rejects.toThrow('File size must be less than 10MB');
  });

  it('should reject unsupported file types', async () => {
    const unsupportedFile = new File(['content'], 'document.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    
    await expect(uploadFile(unsupportedFile, 'account-id', 'user-id'))
      .rejects.toThrow('Only PDF and CSV files are allowed');
  });
});
```

---

**Document Version**: 1.0  
**Created**: December 29, 2024  
**Status**: Ready for Implementation  
**Owner**: VaultWise Development Team
