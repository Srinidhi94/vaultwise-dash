# SpendWise

A mobile-first personal finance dashboard built with React, TypeScript, and Supabase. Track accounts, manage transactions, and sync bank data via India's Account Aggregator framework.

---

## Features

- **Account Management** — Track savings accounts and credit cards with real-time balance calculations
- **Transaction Management** — Add, edit, delete, and categorize income/expense transactions
- **Bank Sync via Account Aggregator** — Connect bank accounts through Setu AA for automatic transaction import
- **Category System** — 32 default categories (income/expense) with support for custom categories
- **Visual Analytics** — Charts and insights for spending patterns, cash flow, and credit utilization
- **Data Export** — Export transactions to Excel
- **Secure Auth** — Supabase Auth with Row Level Security on all tables
- **Mobile-First** — Responsive design with bottom navigation, wrapped for iOS via Capacitor

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| Bank Sync | Supabase Edge Function (`aa-proxy`) + Setu AA |
| State | Zustand |
| Forms | React Hook Form + Yup |
| Charts | Recharts |
| Routing | React Router v6 |
| Mobile | Capacitor (iOS) |

---

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Supabase** project with Auth and Edge Functions enabled

### Quick Start

```bash
git clone https://github.com/Srinidhi94/vaultwise-dash.git
cd vaultwise-dash
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key

npm run dev
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for full setup instructions including Edge Function deployment and AA provider configuration.

---

## Documentation

- **[Development Setup](docs/DEVELOPMENT.md)** — Local dev, environment variables, Edge Functions
- **[Architecture](docs/ARCHITECTURE.md)** — System design, data flow, security model
- **[Contributing](docs/CONTRIBUTING.md)** — Code standards, PR workflow, testing guidelines
- **[PRD](docs/PRD.md)** — Product requirements and roadmap
- **[AA Research](docs/ACCOUNT_AGGREGATOR_RESEARCH.md)** — Account Aggregator integration notes

---

## Project Links

- **Repository**: https://github.com/Srinidhi94/vaultwise-dash
- **Supabase Project**: `huxhlktqxdkafbjtbwyr` (ap-south-1)

---

## License

Proprietary. All rights reserved.

---

**Built with ❤️ by Srinidhi Rao**
