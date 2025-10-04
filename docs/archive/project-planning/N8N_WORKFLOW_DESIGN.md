# VaultWise n8n Workflow Design - Simplified & Scalable

> ⚠️ **DOCUMENTATION STATUS**: This document contains OUTDATED information from the original planning phase.
> 
> **ACTUAL IMPLEMENTATION**: See [`CURRENT_STATUS.md`](CURRENT_STATUS.md) for accurate current state.
> 
> **Key Differences**:
> - Document describes 6-node workflow → **Actual: 28 nodes**
> - References `processing_jobs` table → **Not implemented (simplified)**
> - Describes async processing → **Actual: Synchronous webhook**
> - References `get_user_context()` function → **Not implemented (direct HTTP calls)**
>
> This document is kept for historical reference but should NOT be used as implementation guide.

---

## 🚀 Overview

This document outlines the **ORIGINALLY PLANNED** n8n workflow design for VaultWise Dashboard bank statement processing. The approach prioritizes simplicity, reliability, and scalability through direct synchronous processing without complex async eventing.

**NOTE**: The actual implementation evolved differently. See `CURRENT_STATUS.md` for what was actually built.

## 📋 Design Philosophy

### Simplified Approach Benefits
1. **Direct Integration**: Frontend uploads file → n8n webhook → synchronous processing
2. **Dynamic Context**: n8n fetches user categories and existing transactions from Supabase at runtime
3. **Simple UX**: Loading states during processing, fresh data on navigation
4. **Better Scalability**: Fewer moving parts = more reliable system
5. **Easier Maintenance**: Straightforward flow similar to existing workflow

## 🏗️ Workflow Architecture

### Core Workflow Specifications
- **Name**: VaultWise Statement Processor
- **Type**: HTTP Webhook Workflow (Synchronous)
- **Trigger**: Direct webhook call from frontend
- **Processing**: AI-powered transaction extraction with dynamic user context
- **Output**: Direct Supabase database operations
- **Response**: Success/failure status to frontend
- **Performance**: 30 seconds to 2 minutes processing time
- **Scalability**: n8n cloud auto-scaling handles concurrency

### Simplified Workflow Node Structure (6 Core Nodes)
```
1. Webhook Trigger
   ↓
2. File Download & Content Extraction  
   ↓
3. Fetch User Context (Categories + Existing Transactions)
   ↓
4. ChatGPT Processing with User Context
   ↓
5. Deduplication & New Transaction Identification
   ↓
6. Save New Transactions to Supabase
   ↓
7. Return Success Response
```

## 📋 Detailed Node Implementation

### 1. Webhook Trigger Node
**Type**: Webhook Trigger  
**Method**: POST  
**Path**: `/vaultwise-process`  
**Authentication**: Header Auth (API Key)

**Expected Payload** (Simplified):
```json
{
  "user_id": "uuid",
  "account_id": "uuid", 
  "account_type": "savings|credit",
  "file_url": "https://supabase-storage-url/statements/user_id/filename.pdf",
  "file_name": "HDFC_Statement_Dec2024.pdf"
}
```

### 2. File Download & Content Extraction Node
**Type**: Function Node  
**Purpose**: Download file from Supabase and extract text content

```javascript
const downloadAndExtractContent = async () => {
  const { file_url, file_name } = $json;
  
  console.log(`📥 Downloading file: ${file_name}`);
  
  // Download file from Supabase Storage
  const fileResponse = await $http.request({
    method: 'GET',
    url: file_url,
    responseType: 'arraybuffer'
  });
  
  let extractedText = '';
  
  if (file_name.toLowerCase().endsWith('.pdf')) {
    // PDF text extraction (using pdf-parse or similar)
    const pdf = await import('pdf-parse');
    const data = await pdf.default(fileResponse.data);
    extractedText = data.text;
  } else if (file_name.toLowerCase().endsWith('.csv')) {
    // CSV content extraction
    extractedText = fileResponse.data.toString('utf8');
  }
  
  if (!extractedText || extractedText.length < 100) {
    throw new Error('Unable to extract text content from file');
  }
  
  console.log(`✅ Extracted ${extractedText.length} characters from ${file_name}`);
  
  return {
    ...$json,
    file_content: extractedText
  };
};

return [{ json: await downloadAndExtractContent() }];
```

### 3. Fetch User Context Node
**Type**: HTTP Request Node  
**Purpose**: Get user's categories and existing transactions from Supabase

**URL**: `{{$env.SUPABASE_URL}}/rest/v1/rpc/get_user_context`

**Method**: POST

**Headers**:
```json
{
  "Authorization": "Bearer {{$env.SUPABASE_SERVICE_KEY}}",
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "user_id": "{{$json.user_id}}",
  "account_id": "{{$json.account_id}}",
  "account_type": "{{$json.account_type}}"
}
```

**Response**: Returns user categories and existing transactions for the account/month

**Database Function** (Create in Supabase):
```sql
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
```

### 4. ChatGPT Processing Node
**Type**: OpenAI Node  
**Model**: GPT-4o-mini (cost-effective)  
**Purpose**: Extract transactions with user context

**Prompt Template**:
```
CRITICAL: RETURN ONLY VALID JSON. NO EXPLANATIONS.

Extract ALL transactions from this bank statement. Use the user's existing categories for mapping.

USER'S CATEGORIES:
{{#each user_context.user_categories}}
- {{name}}: {{keywords}}
{{/each}}

EXISTING TRANSACTIONS TO AVOID DUPLICATES:
{{#each user_context.existing_transactions}}
- {{transaction_date}}: ₹{{amount}} - {{description}}
{{/each}}

EXTRACTION RULES:
1. Date format: YYYY-MM-DD only
2. Amount: Positive numbers only (type indicates income/expense)  
3. Type: "income" for credits, "expense" for debits
4. Categories: Use ONLY user's categories above
5. Extract EVERYTHING, ignore balance/summary lines

REQUIRED JSON FORMAT:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Clean description", 
      "amount": 1234.56,
      "type": "income|expense",
      "category": "Exact category name from user's list"
    }
  ]
}

BANK STATEMENT CONTENT:
{{file_content}}

RETURN ONLY THE JSON OBJECT.
```

### 5. Deduplication & Save Node
**Type**: Function Node  
**Purpose**: Remove duplicates and save new transactions

```javascript
const processAndSaveTransactions = async () => {
  const { user_id, account_id, account_type, user_context, ai_response } = $json;
  
  console.log('🔄 Processing AI response and deduplicating...');
  
  // Parse AI response
  let extractedTransactions;
  try {
    const cleanResponse = ai_response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleanResponse);
    extractedTransactions = parsed.transactions || [];
  } catch (error) {
    throw new Error(`AI response parsing failed: ${error.message}`);
  }
  
  console.log(`📊 Extracted ${extractedTransactions.length} transactions from AI`);
  
  // Simple deduplication - check if similar transaction exists
  const existingTransactions = user_context.existing_transactions || [];
  const newTransactions = [];
  
  for (const newTxn of extractedTransactions) {
    const isDuplicate = existingTransactions.some(existing => {
      const dateDiff = Math.abs(new Date(newTxn.date) - new Date(existing.transaction_date));
      const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
      const amountDiff = Math.abs(newTxn.amount - existing.amount);
      
      // Mark as duplicate if same date and amount (± ₹1)
      return daysDiff <= 1 && amountDiff <= 1;
    });
    
    if (!isDuplicate) {
      newTransactions.push(newTxn);
    } else {
      console.log(`🔄 Skipping duplicate: ${newTxn.date} ₹${newTxn.amount} ${newTxn.description}`);
    }
  }
  
  console.log(`✅ After deduplication: ${newTransactions.length} new transactions`);
  
  if (newTransactions.length === 0) {
    return {
      success: true,
      message: 'No new transactions to add - all were duplicates',
      transactions_added: 0
    };
  }
  
  // Find category IDs for transactions
  const categories = user_context.user_categories || [];
  const categoryMap = new Map();
  categories.forEach(cat => categoryMap.set(cat.name, cat.id));
  
  // Prepare transactions for database insert
  const transactionsToSave = newTransactions.map(txn => ({
    user_id,
    account_id,
    account_type,
    transaction_date: txn.date,
    amount: Math.abs(parseFloat(txn.amount)),
    description: txn.description,
    transaction_type: txn.type,
    category_id: categoryMap.get(txn.category) || null,
    notes: txn.category ? `AI Category: ${txn.category}` : null,
    created_at: new Date().toISOString()
  }));
  
  // Save to Supabase
  const response = await $http.request({
    method: 'POST',
    url: `${process.env.SUPABASE_URL}/rest/v1/transactions`,
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: transactionsToSave
  });
  
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Database insert failed: ${response.status} ${response.statusText}`);
  }
  
  console.log(`✅ Successfully saved ${newTransactions.length} transactions to database`);
  
  return {
    success: true,
    message: `Successfully processed ${extractedTransactions.length} transactions, added ${newTransactions.length} new ones`,
    transactions_extracted: extractedTransactions.length,
    transactions_added: newTransactions.length,
    duplicates_skipped: extractedTransactions.length - newTransactions.length
  };
};

return [{ json: await processAndSaveTransactions() }];
```

## 🎯 Frontend Integration

### Simple File Upload Flow

**Frontend Implementation**:
```typescript
// Upload and process bank statement
const uploadStatement = async (file: File, accountId: string, accountType: 'savings' | 'credit') => {
  setLoading(true);
  
  try {
    // 1. Upload file to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${userId}/${accountId}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('statements')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    // 2. Get file public URL
    const { data: urlData } = supabase.storage
      .from('statements')
      .getPublicUrl(filePath);
    
    // 3. Call n8n webhook directly
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_API_KEY}`
      },
      body: JSON.stringify({
        user_id: userId,
        account_id: accountId,
        account_type: accountType,
        file_url: urlData.publicUrl,
        file_name: file.name
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success message
      setMessage(`✅ ${result.message}`);
      
      // Navigate back to dashboard - fresh data will be loaded
      router.push('/dashboard');
    } else {
      throw new Error(result.error || 'Processing failed');
    }
    
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

## 🎛️ Configuration & Environment

### Required Environment Variables
```bash
# n8n Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key

# Frontend Configuration  
VITE_N8N_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/vaultwise-process
VITE_N8N_API_KEY=your-n8n-api-key (if needed for auth)
```

## ⚡ Performance & Scalability

### Expected Performance
- **Processing Time**: 30 seconds - 2 minutes per statement
- **File Size**: Up to 10MB (most bank statements are 1-3MB)
- **Concurrent Users**: n8n cloud auto-scales to handle multiple users
- **Accuracy**: >90% transaction extraction accuracy

### Scalability Features
- **n8n Cloud**: Automatic scaling based on workload
- **Supabase**: Built-in connection pooling and performance optimization
- **Simple Architecture**: Fewer components = better reliability
- **Direct Processing**: No complex queue management needed

## 🔧 Deployment Steps

1. **Create Database Function** - Add `get_user_context()` function to Supabase
2. **Set up n8n Workflow** - Create 6-node workflow in n8n cloud
3. **Configure Environment Variables** - Add API keys and URLs
4. **Test with Sample Files** - Validate processing with real bank statements
5. **Frontend Integration** - Update upload component to call n8n webhook
6. **Go Live** - Deploy and monitor performance

---

**Workflow Version**: 3.0 (Simplified)  
**Last Updated**: December 29, 2024  
**Status**: Simple & Production Ready  
**Owner**: VaultWise Development Team
**Type**: HTTP Request Node  
**Method**: GET  
**URL**: `{{$json.file_url}}`  
**Response Format**: File

**Headers**:
```json
{
  "User-Agent": "VaultWise-Processor/2.0"
}
```

### 5. Extract File Content Node
**Type**: Function Node  
**Purpose**: Extract text content from PDF/CSV files

```javascript
const extractFileContent = () => {
  const { file_name } = $json;
  const fileData = $input.first().binary;
  
  let extractedText = '';
  
  if (file_name.toLowerCase().endsWith('.pdf')) {
    // PDF processing logic (existing implementation)
    extractedText = processPDFContent(fileData);
  } else if (file_name.toLowerCase().endsWith('.csv')) {
    // CSV processing logic
    const csvContent = Buffer.from(fileData.data, 'base64').toString('utf8');
    extractedText = csvContent;
  } else {
    throw new Error(`Unsupported file format: ${file_name}`);
  }
  
  console.log(`📖 Extracted ${extractedText.length} characters from ${file_name}`);
  
  return {
    ...($json),
    file_content: extractedText,
    content_length: extractedText.length
  };
};

return [{ json: extractFileContent() }];
```

### 6. Get User Context Node
**Type**: HTTP Request Node  
**Method**: GET  
**URL**: `{{$env.SUPABASE_URL}}/rest/v1/transactions`

**Headers**:
```json
{
  "Authorization": "Bearer {{$env.SUPABASE_SERVICE_KEY}}",
  "Content-Type": "application/json"
}
```

**Query Parameters**:
```
user_id=eq.{{$json.user_id}}
account_id=eq.{{$json.account_id}}
transaction_date=gte.{{new Date(Date.now() - 180*24*60*60*1000).toISOString().split('T')[0]}}
select=transaction_date,amount,description,transaction_type
limit=1000
```

### 7. Enhanced AI Processing Node
**Type**: OpenAI/Anthropic Node  
**Model**: GPT-4 Mini / Claude 3.5 Sonnet  
**Purpose**: Extract transactions with user context awareness

**Enhanced Prompt Template**:
```
CRITICAL: RETURN ONLY JSON. NO EXPLANATIONS OR ADDITIONAL TEXT.

You are processing a bank statement for VaultWise Dashboard. Extract ALL transactions with maximum accuracy.

STATEMENT INFORMATION:
- File: {{$json.file_name}}
- Account: {{$json.account_info.name}} ({{$json.account_info.type}})
- Currency: {{$json.account_info.currency}}

USER'S EXISTING CATEGORIES:
{{#each $json.user_categories}}
- {{name}}: {{#each keywords}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

PROCESSING RULES:
1. DATE FORMAT: Convert ALL dates to DD/MM/YYYY
2. EXTRACT EVERYTHING: Include ALL visible transactions
3. TRANSACTION TYPES:
   - income: Salary, deposits, refunds, interest, credits
   - expense: Purchases, withdrawals, bills, fees, debits
4. CATEGORIZATION: Use ONLY user's categories above
5. AMOUNTS: Always positive numbers (type indicates income/expense)

DEDUPLICATION CONTEXT:
Recent transactions (last 6 months) to avoid:
{{#each existing_transactions}}
- {{transaction_date}}: ₹{{amount}} - {{description}}
{{/each}}

REQUIRED JSON OUTPUT:
{
  "bank_name": "Detected Bank",
  "account_type": "{{$json.account_info.name}}",
  "currency": "{{$json.account_info.currency}}",
  "statement_period": {
    "start_date": "DD/MM/YYYY",
    "end_date": "DD/MM/YYYY"
  },
  "transactions": [
    {
      "date": "DD/MM/YYYY",
      "description": "Transaction description", 
      "amount": 1234.56,
      "type": "income|expense",
      "category": "User Category Name",
      "confidence": 0.95
    }
  ]
}

STATEMENT CONTENT:
{{$json.file_content}}

RETURN ONLY THE JSON OBJECT. NO OTHER TEXT.
```

### 8. Category Mapping Node
**Type**: Function Node  
**Purpose**: Map AI categories to user's actual category IDs

```javascript
const mapCategoriesToUser = () => {
  const { ai_response, user_categories } = $json;
  
  // Parse AI response
  let parsedResponse;
  try {
    const cleanResponse = ai_response
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    parsedResponse = JSON.parse(cleanResponse);
  } catch (error) {
    throw new Error(`AI response parsing failed: ${error.message}`);
  }
  
  // Create category mapping lookup
  const categoryLookup = new Map();
  
  user_categories?.forEach(cat => {
    // Direct name mapping
    categoryLookup.set(cat.name.toLowerCase(), cat.id);
    
    // Keyword-based mapping
    cat.keywords?.forEach(keyword => {
      categoryLookup.set(keyword.toLowerCase(), cat.id);
    });
  });
  
  // Map transactions to user categories
  const mappedTransactions = parsedResponse.transactions.map(transaction => {
    const categoryName = transaction.category?.toLowerCase() || '';
    const description = transaction.description?.toLowerCase() || '';
    
    // Try direct category match
    let categoryId = categoryLookup.get(categoryName);
    
    // Try keyword matching in description
    if (!categoryId) {
      for (const [keyword, id] of categoryLookup.entries()) {
        if (description.includes(keyword)) {
          categoryId = id;
          break;
        }
      }
    }
    
    // Default fallback
    if (!categoryId) {
      const fallbackCategory = user_categories?.find(cat => 
        cat.name === 'Other' || cat.name === 'Other Income'
      );
      categoryId = fallbackCategory?.id || null;
    }
    
    return {
      ...transaction,
      category_id: categoryId,
      original_category: transaction.category,
      mapped_at: new Date().toISOString()
    };
  });
  
  console.log(`🏷️ Mapped ${mappedTransactions.length} transactions to user categories`);
  
  return {
    ...parsedResponse,
    transactions: mappedTransactions,
    total_transactions: mappedTransactions.length
  };
};

return [{ json: mapCategoriesToUser() }];
```

### 9. Advanced Deduplication Node
**Type**: Function Node  
**Purpose**: Remove duplicates using sophisticated matching

```javascript
const advancedDeduplication = () => {
  const { transactions, existing_transactions } = $json;
  
  console.log(`🔍 Deduplication started:`);
  console.log(`- New transactions: ${transactions.length}`);
  console.log(`- Existing transactions: ${existing_transactions?.length || 0}`);
  
  if (!existing_transactions || existing_transactions.length === 0) {
    console.log(`✅ No existing transactions, keeping all ${transactions.length}`);
    return {
      ...$json,
      final_transactions: transactions,
      deduplication_stats: {
        total_extracted: transactions.length,
        duplicates_found: 0,
        new_transactions: transactions.length
      }
    };
  }
  
  // Sophisticated deduplication logic
  const isDuplicate = (newTxn) => {
    const newDate = normalizeDate(newTxn.date);
    const newAmount = parseFloat(newTxn.amount);
    const newDesc = normalizeDescription(newTxn.description);
    
    return existing_transactions.some(existing => {
      const existingDate = normalizeDate(existing.transaction_date);
      const existingAmount = parseFloat(existing.amount);
      const existingDesc = normalizeDescription(existing.description);
      
      // Multi-factor matching
      const dateMatch = existingDate === newDate;
      const amountMatch = Math.abs(existingAmount - newAmount) <= 1;
      const descriptionSimilarity = calculateSimilarity(newDesc, existingDesc);
      
      // Require high confidence for duplicate detection
      const isDupe = dateMatch && amountMatch && descriptionSimilarity > 0.8;
      
      if (isDupe) {
        console.log(`🔄 Duplicate: ${newDate} ₹${newAmount} "${newTxn.description}"`);
      }
      
      return isDupe;
    });
  };
  
  // Helper functions
  const normalizeDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr.split('T')[0]; // Handle ISO format
  };
  
  const normalizeDescription = (desc) => {
    return (desc || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  };
  
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };
  
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };
  
  // Filter out duplicates
  const newTransactions = transactions.filter(txn => !isDuplicate(txn));
  const duplicateCount = transactions.length - newTransactions.length;
  
  console.log(`✅ Deduplication completed:`);
  console.log(`- New unique transactions: ${newTransactions.length}`);
  console.log(`- Duplicates filtered: ${duplicateCount}`);
  
  return {
    ...$json,
    final_transactions: newTransactions,
    deduplication_stats: {
      total_extracted: transactions.length,
      duplicates_found: duplicateCount,
      new_transactions: newTransactions.length
    }
  };
};

return [{ json: advancedDeduplication() }];
```

### 10. Save Transactions Node
**Type**: HTTP Request Node  
**Method**: POST  
**URL**: `{{$env.SUPABASE_URL}}/rest/v1/transactions`

**Headers**:
```json
{
  "Authorization": "Bearer {{$env.SUPABASE_SERVICE_KEY}}",
  "Content-Type": "application/json",
  "Prefer": "return=representation"
}
```

**Body Template**:
```json
{{$json.final_transactions.map(t => ({
  user_id: $json.user_id,
  account_id: $json.account_id,
  transaction_date: t.date.split('/').reverse().join('-'),
  amount: Math.abs(parseFloat(t.amount)),
  description: t.description,
  transaction_type: t.type,
  account_type: $json.account_info.type,
  category_id: t.category_id,
  notes: `AI Confidence: ${t.confidence || 0.9} | Original Category: ${t.original_category || 'N/A'}`
}))}}
```

### 11. Update Account Balance Node
**Type**: Function Node  
**Purpose**: Update account balance based on new transactions

```javascript
const updateAccountBalance = async () => {
  const { account_id, account_info, final_transactions } = $json;
  
  if (!final_transactions || final_transactions.length === 0) {
    console.log('ℹ️ No transactions to process for balance update');
    return { ...$json, balance_updated: false };
  }
  
  try {
    // Calculate net balance change
    const balanceChange = final_transactions.reduce((total, txn) => {
      const amount = Math.abs(parseFloat(txn.amount));
      return txn.type === 'income' ? total + amount : total - amount;
    }, 0);
    
    console.log(`💰 Calculated balance change: ₹${balanceChange}`);
    
    // Determine table name based on account type
    const tableName = account_info.type === 'savings' ? 'savings_accounts' : 'credit_cards';
    
    // Get current balance
    const currentBalanceResponse = await $http.request({
      method: 'GET',
      url: `${process.env.SUPABASE_URL}/rest/v1/${tableName}?id=eq.${account_id}&select=current_balance`,
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const currentBalance = currentBalanceResponse?.data?.[0]?.current_balance || 0;
    const newBalance = currentBalance + balanceChange;
    
    // Update account balance
    await $http.request({
      method: 'PATCH',
      url: `${process.env.SUPABASE_URL}/rest/v1/${tableName}?id=eq.${account_id}`,
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: {
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      }
    });
    
    console.log(`✅ Balance updated: ₹${currentBalance} → ₹${newBalance}`);
    
    return {
      ...$json,
      balance_updated: true,
      balance_change: balanceChange,
      previous_balance: currentBalance,
      new_balance: newBalance
    };
    
  } catch (error) {
    console.error('❌ Balance update failed:', error.message);
    // Don't fail entire workflow for balance errors
    return {
      ...$json,
      balance_updated: false,
      balance_error: error.message
    };
  }
};

return [{ json: await updateAccountBalance() }];
```

### 12. Complete Job Node
**Type**: HTTP Request Node  
**Method**: PATCH  
**URL**: `{{$env.SUPABASE_URL}}/rest/v1/processing_jobs?id=eq.{{$json.job_id}}`

**Headers**:
```json
{
  "Authorization": "Bearer {{$env.SUPABASE_SERVICE_KEY}}",
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
}
```

**Body**:
```json
{
  "status": "completed",
  "processing_completed_at": "{{new Date().toISOString()}}",
  "transactions_extracted": "{{$json.deduplication_stats.total_extracted}}",
  "transactions_new": "{{$json.deduplication_stats.new_transactions}}",
  "transactions_duplicates": "{{$json.deduplication_stats.duplicates_found}}"
}
```

### 13. Error Handler Node
**Type**: Function Node  
**Purpose**: Handle workflow errors and update job status

```javascript
const handleWorkflowError = async () => {
  const error = $input.first()?.error;
  const jobId = $json?.job_id || $input.first()?.json?.job_id;
  
  console.error('❌ VaultWise workflow error:', {
    error: error?.message || 'Unknown error',
    jobId,
    timestamp: new Date().toISOString(),
    context: $json
  });
  
  if (jobId) {
    try {
      await $http.request({
        method: 'PATCH',
        url: `${process.env.SUPABASE_URL}/rest/v1/processing_jobs?id=eq.${jobId}`,
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: {
          status: 'failed',
          error_message: error?.message || 'Unknown error occurred',
          processing_completed_at: new Date().toISOString()
        }
      });
      
      console.log('✅ Job status updated to failed');
    } catch (updateError) {
      console.error('❌ Failed to update job status:', updateError.message);
    }
  }
  
  // Return structured error response
  return {
    success: false,
    error: error?.message || 'Unknown error',
    job_id: jobId,
    timestamp: new Date().toISOString()
  };
};

return [{ json: await handleWorkflowError() }];
```

## 🔧 Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# AI API Keys
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Webhook Security
VAULTWISE_WEBHOOK_SECRET=your-webhook-secret-key

# Optional: Monitoring
WORKFLOW_ENVIRONMENT=production
ENABLE_DEBUG_LOGGING=false
```

## 🚀 Deployment Instructions

### Step 1: Create New Workflow
1. Create new n8n workflow (do NOT modify existing one)
2. Name: "VaultWise Statement Processor v2.0"
3. Set up webhook trigger with authentication
4. Configure all nodes according to specifications above

### Step 2: Environment Setup
1. Add all required environment variables to n8n
2. Test Supabase connectivity
3. Validate API keys for OpenAI/Anthropic
4. Set up webhook security

### Step 3: Testing
1. Test webhook endpoint with sample payload
2. Validate file download from Supabase Storage
3. Test AI processing with real bank statement
4. Verify database writes to Supabase
5. Confirm error handling paths

### Step 4: Integration
1. Update VaultWise frontend with webhook URL
2. Test end-to-end file processing flow
3. Verify real-time status updates
4. Monitor processing performance

## 📊 Monitoring & Observability

### Workflow Metrics
- Processing time per file
- Success/failure rates
- AI accuracy metrics
- Deduplication effectiveness
- Error frequency and types

### Logging Strategy
```javascript
// Structured logging throughout workflow
console.log(JSON.stringify({
  stage: 'ai_processing',
  job_id: $json.job_id,
  user_id: $json.user_id,
  file_name: $json.file_name,
  transactions_extracted: parsedResponse.transactions.length,
  processing_time_ms: Date.now() - startTime,
  timestamp: new Date().toISOString()
}));
```

### Alert Configuration
- Processing time > 5 minutes
- Error rate > 5%
- AI confidence < 80%
- Deduplication rate > 50%
- Job stuck in "processing" status

## 🔒 Security Considerations

### Authentication
- Webhook secret validation
- Supabase service key security
- API key protection
- Request payload validation

### Data Security
- File URL validation
- User data isolation
- Error message sanitization
- Audit trail logging

### Rate Limiting
- Max 10 requests per minute per user
- File size limit: 10MB
- Processing timeout: 5 minutes
- Retry limit: 3 attempts

## 📚 Testing Guide

### Test Cases
1. **Valid PDF processing** - Standard bank statement
2. **Valid CSV processing** - CSV format statement
3. **Invalid file format** - Should reject gracefully
4. **Large file processing** - Test performance limits
5. **Network errors** - Test error recovery
6. **Malformed payload** - Validation testing
7. **Authentication failure** - Security testing
8. **Duplicate transactions** - Deduplication testing

### Test Data
Prepare sample files for each supported bank:
- HDFC Bank statement (PDF/CSV)
- SBI statement (PDF/CSV)
- ICICI Bank statement (PDF/CSV)
- Axis Bank statement (PDF/CSV)

## 🔄 Enhanced Features & Best Practices

### Multi-Model AI Failover
Based on research from successful n8n templates, implement AI model redundancy:

```javascript
// AI Processing with Failover Logic
const processWithFailover = async (fileContent, userContext) => {
  const models = [
    { provider: 'openai', model: 'gpt-4o-mini', priority: 1 },
    { provider: 'anthropic', model: 'claude-3-5-sonnet', priority: 2 },
    { provider: 'openai', model: 'gpt-3.5-turbo', priority: 3 }
  ];
  
  for (const model of models) {
    try {
      console.log(`🤖 Attempting processing with ${model.provider}/${model.model}`);
      const result = await processWithModel(model, fileContent, userContext);
      
      if (result.success && result.transactions.length > 0) {
        console.log(`✅ Success with ${model.provider}/${model.model}`);
        return { ...result, modelUsed: model };
      }
    } catch (error) {
      console.warn(`⚠️ ${model.provider} failed: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('All AI models failed to process the document');
};
```

### Enhanced Deduplication with Confidence Scoring
Advanced deduplication based on multiple similarity factors:

```javascript
// Advanced Deduplication with Confidence Scoring
const advancedDeduplication = () => {
  const { transactions, existing_transactions } = $json;
  
  const calculateDuplicateScore = (newTxn, existingTxn) => {
    let score = 0;
    
    // Date similarity (exact match = 40 points, within 1 day = 20 points)
    const dateDiff = Math.abs(new Date(newTxn.date) - new Date(existingTxn.transaction_date));
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
    if (daysDiff === 0) score += 40;
    else if (daysDiff <= 1) score += 20;
    
    // Amount similarity (exact = 30 points, within 1% = 15 points)
    const amountDiff = Math.abs(newTxn.amount - existingTxn.amount);
    const amountPercent = amountDiff / existingTxn.amount;
    if (amountDiff === 0) score += 30;
    else if (amountPercent <= 0.01) score += 15;
    
    // Description similarity using Levenshtein distance (max 20 points)
    const descScore = calculateTextSimilarity(newTxn.description, existingTxn.description);
    score += Math.round(descScore * 20);
    
    // Transaction type match (10 points)
    if (newTxn.type === existingTxn.transaction_type) score += 10;
    
    return score;
  };
  
  const filteredTransactions = transactions.filter(txn => {
    const duplicateScores = existing_transactions.map(existing => 
      calculateDuplicateScore(txn, existing)
    );
    
    const maxScore = Math.max(...duplicateScores, 0);
    const isDuplicate = maxScore >= 80; // 80+ score = likely duplicate
    
    if (isDuplicate) {
      console.log(`🔍 Duplicate detected: ${txn.description} (Score: ${maxScore})`);
    }
    
    return !isDuplicate;
  });
  
  console.log(`✅ Deduplication: ${transactions.length} → ${filteredTransactions.length} transactions`);
  
  return {
    ...$json,
    final_transactions: filteredTransactions,
    deduplication_stats: {
      total_extracted: transactions.length,
      duplicates_filtered: transactions.length - filteredTransactions.length,
      new_transactions: filteredTransactions.length
    }
  };
};
```

### Rate Limiting & Security Enhancements
Implement robust security measures:

```javascript
// Rate Limiting Logic (add to webhook trigger)
const rateLimitCheck = () => {
  const userId = $json.user_id;
  const currentTime = Date.now();
  
  // Get user's subscription tier
  const subscriptionTier = $json.user_subscription_tier || 'free';
  
  // Rate limits by tier
  const limits = {
    free: { requests: 5, window: 3600000 }, // 5 per hour
    premium: { requests: 50, window: 3600000 } // 50 per hour
  };
  
  const userLimit = limits[subscriptionTier];
  
  // Check against processing_jobs table for recent requests
  // Implementation would query Supabase for recent job counts
  
  return { allowed: true, remainingRequests: userLimit.requests };
};
```

### Real-time Status Updates
Enhanced status tracking with detailed progress:

```javascript
// Enhanced Status Update Function
const updateProcessingStatus = async (jobId, status, metadata = {}) => {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...metadata
  };
  
  if (status === 'processing' && !metadata.processing_started_at) {
    updateData.processing_started_at = new Date().toISOString();
  }
  
  if (status === 'completed' || status === 'failed') {
    updateData.processing_completed_at = new Date().toISOString();
  }
  
  await $http.request({
    method: 'PATCH',
    url: `${process.env.SUPABASE_URL}/rest/v1/processing_jobs?id=eq.${jobId}`,
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: updateData
  });
  
  console.log(`📊 Job ${jobId} updated: ${status}`, metadata);
};
```

### Processing Analytics & Metrics
Comprehensive metrics collection for monitoring:

```javascript
// Analytics and Metrics Collection
const collectProcessingMetrics = () => {
  const {
    job_id,
    user_id,
    file_name,
    file_size_bytes,
    deduplication_stats,
    processing_start_time,
    modelUsed
  } = $json;
  
  const processingTime = Date.now() - processing_start_time;
  
  const metrics = {
    job_id,
    user_id,
    file_name,
    file_size_bytes,
    processing_time_ms: processingTime,
    ai_model_used: modelUsed?.provider + '/' + modelUsed?.model,
    transactions_extracted: deduplication_stats?.total_extracted || 0,
    transactions_new: deduplication_stats?.new_transactions || 0,
    duplicate_rate: deduplication_stats?.duplicates_filtered / deduplication_stats?.total_extracted || 0,
    success_rate: 1.0,
    timestamp: new Date().toISOString()
  };
  
  // Store in processing_metadata JSONB field
  return {
    ...$json,
    processing_metadata: metrics
  };
};
```

## 🚨 Production Readiness Checklist

### Pre-deployment Validation
- [ ] **Database Migration**: Apply processing_jobs table migration
- [ ] **Environment Variables**: All required API keys configured
- [ ] **Webhook Security**: Secret key validation working
- [ ] **File Validation**: Size limits and format checks implemented  
- [ ] **Rate Limiting**: Per-tier limits configured and tested
- [ ] **Error Handling**: All error paths tested and logged
- [ ] **AI Failover**: Multiple models configured and tested
- [ ] **Monitoring**: Logging and metrics collection verified

### Performance Benchmarks
- **Processing Time**: < 2 minutes for standard bank statements
- **Success Rate**: > 95% for supported bank formats
- **Accuracy Rate**: > 90% transaction extraction accuracy
- **Deduplication**: < 5% false positives, < 1% false negatives
- **Uptime**: 99.9% webhook availability
- **Throughput**: Handle 100+ concurrent processing jobs

### Monitoring & Alerting
Configure alerts for:
- Processing time > 5 minutes
- Error rate > 5% in any 10-minute window
- AI model failure rate > 10%
- Queue backlog > 50 pending jobs
- Webhook endpoint response time > 30 seconds

---

**Workflow Version**: 2.1 (Enhanced)  
**Last Updated**: December 29, 2024  
**Status**: Enhanced Design Complete - Production Ready  
**Owner**: VaultWise Development Team

## 📚 Implementation Resources

### Required n8n Nodes
- **Webhook Trigger** - For receiving processing requests
- **HTTP Request** - For Supabase API calls and file downloads
- **Function/Code** - For JavaScript processing logic
- **OpenAI/Anthropic** - For AI document processing
- **Switch/If** - For conditional logic and error routing
- **Set** - For data transformation
- **Error Trigger** - For comprehensive error handling

### Recommended n8n Packages
- **@n8n/n8n-nodes-langchain** - For advanced AI agent capabilities
- **Community Supabase nodes** - For enhanced Supabase integration
- **Custom nodes** - For specific VaultWise processing logic

### Development Workflow
1. **Local n8n Setup** - Test workflow in development environment
2. **Staging Deployment** - Deploy to staging n8n instance  
3. **Integration Testing** - End-to-end testing with VaultWise frontend
4. **Performance Testing** - Load testing with multiple concurrent jobs
5. **Production Deployment** - Deploy to production n8n cloud instance
6. **Monitoring Setup** - Configure alerts and dashboards