import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface StatementProcessingResponse {
  account?: {
    id: string;
    label: string;
    matched: boolean;
  };
  summary?: {
    statement_period: { from: string; to: string };
    total_transactions: number;
    sum_income: number;
    sum_expense: number;
    consistency?: string;
  };
  counts?: {
    extracted: number;
    new: number;
    duplicates: number;
    inserted: number;
  };
  status?: string;
  error?: string;
}

type ProcessingStage = 'uploading' | 'analyzing' | 'extracting' | 'saving' | null;

interface StatementState {
  uploading: boolean;
  processing: boolean;
  stage: ProcessingStage;
  progress: number;
  error: string | null;
  lastResult: StatementProcessingResponse | null;

  // Actions
  uploadAndProcess: (file: File) => Promise<StatementProcessingResponse>;
  deleteFile: (filePath: string) => Promise<void>;
  reset: () => void;
}

// Get webhook URL from environment variable
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export const useStatementStore = create<StatementState>()(
  devtools(
    (set) => ({
      uploading: false,
      processing: false,
      stage: null,
      progress: 0,
      error: null,
      lastResult: null,

      uploadAndProcess: async (file: File) => {
        let filePath = '';
        
        try {
          // Stage 1: Uploading
          set({ uploading: true, processing: false, stage: 'uploading', progress: 25, error: null });

          // 1. Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // 2. Upload file to Supabase Storage (temporary)
          const fileName = `${Date.now()}_${file.name}`;
          filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('statements')
            .upload(filePath, file, {
              cacheControl: '300', // 5 minutes cache
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // 3. Get signed URL (valid for 5 minutes)
          const { data: { signedUrl }, error: urlError } = await supabase.storage
            .from('statements')
            .createSignedUrl(filePath, 300); // 5 minutes

          if (urlError || !signedUrl) throw urlError || new Error('Failed to generate signed URL');

          // Stage 2: Processing with n8n
          set({ uploading: false, processing: true, stage: 'analyzing', progress: 50 });

          if (!N8N_WEBHOOK_URL) {
            throw new Error('n8n webhook URL not configured. Please set VITE_N8N_WEBHOOK_URL in .env.local');
          }

          // 4. Call n8n webhook with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout

          const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              file_url: signedUrl,
              file_name: file.name,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Webhook failed: ${response.statusText}`);
          }

          // Stage 3: Extracting
          set({ stage: 'extracting', progress: 75 });

          const result: StatementProcessingResponse = await response.json();

          // Stage 4: Saving
          set({ stage: 'saving', progress: 90 });

          // 5. Delete file from storage (security: don't store statements)
          await supabase.storage.from('statements').remove([filePath]);

          // Complete
          set({ 
            processing: false, 
            stage: null, 
            progress: 100, 
            lastResult: result 
          });

          return result;
        } catch (error) {
          // Cleanup: Delete file if it was uploaded
          if (filePath) {
            try {
              await supabase.storage.from('statements').remove([filePath]);
            } catch (cleanupError) {
              console.error('Failed to cleanup file:', cleanupError);
            }
          }

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({ 
            uploading: false, 
            processing: false, 
            stage: null, 
            progress: 0, 
            error: errorMessage 
          });
          throw error;
        }
      },

      deleteFile: async (filePath: string) => {
        try {
          const { error } = await supabase.storage
            .from('statements')
            .remove([filePath]);
          
          if (error) throw error;
        } catch (error) {
          console.error('Error deleting file:', error);
          throw error;
        }
      },

      reset: () => set({ 
        uploading: false, 
        processing: false, 
        stage: null, 
        progress: 0, 
        error: null, 
        lastResult: null 
      }),
    }),
    { name: 'statement-store' }
  )
);
