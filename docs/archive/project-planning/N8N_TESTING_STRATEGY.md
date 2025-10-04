# n8n Workflow Testing Strategy - VaultWise Dashboard

## 🎯 Testing Objectives

### Primary Goals
- **Accuracy**: >90% transaction extraction accuracy across major Indian banks
- **Performance**: <2 minutes processing time for standard statements
- **Reliability**: <1% failure rate for valid files
- **Security**: Zero data leaks between users
- **Deduplication**: <5% false positives, <1% false negatives

## 🏦 Test Data Collection

### Indian Bank Statements Required

#### Priority 1 Banks (Must Have)
1. **HDFC Bank**
   - Account Statement (PDF) - Last 3 months
   - Credit Card Statement (PDF) - Last 3 months  
   - Transaction History (CSV export)
   - Mobile Banking CSV export

2. **State Bank of India (SBI)**
   - Passbook Statement (PDF)
   - Credit Card Statement (PDF)
   - Online Statement (PDF)
   - Transaction CSV export

3. **ICICI Bank**
   - Account Statement (PDF)
   - Credit Card Statement (PDF)
   - Net Banking CSV export
   - Mobile app export (CSV/PDF)

4. **Axis Bank**
   - Statement of Account (PDF)
   - Credit Card Statement (PDF)
   - Digital statement (PDF)
   - Transaction history (CSV)

#### Priority 2 Banks (Should Have)
5. **Kotak Mahindra Bank**
6. **Punjab National Bank (PNB)**
7. **Bank of Baroda**
8. **Canara Bank**
9. **IDFC First Bank**
10. **Yes Bank**

### Statement Variations to Test

#### PDF Format Variations
- **Scanned vs Digital**: Test both scanned (image-based) and digital PDFs
- **Multi-page Statements**: 1-page, 5-page, 20+ page statements
- **Different Layouts**: Portrait, landscape orientations
- **Language Variations**: English, Hindi, regional languages
- **Security Features**: Password-protected PDFs

#### CSV Format Variations
- **Encoding**: UTF-8, Windows-1252, ISO-8859-1
- **Delimiters**: Comma, semicolon, tab-separated
- **Date Formats**: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
- **Number Formats**: Indian (₹1,23,456.78) vs US (₹123,456.78)

#### Transaction Types to Cover
```json
{
  "income_types": [
    "Salary Credit",
    "Interest Credit", 
    "Dividend Credit",
    "Refund",
    "Transfer In",
    "Cash Deposit",
    "Online Transfer Credit"
  ],
  "expense_types": [
    "ATM Withdrawal",
    "POS Purchase", 
    "Online Purchase",
    "Bill Payment",
    "EMI Debit",
    "Transfer Out",
    "Bank Charges",
    "Insurance Premium"
  ],
  "edge_cases": [
    "Failed Transactions",
    "Reversed Transactions", 
    "Pending Transactions",
    "Foreign Currency",
    "Cryptocurrency",
    "Investment Transactions"
  ]
}
```

## 🧪 Test Case Categories

### 1. Functional Testing

#### Test Case: F001 - Basic PDF Processing
```yaml
Name: HDFC Account Statement Processing
Input:
  - File: HDFC_Account_Statement_Dec2024.pdf
  - User: Test user with existing categories
  - Account: HDFC Savings Account
Expected Output:
  - Status: completed
  - Transactions: 25-50 transactions extracted
  - Accuracy: >90% correct amounts and dates
  - Categories: Properly mapped to user categories
Validation:
  - Check all mandatory fields populated
  - Verify date format conversion
  - Validate amount calculations
  - Confirm deduplication logic
```

#### Test Case: F002 - CSV Processing with Special Characters
```yaml
Name: SBI CSV with Hindi Descriptions
Input:
  - File: SBI_Transactions_Hindi.csv
  - Encoding: UTF-8 with Hindi text
Expected Output:
  - Proper handling of Unicode characters
  - Transaction descriptions in Hindi preserved
  - No encoding corruption
```

#### Test Case: F003 - Multi-Account Processing
```yaml
Name: Concurrent Processing Different Banks
Input:
  - File1: HDFC_Statement.pdf (User A, Account 1)
  - File2: SBI_Statement.pdf (User A, Account 2)  
  - File3: ICICI_Statement.pdf (User B, Account 1)
Expected Output:
  - All files processed independently
  - No cross-contamination between users
  - Correct account assignment for each file
```

### 2. Performance Testing

#### Test Case: P001 - Large File Processing
```yaml
Name: Large PDF Statement Processing
Input:
  - File: Large_HDFC_Statement_100_pages.pdf (8MB)
  - Transactions: 500+ transactions
Expected Output:
  - Processing time: <3 minutes
  - Memory usage: <512MB
  - No timeout errors
```

#### Test Case: P002 - Concurrent Load Testing
```yaml
Name: Multiple Simultaneous Processing
Input:
  - 10 files uploaded within 1 minute
  - Different users and accounts
Expected Output:
  - All files processed successfully
  - No significant delay increase
  - Queue management working properly
```

#### Test Case: P003 - Peak Load Simulation
```yaml
Name: High Volume Processing
Input:
  - 50 files uploaded in 5 minutes
  - Mix of PDF and CSV files
Expected Output:
  - Processing queue managed efficiently
  - No system crashes or timeouts
  - Response times remain acceptable
```

### 3. Error Handling Testing

#### Test Case: E001 - Corrupted File Handling
```yaml
Name: Corrupted PDF Processing
Input:
  - File: Corrupted_Statement.pdf (truncated file)
Expected Output:
  - Status: failed
  - Error message: "File appears corrupted or unreadable"
  - No system crash
  - Processing job marked as failed
```

#### Test Case: E002 - AI Model Failure Simulation
```yaml
Name: AI Model Failover Testing
Input:
  - Valid PDF file
  - Simulated OpenAI API failure
Expected Output:
  - Automatic failover to Anthropic
  - Processing continues without user intervention
  - Success with secondary model
```

#### Test Case: E003 - Network Failure Recovery
```yaml
Name: Database Connection Failure
Input:
  - Valid file being processed
  - Simulated Supabase connection failure
Expected Output:
  - Retry mechanism activated
  - Processing completes after reconnection
  - Job status properly updated
```

### 4. Security Testing

#### Test Case: S001 - User Data Isolation
```yaml
Name: Cross-User Data Access Prevention
Input:
  - User A uploads HDFC statement
  - User B attempts to access User A's data
Expected Output:
  - User B cannot see User A's processing jobs
  - User B cannot access User A's file URLs
  - RLS policies enforced properly
```

#### Test Case: S002 - Webhook Security Validation
```yaml
Name: Unauthorized Webhook Access
Input:
  - Webhook request without proper secret
  - Webhook request with invalid payload
Expected Output:
  - Request rejected with 401/403 error
  - No processing initiated
  - Security logging activated
```

### 5. Deduplication Testing

#### Test Case: D001 - Exact Duplicate Detection
```yaml
Name: Same Transaction Already Exists
Input:
  - Statement with transaction: "₹5,000 ATM WDL 15/12/2024"
  - Identical transaction already in database
Expected Output:
  - Duplicate detected and filtered out
  - No duplicate transaction created
  - Deduplication stats updated
```

#### Test Case: D002 - Similar Transaction Handling
```yaml
Name: Near-Duplicate Transaction Processing  
Input:
  - Existing: "₹5,000.00 ATM WITHDRAWAL 15/12/2024"
  - New: "₹5,000 ATM WDL 15/12/2024"
Expected Output:
  - High similarity score calculated
  - Transaction marked as potential duplicate
  - User review required for confirmation
```

#### Test Case: D003 - False Positive Prevention
```yaml
Name: Different Amount Same Description
Input:
  - Existing: "₹1,000 GROCERY STORE 15/12/2024"
  - New: "₹2,000 GROCERY STORE 15/12/2024"
Expected Output:
  - Transactions treated as separate
  - No false duplicate detection
  - Both transactions processed
```

## 🚀 Test Execution Strategy

### Phase 1: Unit Testing (Week 1)
**Duration**: 2 days  
**Scope**: Individual n8n nodes and functions

#### Node-Level Testing
1. **Webhook Trigger Node**
   - Valid/invalid payload handling
   - Authentication verification
   - Rate limiting functionality

2. **File Download Node**
   - Supabase Storage authentication
   - File existence validation
   - Download error handling

3. **AI Processing Node**
   - Prompt engineering validation
   - Response parsing accuracy
   - Error handling for API failures

4. **Database Operation Nodes**
   - CRUD operations testing
   - Transaction rollback testing
   - Connection failure handling

### Phase 2: Integration Testing (Week 1-2)  
**Duration**: 3 days
**Scope**: End-to-end workflow testing

#### Workflow Integration Tests
```javascript
// Example test suite structure
describe('VaultWise n8n Workflow Integration', () => {
  
  beforeEach(async () => {
    // Setup test environment
    await setupTestDatabase();
    await createTestUser();
    await uploadTestFiles();
  });

  it('should process HDFC PDF statement successfully', async () => {
    const response = await triggerWorkflow({
      job_id: 'test-job-001',
      file_url: 'test-files/hdfc-statement.pdf',
      user_categories: mockCategories,
      webhook_secret: TEST_SECRET
    });
    
    expect(response.status).toBe('completed');
    expect(response.transactions_extracted).toBeGreaterThan(0);
    expect(response.transactions_new).toBeGreaterThan(0);
  });

  it('should handle AI model failover correctly', async () => {
    // Mock OpenAI failure
    mockOpenAIFailure();
    
    const response = await triggerWorkflow(validPayload);
    
    expect(response.status).toBe('completed');
    expect(response.model_used).toBe('anthropic/claude-3-5-sonnet');
  });

  afterEach(async () => {
    await cleanupTestData();
  });
});
```

### Phase 3: Performance Testing (Week 2)
**Duration**: 2 days
**Scope**: Load and stress testing

#### Performance Test Scripts
```bash
#!/bin/bash
# Load test script for n8n workflow

echo "Starting VaultWise n8n Load Testing..."

# Test with 10 concurrent requests
for i in {1..10}; do
  {
    echo "Starting test $i at $(date)"
    
    # Upload file and trigger processing
    curl -X POST "${N8N_WEBHOOK_URL}" \
      -H "Content-Type: application/json" \
      -d @test-payload-$i.json \
      --max-time 300 \
      -w "Test $i: %{time_total}s\n"
    
  } &
done

# Wait for all background jobs to complete
wait

echo "Load testing completed at $(date)"
```

### Phase 4: User Acceptance Testing (Week 2)
**Duration**: 3 days  
**Scope**: Real-world scenario testing

#### UAT Test Scenarios
1. **New User Onboarding**
   - User signs up for premium trial
   - Uploads first bank statement
   - Reviews and approves transactions
   - Sees updated account balance

2. **Power User Workflow**
   - User uploads multiple statements
   - Processes different bank formats
   - Manages transaction categories
   - Exports processed data

3. **Error Recovery Scenarios**
   - User uploads corrupted file
   - User uploads unsupported format
   - User experiences network issues
   - User retries failed processing

## 📊 Test Metrics & Success Criteria

### Accuracy Metrics
```yaml
Transaction Extraction Accuracy:
  Target: >90% correct extraction
  Measurement: Manual verification vs AI output
  
Date Format Accuracy:
  Target: 100% correct date conversion
  Critical: No date parsing errors
  
Amount Accuracy:
  Target: 100% correct amount extraction
  Critical: No decimal/currency errors
  
Category Mapping:
  Target: >80% correct initial mapping
  Acceptable: User can easily correct mappings
```

### Performance Metrics
```yaml
Processing Time:
  Target: <2 minutes for standard statement (5 pages, 50 transactions)
  Acceptable: <5 minutes for large statements (20+ pages)
  
Throughput:
  Target: 10 concurrent files processed without degradation
  Peak: 50 files in queue without system failure
  
Resource Usage:
  Memory: <512MB per processing job
  CPU: <80% utilization during peak load
  
Uptime:
  Target: >99.5% webhook availability
  Recovery: <30 seconds downtime for failover
```

### Quality Metrics
```yaml
Deduplication Accuracy:
  False Positives: <5% (legitimate transactions marked as duplicates)
  False Negatives: <1% (actual duplicates not detected)
  
Error Rate:
  Target: <1% processing failures for valid files
  Recovery: 100% of transient errors recovered via retry
  
User Satisfaction:
  Target: 90% of processed transactions require no manual correction
  Support: <5% of processing jobs require support intervention
```

## 🔧 Test Environment Setup

### Development Environment
```yaml
Infrastructure:
  - n8n: Local development instance
  - Supabase: Development project
  - Test Data: Anonymized bank statements
  
Configuration:
  - Webhook URL: http://localhost:5678/webhook/vaultwise-test
  - Database: supabase-dev-project
  - Storage: test-statements bucket
  
Limitations:
  - 10 MB file size limit
  - 10 requests per minute rate limit
  - Basic AI models (GPT-3.5-turbo)
```

### Staging Environment
```yaml
Infrastructure:
  - n8n: Cloud staging instance
  - Supabase: Staging project (production-like)
  - Test Data: Full bank statement test suite
  
Configuration:
  - Production-like resource limits
  - Full AI model access (GPT-4, Claude)
  - Real webhook security
  
Purpose:
  - Final validation before production
  - Performance benchmarking
  - Security penetration testing
```

### Production Testing
```yaml
Strategy:
  - Gradual rollout with feature flags
  - A/B testing for critical features
  - Real-time monitoring and alerting
  
Monitoring:
  - Processing time tracking
  - Error rate monitoring  
  - User satisfaction surveys
  - Performance metrics dashboard
```

## 📋 Test Data Management

### Data Collection Guidelines
```markdown
## Bank Statement Collection

### Privacy & Security
- Remove/redact all sensitive information
- Use test accounts with dummy transactions
- Ensure compliance with data protection laws
- Store test data in secure, encrypted location

### Data Variety Requirements
- Multiple account types (savings, credit, current)
- Different transaction volumes (10, 50, 200+ transactions)
- Various date ranges (1 month, 6 months, 1 year)
- Edge cases (foreign currency, failed transactions)
- Different bank templates and layouts

### File Organization
test-data/
├── hdfc/
│   ├── pdf/
│   │   ├── savings-account-standard.pdf
│   │   ├── credit-card-premium.pdf
│   │   └── large-transaction-volume.pdf
│   └── csv/
│       ├── mobile-banking-export.csv
│       └── internet-banking-export.csv
├── sbi/
├── icici/
└── edge-cases/
    ├── corrupted-files/
    ├── multilingual/
    └── special-characters/
```

### Test Data Validation
```javascript
// Automated test data validation script
const validateTestData = async (filePath) => {
  const validation = {
    fileSize: getFileSize(filePath),
    format: getFileFormat(filePath),
    readability: await checkFileReadability(filePath),
    transactionCount: await estimateTransactionCount(filePath),
    dateRange: await extractDateRange(filePath),
    sensitiveData: await checkForSensitiveData(filePath)
  };
  
  // Validation rules
  const isValid = (
    validation.fileSize > 1024 && // Min 1KB
    validation.fileSize < 10485760 && // Max 10MB
    validation.readability === true &&
    validation.transactionCount > 0 &&
    validation.sensitiveData.found === false
  );
  
  return { isValid, details: validation };
};
```

## 📈 Continuous Testing Strategy

### Automated Testing Pipeline
```yaml
Trigger Events:
  - n8n workflow code changes
  - Database schema updates
  - New test data addition
  - Scheduled daily runs
  
Test Execution:
  1. Unit tests for individual nodes
  2. Integration tests for complete workflow
  3. Performance benchmarking
  4. Security vulnerability scanning
  
Reporting:
  - Test result dashboard
  - Performance trend analysis
  - Error pattern identification
  - Success rate monitoring
```

### Production Monitoring
```yaml
Real-time Metrics:
  - Processing job success rate
  - Average processing time
  - AI model usage and accuracy
  - User satisfaction scores
  
Alert Triggers:
  - Success rate drops below 95%
  - Processing time exceeds 5 minutes
  - Error rate increases above 2%
  - Queue backlog exceeds 50 jobs
  
Response Actions:
  - Automatic failover to backup AI model
  - Scale up processing resources
  - Notify development team
  - Activate incident response protocol
```

---

**Document Version**: 1.0  
**Created**: December 29, 2024  
**Status**: Ready for Implementation  
**Owner**: VaultWise QA & Development Team  
**Review Schedule**: Weekly during active testing phases
