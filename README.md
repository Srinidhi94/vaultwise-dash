# VaultWise Dashboard

**Status**: ✅ Fully Operational - Production Ready

A modern personal finance management dashboard with AI-powered bank statement processing. Built with React, TypeScript, Supabase, and n8n.

---

## 📊 Project Status

### System Status
- ✅ **Database**: PostgreSQL with RLS and proper schema
- ✅ **n8n Workflow**: 28-node AI processing pipeline operational
- ✅ **AI Integration**: GPT-4.1-mini + Claude Sonnet 4 (90-95% accuracy)
- ✅ **Frontend**: Complete UI with responsive design
- ✅ **Features**: Accounts, transactions, categories, AI uploads
- ✅ **Documentation**: Comprehensive and up-to-date

---

## ✨ Features

### Core Features
- **Account Management**: Track savings accounts and credit cards
- **Transaction Management**: Add, edit, delete, and categorize transactions
- **Category System**: 32 default categories (income/expense) with custom categories
- **Visual Analytics**: Charts and insights into spending patterns
- **Secure Authentication**: Supabase Auth with Row Level Security
- **Responsive Design**: Mobile-first design with bottom navigation
- **Data Export**: Export transactions to Excel format

### AI-Powered Features
- **Bank Statement Processing**: Upload PDF/CSV statements for automatic processing
- **Smart Account Detection**: Automatically identifies which account the statement belongs to
- **Intelligent Categorization**: AI matches transactions to appropriate categories
- **Duplicate Prevention**: Fuzzy matching prevents duplicate transaction entries
- **High Accuracy**: 90-95% extraction accuracy with dual LLM validation
- **Secure Processing**: Files deleted immediately after processing (never stored)

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **AI Processing**: n8n + GPT-4.1-mini + Claude Sonnet 4
- **State**: Zustand
- **Forms**: React Hook Form + Yup
- **Charts**: Recharts
- **Routing**: React Router v6

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Supabase Account** (for database and auth)
- **n8n Cloud Account** (optional, for AI processing)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Srinidhi94/vaultwise-dash.git
cd vaultwise-dash

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

**Detailed setup instructions**: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

---

## 📚 Documentation

### Essential Guides
- **[Development Setup](docs/DEVELOPMENT.md)** - Complete setup guide for local development
- **[Contributing](docs/CONTRIBUTING.md)** - Development guidelines and standards
- **[Architecture](docs/ARCHITECTURE.md)** - Technical architecture and design decisions

### Additional Resources
- **[Archived Documentation](docs/archive/)** - Historical planning and implementation docs
- **[Original Prompt](finance-app-lovable-prompt.md)** - Initial project requirements from Lovable.dev

---

## 🔗 Project Links

- **Repository**: https://github.com/Srinidhi94/vaultwise-dash
- **Supabase Project**: huxhlktqxdkafbjtbwyr.supabase.co
- **n8n Workflow**: VaultWise Statement Processor - Optimized (28 nodes)

---

## 📝 License

This project is unlicensed and proprietary.

---

**Built with ❤️ by Srinidhi Rao**
