# Contributing to VaultWise

Thank you for your interest in contributing to VaultWise! This guide will help you get started with development.

---

## 📋 Table of Contents

- [Code Standards](#code-standards)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)

---

## 🎯 Code Standards

### TypeScript

- **Strict mode**: All code must pass TypeScript strict checks
- **No any types**: Avoid `any`, use proper typing
- **Type imports**: Use `import type` for type-only imports
- **Interfaces over types**: Prefer interfaces for object shapes

### React/Frontend

- **Functional components**: Use function components with hooks
- **Component structure**:
  ```tsx
  // 1. Imports
  // 2. Types/Interfaces
  // 3. Component function
  // 4. Export
  ```
- **Hooks order**: useState → useEffect → custom hooks
- **Props destructuring**: Destructure props in function signature

### State Management (Zustand)

- **Store pattern**: Follow existing store structure
- **Devtools**: Always enable devtools in development
- **Async actions**: Use async/await, proper error handling
- **Store organization**:
  ```ts
  interface Store {
    // State
    data: Data | null;
    loading: boolean;
    error: string | null;
    
    // Actions
    fetchData: () => Promise<void>;
    reset: () => void;
  }
  ```

### Styling

- **Tailwind CSS**: Use Tailwind utility classes
- **shadcn/ui**: Use existing components from `components/ui/`
- **DO NOT MODIFY**: Never edit shadcn/ui component files
- **Responsive**: Mobile-first approach (sm, md, lg, xl breakpoints)
- **Colors**: Use design system colors from tailwind.config.ts

---

## 📁 Project Structure

```
vaultwise-dash/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (DO NOT MODIFY)
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── layout/          # Layout components
│   │   ├── accounts/        # Account management components
│   │   ├── transactions/    # Transaction components
│   │   └── settings/        # Settings components
│   ├── pages/               # Page components (Dashboard, Accounts, etc.)
│   ├── stores/              # Zustand state stores
│   ├── integrations/        # Supabase client & types
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   └── lib/                 # Library configurations
├── docs/                    # Documentation
├── supabase/
│   └── migrations/          # Database migrations
└── public/                  # Static assets
```

### Component Organization

- **Feature-based**: Group by feature (accounts, transactions, etc.)
- **Atomic design**: Build from small reusable components
- **Single responsibility**: Each component does one thing well

---

## 🔧 Development Workflow

### 1. Setup Development Environment

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
# Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# Start development server
npm run dev
```

### 2. Making Changes

1. **Create a feature branch**: `git checkout -b feature/your-feature-name`
2. **Make changes**: Follow code standards
3. **Test locally**: Verify changes work
4. **Commit changes**: Follow commit guidelines
5. **Push and create PR**: Push to your branch

### 3. Before Committing

```bash
# Run linter
npm run lint

# Build to check for errors
npm run build

# Run type checking
npm run type-check  # if available
```

---

## 🧪 Testing Guidelines

### Manual Testing Checklist

- [ ] Test on mobile viewport (< 768px)
- [ ] Test on tablet viewport (768px - 1024px)
- [ ] Test on desktop viewport (> 1024px)
- [ ] Test with real data
- [ ] Test error states
- [ ] Test loading states
- [ ] Test authentication flows

### Component Testing

- **User flows**: Test complete user journeys
- **Edge cases**: Empty states, long content, errors
- **Responsive**: Test all breakpoints
- **Accessibility**: Keyboard navigation, screen readers

---

## 📝 Commit Guidelines

### Commit Message Format

```
<type>: <subject>

<body (optional)>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
feat: add transaction export to Excel

fix: correct balance calculation for credit cards

docs: update README with n8n integration guide

refactor: simplify account store logic
```

---

## 🔐 Security Guidelines

### Critical Rules

1. **Never store sensitive data**: Bank statements, passwords, API keys
2. **Use environment variables**: Never hardcode credentials
3. **RLS policies**: All database queries respect Row Level Security
4. **Input validation**: Validate and sanitize all user inputs
5. **File uploads**: Validate file types and sizes

### Supabase Best Practices

- **RLS enabled**: All tables must have RLS enabled
- **Auth checks**: Verify user authentication in all queries
- **Signed URLs**: Use signed URLs for temporary file access
- **User isolation**: Users can only access their own data

---

## 🎨 UI/UX Guidelines

### Design Principles

1. **Mobile-first**: Design for mobile, enhance for desktop
2. **Clarity**: Clear labels, obvious actions
3. **Feedback**: Always show loading/success/error states
4. **Consistency**: Follow existing patterns
5. **Accessibility**: WCAG 2.1 AA compliance

### Color Usage (Financial App Psychology)

- **Blue** (#3B82F6): Trust, security, primary actions
- **Green** (#10B981): Success, positive amounts (income)
- **Red** (#EF4444): Errors, negative amounts (expenses)
- **Purple** (#8B5CF6): Premium features
- **Amber** (#F59E0B): Warnings
- **Gray**: Neutral, secondary information

### Touch Targets

- **Minimum size**: 44x44px for mobile
- **Spacing**: 8px minimum between interactive elements
- **Text size**: Minimum 16px on mobile (prevents zoom)

---

## 🐛 Debugging Tips

### Common Issues

**Build Errors**:
- Check TypeScript errors: `npm run build`
- Clear node_modules: `rm -rf node_modules && npm install`

**Supabase Issues**:
- Verify environment variables in `.env.local`
- Check RLS policies in Supabase dashboard
- Verify table/column names match types

**State Issues**:
- Use Zustand devtools in browser
- Check async action error handling
- Verify store initialization

---

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

---

## 💬 Getting Help

- Check existing issues on GitHub
- Review archived documentation in `docs/archive/`
- Ask questions in project discussions

---

Thank you for contributing to VaultWise! 🎉
