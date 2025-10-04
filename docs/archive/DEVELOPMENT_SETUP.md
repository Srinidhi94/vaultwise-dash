# Development Setup Guide - VaultWise Dashboard

## 🚀 Quick Start

### Prerequisites
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 
- **Git**: Latest version
- **Windsurf IDE**: Latest version
- **Supabase Account**: For backend services

### Initial Setup
```bash
# Clone the repository (if not already cloned)
git clone <repository-url>
cd vaultwise-dash

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

## 📁 Project Structure

```
vaultwise-dash/
├── .cascade-context.md          # Windsurf Cascade context
├── .codeiumignore              # Files to ignore in AI analysis
├── WINDSURF_INSTRUCTIONS.md    # Complete development guidelines
├── docs/
│   ├── project-planning/       # All project documentation
│   │   ├── PRD.md             # Product Requirements Document
│   │   ├── TECHNICAL_ARCHITECTURE.md
│   │   ├── IMPLEMENTATION_PLAN.md
│   │   └── N8N_WORKFLOW_DESIGN.md
│   └── DEVELOPMENT_SETUP.md   # This file
├── src/
│   ├── components/            # React components
│   ├── pages/                # Page components
│   ├── stores/               # Zustand state stores
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   ├── integrations/         # External service integrations
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
├── supabase/                # Supabase configuration
│   ├── config.toml
│   └── migrations/          # Database migrations
└── package.json
```

## 🔧 Environment Configuration

### Required Environment Variables
```bash
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/vaultwise-process

# Development only
VITE_ENVIRONMENT=development
VITE_DEBUG_MODE=true
```

### Supabase Setup
1. Create new Supabase project
2. Run existing migrations in `supabase/migrations/`
3. Set up RLS policies (already defined in migrations)
4. Configure Storage bucket for file uploads
5. Enable Realtime for required tables

## 🛠️ Development Commands

### Core Commands
```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
npm run test:watch
npm run test:coverage
```

### Supabase Commands
```bash
# Initialize Supabase locally (if needed)
npx supabase init

# Start local Supabase (for development)
npx supabase start

# Generate TypeScript types
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

# Reset local database
npx supabase db reset --local

# Push migrations to remote
npx supabase db push
```

## 🧪 Testing Strategy

### Test Types
- **Unit Tests**: Individual functions and utilities
- **Component Tests**: React component behavior
- **Integration Tests**: Store and API interactions
- **E2E Tests**: Complete user workflows

### Testing Tools
- **Vitest**: Test runner and assertions
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Playwright**: E2E testing

### Test Structure
```
src/
├── __tests__/           # Global test utilities
├── components/
│   └── __tests__/       # Component tests
├── stores/
│   └── __tests__/       # Store tests
└── lib/
    └── __tests__/       # Utility tests
```

## 🎨 Code Style Guide

### TypeScript Standards
```typescript
// ✅ Interfaces for props and data structures
interface UserProfile {
  id: string;
  email: string;
  subscriptionTier: 'free' | 'premium';
  createdAt: string;
}

// ✅ Proper component typing
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  loading?: boolean;
}

export const MyComponent: React.FC<ComponentProps> = ({ 
  title, 
  onAction, 
  loading = false 
}) => {
  // Implementation
};
```

### Component Standards
```tsx
// ✅ Use shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ✅ Proper imports organization
import React from 'react';           // React imports first
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';  // Third-party imports
import { useAuthStore } from '@/stores/useAuthStore';  // Local imports
import type { UserProfile } from '@/types/user';       // Type imports last
```

### Store Standards
```typescript
// ✅ Follow existing Zustand patterns
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface StoreState {
  data: DataType[];
  loading: boolean;
  
  // Actions
  fetchData: () => Promise<void>;
  updateItem: (id: string, updates: Partial<DataType>) => void;
}

export const useMyStore = create<StoreState>()(
  devtools(
    (set, get) => ({
      data: [],
      loading: false,
      
      fetchData: async () => {
        set({ loading: true });
        try {
          // Implementation
          set({ data: newData, loading: false });
        } catch (error) {
          console.error('Fetch failed:', error);
          set({ loading: false });
        }
      },
    }),
    { name: 'my-store' }
  )
);
```

## 🔍 Debugging Guide

### Development Tools
- **React DevTools**: Component inspection
- **Zustand DevTools**: State management debugging
- **Supabase Dashboard**: Database and API monitoring
- **Network Tab**: API request inspection
- **Console**: Error tracking and logging

### Common Debug Scenarios
```typescript
// ✅ Error handling with context
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('API call failed:', {
    error: error.message,
    context: { userId, action: 'fetchData' },
    timestamp: new Date().toISOString()
  });
  throw error;
}

// ✅ State debugging
const useMyStore = create<StoreState>()(
  devtools(
    (set, get) => ({
      // State and actions
    }),
    { 
      name: 'my-store',
      // Enable Redux DevTools integration
      serialize: true 
    }
  )
);
```

### Performance Monitoring
```typescript
// ✅ Performance tracking
const trackPageLoad = (pageName: string) => {
  const startTime = performance.now();
  
  return () => {
    const loadTime = performance.now() - startTime;
    console.log(`${pageName} loaded in ${Math.round(loadTime)}ms`);
  };
};

// Usage in components
useEffect(() => {
  const endTracking = trackPageLoad('Dashboard');
  return endTracking;
}, []);
```

## 📱 PWA Development

### PWA Configuration
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'VaultWise Dashboard',
        short_name: 'VaultWise',
        description: 'Personal Finance Management',
        theme_color: '#1E3A8A',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

### Service Worker Testing
```bash
# Build and test PWA locally
npm run build
npm run preview

# Check PWA criteria in Chrome DevTools
# Application > Manifest
# Application > Service Workers
# Lighthouse > PWA audit
```

## 🔐 Security Considerations

### Environment Security
- Never commit `.env*` files
- Use different keys for development/production
- Rotate API keys regularly
- Limit Supabase RLS policies to minimum required access

### Code Security
```typescript
// ✅ Input validation
const validateFileUpload = (file: File): boolean => {
  const allowedTypes = ['application/pdf', 'text/csv'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};

// ✅ Error handling without data exposure
catch (error) {
  console.error('Internal error:', error);
  // Don't expose internal error details to user
  showError('An unexpected error occurred. Please try again.');
}
```

## 🚀 Deployment Guide

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Type checking clean
- [ ] Build succeeds without warnings
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security audit completed

### Production Build
```bash
# Clean build
npm run clean
npm ci
npm run type-check
npm run lint
npm run test
npm run build

# Test production build locally
npm run preview
```

### Deployment Platforms
- **Recommended**: Vercel (optimized for React/Vite)
- **Alternatives**: Netlify, Railway, Render

## 🔄 Workflow Integration

### n8n Workflow Development
1. Set up separate n8n instance for VaultWise
2. Create webhook endpoint for file processing
3. Test webhook integration locally
4. Deploy workflow to production n8n instance
5. Update environment variables with webhook URL

### File Processing Flow
```
Frontend Upload → Supabase Storage → n8n Webhook → AI Processing → Supabase DB → Real-time Updates
```

## 📚 Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

### Development Tools
- [Windsurf IDE](https://windsurf.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Vite Documentation](https://vitejs.dev/)

## 🆘 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

#### Supabase Connection Issues
```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Test connection
npm run test:supabase
```

#### PWA Installation Issues
```bash
# Check manifest validity
npm run build
# Open Chrome DevTools > Application > Manifest
# Look for manifest errors
```

### Getting Help
1. Check existing documentation in `docs/project-planning/`
2. Review `WINDSURF_INSTRUCTIONS.md` for development guidelines
3. Check console for error messages
4. Use Windsurf Cascade for AI-assisted debugging
5. Create detailed issue reports with context

---

**Last Updated**: December 29, 2024  
**Version**: 1.0  
**Maintainer**: Development Team