# VaultWise - Product Requirements Document

**Version**: 1.0  
**Last Updated**: January 6, 2025  
**Status**: Active Development

---

## 📋 Executive Summary

VaultWise (SpendWise) is a personal finance management web application that helps users track income, expenses, and account balances across multiple bank accounts and credit cards. It supports automated bank-synced transactions via India's Account Aggregator (AA) framework, reducing manual data entry.

**Core Value Proposition**: "Track your finances effortlessly — connect your bank accounts and let SpendWise do the rest."

---

## 🎯 Problem Statement

### Current State

**Pain Points**:
- ⏰ **Time-consuming**: Manual entry of every transaction takes 5-10 minutes daily
- 😫 **Error-prone**: Typos, missed transactions, incorrect categorization
- 📊 **Fragmented view**: Bank apps don't show holistic financial picture
- 💳 **Multiple accounts**: Tracking 3+ accounts becomes overwhelming
- 📈 **No insights**: Raw transaction lists without meaningful analytics

### Why Now?

- **60%** of millennials use 2+ banking apps daily
- **AI accuracy** for document processing has reached 90-95%
- **Mobile-first** generation expects PWA experiences
- **Freemium SaaS** model proven successful in fintech (Mint, YNAB)

---

## 👥 Target Users

See [Ideal Customer Profile](./ICP.md) for detailed personas.

### Primary Audience

**Tech-Savvy Professionals** (25-40 years old)
- Uses 2-4 bank accounts + credit cards
- Comfortable with digital tools
- Values time over cost
- Seeks financial clarity, not complex analysis

### Secondary Audience

**Freelancers & Small Business Owners** (25-45 years old)
- Multiple income streams
- Need to separate personal/business expenses
- Tax preparation requirements

---

## 🎯 Product Goals & Objectives

### Business Goals

| Goal | Metric | Target |
|------|--------|--------|
| **User Acquisition** | Monthly signups | 100 users by Q2 2025 |
| **Conversion Rate** | Free → Premium | 15% within 30 days |
| **User Retention** | Monthly active users | 70% retention at 3 months |
| **Revenue** | MRR (Monthly Recurring Revenue) | $1,000 by Q3 2025 |

### Product Goals

| Goal | Success Criteria |
|------|------------------|
| **Ease of Use** | User can add first transaction within 2 minutes of signup |
| **AI Accuracy** | 90-95% correct transaction extraction and categorization |
| **Performance** | Dashboard loads in <2 seconds on 4G connection |
| **Reliability** | 99.9% uptime for core features |

---

## ✨ Features & Requirements

### MVP Features (Current - Free Tier)

**Account Management**
```
User Input
    ↓
Create Account → Store in Database → Display in Dashboard
    ↓                                        ↓
Associate Transactions              Update Balance
```

- ✅ Add/edit/delete savings accounts
- ✅ Add/edit/delete credit cards
- ✅ Set opening balances
- ✅ Track current balances (dynamically calculated)
- ✅ Activate/inactivate accounts
- ⚠️ **Limit**: 3 accounts max (free tier)

**Transaction Management**
- ✅ Manual transaction entry (income/expense)
- ✅ Categorization (32 default categories)
- ✅ Date, amount, description, notes
- ✅ Account assignment
- ✅ Edit/delete transactions
- ✅ Bulk operations (multi-select delete)

**Analytics & Insights**
- ✅ Monthly income vs expense
- ✅ Expense breakdown by category (pie chart)
- ✅ Income breakdown by category (pie chart)
- ✅ Credit card utilization
- ✅ Date range filters (This Month, Last 3 Months, Custom)
- ✅ Account-specific views

**Data Management**
- ✅ Export to Excel (date range selection)
- ✅ Custom categories (create/edit/delete)
- ✅ Currency selection (₹, $, €, £, ¥)
- ✅ Number format (Indian Lakhs/Crores or International M/B)

### Bank Sync Features (Account Aggregator)

```
User grants consent → AA Provider → Fetch transactions → Upsert to DB → Update Dashboard
```

- ✅ Connect bank accounts via AA consent
- ✅ Automatic transaction sync
- ✅ Account deduplication on re-link
- ✅ Consent management (grant/revoke)
- ✅ Manual re-sync on demand

**Planned Enhancements**
- 🚧 Advanced analytics (trends, forecasting)
- 🚧 Budget tracking
- 🚧 Recurring transaction detection
- 🚧 Multi-currency support
- 🚧 Bill reminders

---

## 📖 User Stories

### Core Workflows

**US-001: New User Onboarding**
```
As a new user
I want to quickly set up my first account
So that I can start tracking my finances immediately

Acceptance Criteria:
- Can sign up in <2 minutes
- Can add first account without tutorial
- Sees meaningful empty state prompts
- Gets confirmation of successful setup
```

**US-002: Daily Transaction Tracking**
```
As a regular user
I want to add a transaction in <30 seconds
So that I don't lose track of daily expenses

Flow:
1. Click + button (floating action button)
2. Select account from dropdown
3. Enter amount and description
4. Select category from dropdown
5. Tap Save
6. See immediate update in dashboard

Success: Transaction visible in list within 2 seconds
```

**US-003: Connect Bank Account (AA)**
```
As a user
I want to connect my bank account via Account Aggregator
So that my transactions sync automatically

Flow:
1. Go to Accounts → Click "Connect bank account"
2. Grant consent via AA provider redirect
3. Wait for consent approval
4. Transactions are fetched and synced
5. See updated dashboard with all transactions

Success: Transactions synced from bank within minutes
```

**US-004: Monthly Review**
```
As an active user
I want to see where my money went this month
So that I can make better spending decisions

Flow:
1. Open Dashboard
2. View pie charts (Income by Category, Expenses by Category)
3. Click category to see detailed breakdown
4. Filter by date range or specific account
5. Export to Excel for deeper analysis

Success: Can identify top 3 expense categories in <1 minute
```

**US-005: Multi-Account Management**
```
As a user with multiple accounts
I want to see consolidated view of all accounts
So that I understand my total financial position

Acceptance Criteria:
- Total balance across all savings accounts
- Total credit card utilization
- Can filter dashboard by specific account
- Can switch between accounts in transaction entry
```

---

## 🛠️ Technical Requirements

### Technology Stack

**Frontend**
- React 18.3 + TypeScript (type-safe development)
- Vite (fast builds, hot reload)
- Tailwind CSS + shadcn/ui (consistent design system)
- Zustand (lightweight state management)
- React Router v6 (client-side routing)

**Backend**
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Row Level Security (RLS) for data isolation
- Edge Functions (future: serverless API)

**Bank Sync**
- Supabase Edge Functions (Deno runtime)
- Account Aggregator integration via Setu provider
- Consent-based data fetch (RBI-regulated)

### Architecture Requirements

**Performance**
- Dashboard loads in <2s on 4G
- Transaction add/edit responds in <500ms
- PWA works offline (view cached data)

**Security**
- Authentication via Supabase Auth (JWT tokens)
- RLS policies prevent cross-user data access
- AA data access is consent-gated
- All API calls use HTTPS
- Environment variables for secrets

**Scalability**
- Support 100 concurrent users (Phase 1)
- Support 10,000 users by end of year
- Handle 100,000 transactions per user
- Database indexed for fast queries

**Reliability**
- 99.9% uptime SLA
- Automated backups (Supabase handles)
- Error tracking and logging
- Graceful degradation (AA fails → fallback to manual)

---

## 📊 Success Metrics

### Key Performance Indicators (KPIs)

**User Engagement**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily Active Users (DAU) | 30% of MAU | Analytics |
| Avg. session duration | 5-8 minutes | Analytics |
| Transactions per user/month | 20+ | Database query |
| Return visits per week | 3+ | Analytics |

**Bank Sync (AA)**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Consent approval rate | 80%+ | Database query |
| Transaction sync success | 95%+ | Edge Function logs |
| User satisfaction | 4.5/5 stars | In-app survey |

**Business Metrics**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Conversion rate (Free→Premium) | 15% | Database query |
| Churn rate | <5% monthly | User retention report |
| Customer Lifetime Value (CLV) | $120 | Revenue / user cohort |
| Monthly Recurring Revenue (MRR) | $1,000 by Q3 | Stripe dashboard |

**Technical Health**
| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (p95) | <500ms | Monitoring |
| Error rate | <1% | Error tracking |
| Uptime | 99.9% | Uptime monitoring |
| Bundle size | <500KB | Vite build output |

---

## 🚧 Constraints & Assumptions

### Technical Constraints

**Account Aggregator Constraints**
- Requires AA-linked bank account
- Consent must be approved by user
- Data availability depends on FIP (Financial Information Provider)

**Database Constraints**
- PostgreSQL row limit: None (scalable)
- Storage limit: 10GB (Supabase free tier) → Upgrade available
- Realtime connections: 200 concurrent (Supabase Pro tier)

**Browser Support**
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile: iOS 14+, Android 8+
- No IE11 support (EOL)

### Assumptions

**User Behavior**
- ✅ Users check dashboard 2-3x per week minimum
- ✅ Users prefer mobile-first experience
- ✅ Users willing to grant AA consent for automation

**Market Assumptions**
- ✅ Growing demand for personal finance tools
- ✅ Users trust cloud-based financial data storage
- ✅ India’s Account Aggregator ecosystem is maturing
- ⚠️ Competition from Mint, YNAB, Actual Budget

**Technical Assumptions**
- ✅ Supabase remains reliable and affordable
- ✅ AA providers (Setu) maintain sandbox and production APIs
- ⚠️ FIP coverage may vary across banks

---

## 🗺️ Roadmap

### Phase 1: MVP (✅ Complete)

**Timeline**: Sept 2024 - Jan 2025  
**Status**: Production-ready

- ✅ User authentication
- ✅ Manual transaction entry
- ✅ Account management (savings + credit)
- ✅ Basic analytics (charts, filters)
- ✅ Category management
- ✅ Data export (Excel)
- ✅ Responsive design (mobile + desktop)
- ✅ Number formatting (Indian/International)

### Phase 2: Account Aggregator Integration (✅ Complete)

**Timeline**: Jan 2025 - May 2025  
**Status**: Complete

- ✅ AA consent flow (create, poll, approve)
- ✅ Transaction fetch via Edge Function (aa-proxy)
- ✅ Setu provider integration (sandbox)
- ✅ Mock provider for local development
- ✅ Account linking and deduplication

### Phase 3: PWA & Mobile (📅 Planned)

**Timeline**: Mar 2025 - May 2025

- 📅 Service worker (offline support)
- 📅 App manifest (install prompt)
- 📅 Push notifications (transaction reminders)
- 📅 Offline mode (view cached data)
- 📅 App store submission (optional)

### Phase 4: Advanced Features (📅 Future)

**Timeline**: May 2025 - Aug 2025

- 📅 Budget tracking
- 📅 Recurring transactions
- 📅 Bill reminders
- 📅 Multi-currency support
- 📅 Trend analysis & forecasting
- 📅 Shared accounts (family plans)

---

## 🔐 Privacy & Security

### Data Handling

**User Data**
- Stored in Supabase (SOC 2 compliant)
- Encrypted at rest and in transit
- RLS policies enforce data isolation
- No cross-user data access possible

**Bank Data (via AA)**
- Transaction data fetched on-demand via consent
- No permanent raw data retention from AA providers
- Users can revoke consent anytime
- Users can delete all data anytime

**Third-Party Access**
- Setu (AA provider): Consent-gated access to bank transaction data
- No data sold or shared with marketers

### Compliance

- ✅ GDPR compliant (data export, deletion)
- ✅ SOC 2 Type II (Supabase infrastructure)
- ✅ User data ownership (users own their data)
- 📅 PCI DSS (future: if handling payments directly)

---

## 💰 Pricing Model

### Free Tier

**Price**: $0/month  
**Limits**:
- 3 accounts max
- Manual entry only
- Basic analytics
- Community support

**Target**: Onboard users, demonstrate value

### Premium Tier

**Price**: $5/month or $50/year (17% discount)  
**Includes**:
- Unlimited accounts
- Account Aggregator bank sync
- Advanced analytics
- Priority support
- Early access to new features

**Target**: Convert 15%+ of free users

### Trial Period

- 7-day free trial of Premium
- No credit card required
- Full feature access
- Auto-converts to Free after trial

---

## 📈 Go-to-Market Strategy

### Launch Plan

**Phase 1: Beta Launch** (Jan 2025)
- Invite 20-30 beta testers
- Collect feedback on bank sync experience
- Refine UX based on real usage

**Phase 2: Public Launch** (Feb 2025)
- Product Hunt launch
- Social media campaign (Twitter, LinkedIn)
- Content marketing (blog posts, tutorials)
- Freemium model activation

**Phase 3: Growth** (Mar 2025 onwards)
- SEO optimization
- Referral program (give $5 credit, get $5 credit)
- Integration partnerships (banking apps, accounting software)
- Community building (Discord, Reddit)

### Marketing Channels

| Channel | Strategy | Budget |
|---------|----------|--------|
| **Content Marketing** | Blog posts, tutorials, comparison guides | Low |
| **SEO** | Target "personal finance tracker" keywords | Low |
| **Social Media** | Twitter threads, LinkedIn posts | Low |
| **Product Hunt** | Feature launch, collect reviews | Free |
| **Referral Program** | Word-of-mouth growth | Medium |
| **Paid Ads** | Google Ads, Facebook (Phase 3) | High |

---

## 🎓 Glossary

**Common Terms**
- **RLS**: Row Level Security (database access control)
- **PWA**: Progressive Web App (installable web app)
- **Account Aggregator (AA)**: RBI-regulated framework for consent-based bank data sharing
- **Freemium**: Free tier with paid upgrade option
- **MRR**: Monthly Recurring Revenue
- **Churn**: Users who stop using the product

**Technical Terms**
- **Zustand**: Lightweight state management library
- **Supabase**: Backend-as-a-Service (PostgreSQL + Auth + Storage)
- **Edge Functions**: Supabase serverless functions (Deno runtime)
- **shadcn/ui**: Component library built on Radix UI

---

## 📚 Related Documents

- **[Ideal Customer Profile](./ICP.md)** - Target user personas
- **[Architecture](./ARCHITECTURE.md)** - Technical architecture
- **[Development Guide](./DEVELOPMENT.md)** - Setup and development
- **[Contributing Guide](./CONTRIBUTING.md)** - Code standards and workflow

---

## ✅ Approval & Sign-off

**Product Owner**: Srinidhi Rao  
**Approved Date**: January 6, 2025  
**Next Review**: March 1, 2025

---

**Version History**:
- v1.0 (Jan 6, 2025): Initial PRD - MVP complete
- v2.0 (May 2025): Updated to reflect Account Aggregator integration, removed AI/n8n references
