# VaultWise Dashboard - Product Requirements Document (PRD)

> ⚠️ **DOCUMENTATION STATUS**: This PRD describes the vision and planned features.
> 
> **IMPLEMENTATION STATUS** (October 2025):
> - ✅ Core AI processing: OPERATIONAL
> - ✅ Database schema: IMPLEMENTED
> - ✅ n8n workflow: WORKING
> - 🚧 Frontend upload UI: IN PROGRESS
> - 🚧 Freemium model: PLANNED
> - 🚧 PWA features: PLANNED
>
> **See [`CURRENT_STATUS.md`](CURRENT_STATUS.md) for what's actually built.**

---

## 1. Executive Summary

**Product Name**: VaultWise Dashboard  
**Version**: 2.0 (Enhanced PWA with AI Processing)  
**Original Target**: Q1 2025  
**Current Status**: Core backend operational, frontend integration in progress  

### Vision
Transform personal finance management by combining manual transaction tracking with AI-powered bank statement processing in a simple, secure, and maintainable Progressive Web App.

### Key Value Propositions
- **Freemium Model**: Free manual entry + premium AI processing
- **Simplicity**: Clean, intuitive interface with minimal complexity
- **Security**: Bank-grade security with Row Level Security (RLS)
- **Accessibility**: Works on all devices with single codebase
- **Intelligence**: AI-powered transaction extraction and categorization

## 2. Product Overview

### Current State (MVP)
- ✅ React + TypeScript + Supabase architecture
- ✅ User authentication and profiles
- ✅ Manual transaction entry and management
- ✅ Account management (savings/credit cards)
- ✅ Basic visualizations and analytics
- ✅ Mobile-responsive design
- ✅ Secure multi-tenant architecture with RLS

### Enhanced Vision (v2.0)
- 🎯 Progressive Web App (PWA) capabilities
- 🎯 AI-powered bank statement processing
- 🎯 Freemium subscription model
- 🎯 Real-time processing status updates
- 🎯 Enhanced user experience and analytics

## 3. Target Users

### Primary Users
- **Tech-savvy individuals** aged 25-45
- **Income range**: ₹5L - ₹50L annually
- **Behavior**: Use multiple bank accounts and credit cards
- **Pain Points**: Manual transaction tracking is time-consuming
- **Goals**: Automated expense tracking with detailed insights

### User Personas

#### Persona 1: "Busy Professional"
- Age: 28-35, Software Engineer/Manager
- Uses 2-3 bank accounts, 2-4 credit cards
- Values automation and time-saving
- Willing to pay for convenience
- Primary use case: Monthly statement processing

#### Persona 2: "Budget-Conscious User"
- Age: 22-30, Early career professional
- Uses 1-2 accounts, limited credit cards
- Prefers free tools but values good UX
- Primary use case: Manual transaction tracking

## 4. Core Features & Requirements

### 4.1 Free Tier Features
- ✅ Manual transaction entry
- ✅ Account management (up to 3 accounts)
- ✅ Basic categorization
- ✅ Monthly/yearly analytics
- ✅ Data export (CSV)
- ✅ Mobile-responsive web app

### 4.2 Premium Tier Features ($9.99/month)
- 🎯 AI-powered bank statement processing
- 🎯 Unlimited accounts
- 🎯 Advanced analytics and insights
- 🎯 Real-time processing notifications
- 🎯 Priority customer support
- 🎯 Advanced data export options

### 4.3 Technical Requirements

#### Performance
- **Load Time**: < 2 seconds on 3G connection
- **Processing Time**: Bank statements processed within 2-3 minutes
- **Uptime**: 99.9% availability
- **Security**: SOC 2 Type II compliance ready

#### Compatibility
- **Web Browsers**: Chrome 90+, Safari 14+, Firefox 88+, Edge 90+
- **Mobile**: iOS 14+, Android 10+
- **PWA**: Installable on all supported platforms
- **File Formats**: PDF, CSV bank statements

## 5. User Experience & User Interface

### 5.1 Design Principles
- **Simplicity First**: Minimal cognitive load
- **Consistency**: Unified design language
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Fast, responsive interactions
- **Trust**: Clear data handling and security messaging

### 5.2 Key User Flows

#### Flow 1: New User Onboarding
1. Sign up with email/password
2. Verify email address
3. Complete profile setup (currency preference)
4. Add first account (savings/credit card)
5. Choose between manual entry or premium trial
6. Add first transaction (manual or upload)

#### Flow 2: Premium Statement Processing
1. Navigate to "Upload Statement" (premium only)
2. Select account for statement
3. Upload PDF/CSV file
4. Show processing indicator
5. Review extracted transactions
6. Approve/edit transactions
7. Transactions saved to account

#### Flow 3: Manual Transaction Entry
1. Click "Add Transaction" button
2. Select account and transaction type
3. Enter amount, description, category
4. Save transaction
5. View updated balance and analytics

### 5.3 Information Architecture
```
Dashboard (Home)
├── Account Overview
├── Recent Transactions
├── Quick Actions
└── Monthly Summary

Accounts
├── Savings Accounts
├── Credit Cards
└── Add New Account

Transactions
├── All Transactions List
├── Filters & Search
├── Add Manual Transaction
└── Upload Statement (Premium)

Analytics
├── Monthly Overview
├── Category Breakdown
├── Spending Trends
└── Export Data

Settings
├── Profile Management
├── Subscription Status
├── Security Settings
└── Support
```

## 6. Technical Architecture

### 6.1 Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **PWA**: Workbox for service worker
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State Management**: Zustand
- **Processing**: n8n workflow with OpenAI/Claude
- **Payments**: Stripe
- **Deployment**: Vercel/Netlify

### 6.2 Architecture Decision: Enhanced PWA

**Why PWA over React Native:**
- ✅ **Single Codebase**: Maintain one React app for web and mobile
- ✅ **Existing Skills**: Leverage current React expertise
- ✅ **Cost Effective**: No app store fees or approval processes
- ✅ **Instant Updates**: Deploy updates immediately
- ✅ **User Requirements**: Perfect fit (no camera, location, offline needs)
- ✅ **Maintenance**: Significantly simpler than dual codebases

### 6.3 Data Flow Architecture
```
User Upload → Supabase Storage → n8n Webhook → AI Processing → Supabase DB → Realtime → Frontend Update
```

### 6.4 Database Schema Enhancements
```sql
-- Add to existing user_profiles table
ALTER TABLE user_profiles ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE user_profiles ADD COLUMN subscription_expires_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN trial_used BOOLEAN DEFAULT false;

-- New processing jobs table
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  transactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## 7. Integration Strategy

### 7.1 n8n Workflow Modifications
- **Replace Google Sheets** with Supabase HTTP nodes
- **Add Webhook Trigger** to receive file processing requests
- **Enhance Error Handling** with status updates
- **User Context Integration** for personalized categorization

### 7.2 Real-time Updates
- **Supabase Realtime** for processing status updates
- **Database Change Listeners** for automatic UI updates
- **Simple Loading States** instead of complex notifications

### 7.3 File Processing Flow
1. User uploads file to Supabase Storage
2. Frontend triggers n8n webhook with file URL + context
3. n8n downloads file and processes with AI
4. Extracted transactions written to Supabase
5. Frontend receives real-time updates via Supabase Realtime
6. User reviews and approves transactions

## 8. Monetization Strategy

### 8.1 Freemium Model
- **Free Tier**: Core functionality to build user base
- **Premium Tier**: AI processing for power users
- **Trial Period**: 7-day premium trial for new users
- **Upgrade Prompts**: Contextual, non-intrusive

### 8.2 Pricing Strategy
- **Free**: ₹0/month - Manual entry, 3 accounts, basic analytics
- **Premium**: ₹799/month - AI processing, unlimited accounts, advanced features
- **Annual Discount**: 20% off (₹7,990/year)

### 8.3 Revenue Projections (Conservative)
- **Year 1**: 1,000 users (10% premium) = ₹95,880/month
- **Year 2**: 5,000 users (15% premium) = ₹5,99,250/month
- **Year 3**: 15,000 users (20% premium) = ₹23,97,000/month

## 9. Success Metrics

### 9.1 User Engagement
- **Daily Active Users (DAU)**: Target 40% of registered users
- **Monthly Active Users (MAU)**: Target 70% of registered users
- **Session Duration**: Target 5+ minutes average
- **Feature Adoption**: 80% use manual entry, 25% try premium

### 9.2 Business Metrics
- **Conversion Rate**: 15% free to premium conversion
- **Churn Rate**: <5% monthly churn for premium users
- **Customer Lifetime Value (CLV)**: ₹15,000+ for premium users
- **Net Promoter Score (NPS)**: Target 50+

### 9.3 Technical Metrics
- **App Performance**: <2s load time, >95% uptime
- **Processing Accuracy**: >90% correct transaction extraction
- **Error Rate**: <1% failed statement processing
- **User Satisfaction**: 4.5+ star rating

## 10. Risk Assessment & Mitigation

### 10.1 Technical Risks
- **AI Processing Accuracy**: Mitigation - Human review step, continuous model improvement
- **Scalability**: Mitigation - Supabase auto-scaling, n8n cloud infrastructure
- **Data Security**: Mitigation - SOC 2 compliance, regular security audits

### 10.2 Business Risks
- **Competition**: Mitigation - Focus on simplicity and user experience
- **Market Adoption**: Mitigation - Strong free tier, word-of-mouth growth
- **Regulatory Changes**: Mitigation - Privacy-first design, compliance monitoring

### 10.3 User Experience Risks
- **Complexity Creep**: Mitigation - Regular UX reviews, user feedback loops
- **Performance Issues**: Mitigation - Continuous monitoring, optimization sprints
- **Support Burden**: Mitigation - Comprehensive documentation, self-service options

## 11. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Convert existing app to PWA
- Implement freemium model infrastructure
- Add file upload capability (premium only)
- Basic Stripe integration

### Phase 2: AI Integration (Weeks 3-4)
- Modify n8n workflow for Supabase integration
- Implement real-time processing status
- Add transaction review/approval flow
- Enhanced error handling

### Phase 3: User Experience (Weeks 5-6)
- Advanced analytics for premium users
- Push notification infrastructure
- Performance optimizations
- Comprehensive testing

### Phase 4: Launch Preparation (Weeks 7-8)
- Security audit and compliance
- Documentation and support materials
- Marketing website and onboarding
- Beta user testing and feedback

## 12. Success Criteria

### Launch Readiness
- [ ] All core features functional and tested
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Payment processing integrated
- [ ] Support documentation complete

### Post-Launch (3 months)
- [ ] 500+ registered users
- [ ] 10%+ premium conversion rate
- [ ] <2% critical bug reports
- [ ] 4.0+ user satisfaction rating
- [ ] Break-even on infrastructure costs

### Long-term (12 months)
- [ ] 5,000+ registered users
- [ ] 15%+ premium conversion rate
- [ ] Profitable with positive cash flow
- [ ] Feature parity with major competitors
- [ ] Strong user community and feedback loop

---

**Document Version**: 1.0  
**Last Updated**: December 29, 2024  
**Next Review**: January 15, 2025  
**Owner**: Product Team  
**Stakeholders**: Engineering, Design, Business