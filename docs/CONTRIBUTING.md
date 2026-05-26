# Contributing to VaultWise

**Version**: 2.0  
**Last Updated**: January 6, 2025

Thank you for considering contributing to VaultWise! This guide will help you understand our development workflow, coding standards, and best practices.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Component Patterns](#component-patterns)
- [State Management](#state-management)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

---

## 🤝 Code of Conduct

### Our Standards

- **Be respectful** - Treat all contributors with respect
- **Be collaborative** - Help others learn and grow
- **Be constructive** - Provide helpful feedback
- **Be professional** - Keep discussions on-topic

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)
- Supabase account (for database access)

### Initial Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/vaultwise-dash.git
cd vaultwise-dash

# 3. Add upstream remote
git remote add upstream https://github.com/Srinidhi94/vaultwise-dash.git

# 4. Install dependencies
npm install

# 5. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 6. Start development server
npm run dev
```

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense"
  ]
}
```

---

## 🔄 Development Workflow

### Branch Strategy

```
main (production-ready code)
  ↓
feature/your-feature-name (your work)
  ↓
Pull Request → Code Review → Merge
```

**Branch Naming**:
- `feature/add-budget-tracking` - New features
- `fix/balance-calculation-bug` - Bug fixes
- `refactor/optimize-queries` - Code refactoring
- `docs/update-architecture` - Documentation

### Development Cycle

```
1. Create branch from main
    ↓
2. Make changes + commit frequently
    ↓
3. Write/update tests (if applicable)
    ↓
4. Test locally
    ↓
5. Push to your fork
    ↓
6. Create Pull Request
    ↓
7. Address review feedback
    ↓
8. Merge when approved
```

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge into your main
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

---

## 💻 Coding Standards

### TypeScript Guidelines

**DO** ✅

```typescript
// Use explicit types
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Use type inference when obvious
const total = calculateTotal(items); // Type inferred as number

// Use readonly for immutable data
interface Config {
  readonly apiKey: string;
}

// Use enum for constants
enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}
```

**DON'T** ❌

```typescript
// Don't use 'any' type
function process(data: any) { } // ❌ BAD

// Don't use non-null assertion without checks
const user = users.find(u => u.id === id)!; // ❌ BAD

// Don't ignore TypeScript errors
// @ts-ignore // ❌ BAD
const result = dangerousOperation();
```

### File Organization

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives (DON'T MODIFY)
│   ├── dashboard/       # Dashboard-specific components
│   ├── transactions/    # Transaction components
│   ├── accounts/        # Account components
│   └── settings/        # Settings components
├── pages/               # Route pages
├── stores/              # Zustand stores
├── utils/               # Utility functions
├── hooks/               # Custom React hooks
└── integrations/        # Third-party integrations
```

### Naming Conventions

**Files**:
```
ComponentName.tsx        # React components (PascalCase)
utilityFunction.ts       # Utilities (camelCase)
useCustomHook.ts         # Hooks (camelCase with 'use' prefix)
CONSTANT_VALUES.ts       # Constants (UPPER_SNAKE_CASE)
```

**Variables & Functions**:
```typescript
// Variables: camelCase
const userName = 'John';
const totalAmount = 1000;

// Functions: camelCase, verb-first
function calculateTotal(items: Item[]): number { }
function handleSubmit(event: FormEvent): void { }

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const API_TIMEOUT = 30000;

// Components: PascalCase
function TransactionList() { }
function AddAccountDialog() { }

// Interfaces/Types: PascalCase
interface Transaction { }
type AccountType = 'savings' | 'credit';
```

---

## 🧩 Component Patterns

### Functional Components

**Standard Pattern**:

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTransactionsStore } from '@/stores/useTransactionsStore';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionCard({ 
  transaction, 
  onEdit, 
  onDelete 
}: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="p-4 border rounded-lg">
      {/* Component JSX */}
    </div>
  );
}
```

### Dialog Components

**Pattern**: Use shadcn/ui Dialog + controlled state

```typescript
interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTransactionDialog({ 
  open, 
  onOpenChange 
}: AddTransactionDialogProps) {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await saveTransaction(formData);
      toast.success('Transaction added!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Form content */}
      </DialogContent>
    </Dialog>
  );
}
```

### Form Components

**Pattern**: Use React Hook Form + Yup validation

```typescript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  amount: yup.number().positive().required(),
  description: yup.string().required().max(100),
  date: yup.date().required()
});

type FormData = yup.InferType<typeof schema>;

export function TransactionForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema)
  });

  const onSubmit = (data: FormData) => {
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('amount')} />
      {errors.amount && <span>{errors.amount.message}</span>}
    </form>
  );
}
```

---

## 🗄️ State Management

### Zustand Store Pattern

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface Item {
  id: string;
  name: string;
  createdAt: Date;
}

interface ItemsState {
  // State
  items: Item[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<Item, 'id'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  // Computed
  getItemById: (id: string) => Item | undefined;
}

export const useItemsStore = create<ItemsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      items: [],
      loading: false,
      error: null,

      // Fetch all items
      fetchItems: async () => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          set({ items: data || [], loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
          toast.error('Failed to fetch items');
        }
      },

      // Add new item
      addItem: async (item) => {
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('items')
            .insert([item])
            .select()
            .single();

          if (error) throw error;

          set((state) => ({
            items: [data, ...state.items],
            loading: false
          }));
          
          toast.success('Item added!');
        } catch (error) {
          set({ loading: false });
          toast.error('Failed to add item');
          throw error;
        }
      },

      // Update item
      updateItem: async (id, updates) => {
        try {
          const { error } = await supabase
            .from('items')
            .update(updates)
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            )
          }));

          toast.success('Item updated!');
        } catch (error) {
          toast.error('Failed to update item');
          throw error;
        }
      },

      // Delete item
      deleteItem: async (id) => {
        try {
          const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            items: state.items.filter((item) => item.id !== id)
          }));

          toast.success('Item deleted!');
        } catch (error) {
          toast.error('Failed to delete item');
          throw error;
        }
      },

      // Get item by ID
      getItemById: (id) => {
        return get().items.find((item) => item.id === id);
      }
    }),
    { name: 'items-store' }
  )
);
```

### Key Patterns

1. **Always use `set` for state updates** - Never mutate state directly
2. **Use `get` to access current state** - For computed values
3. **Handle errors gracefully** - Try-catch + toast notifications
4. **Add loading states** - For better UX
5. **Use devtools** - For debugging
6. **Type everything** - Interfaces for state and actions

---

## 🧪 Testing Guidelines

### Unit Tests (Future)

```typescript
// Example test structure
describe('calculateBalance', () => {
  it('should calculate savings balance correctly', () => {
    const transactions = [
      { type: 'income', amount: 1000 },
      { type: 'expense', amount: 300 }
    ];
    const balance = calculateSavingsBalance(500, transactions);
    expect(balance).toBe(1200); // 500 + 1000 - 300
  });
});
```

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Feature works on Chrome, Firefox, Safari
- [ ] Mobile responsive (test on real device or DevTools)
- [ ] Loading states show correctly
- [ ] Error states handled gracefully
- [ ] Toast notifications appear
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings

---

## 📝 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, tooling changes

**Examples**:

```bash
# Good commits ✅
feat(transactions): add bulk delete functionality
fix(balance): correct credit card balance calculation
refactor(dashboard): optimize chart rendering
docs(readme): update installation instructions
perf(transactions): add virtualization for long lists

# Bad commits ❌
"fixed stuff"  # Not descriptive
"WIP"  # Work in progress shouldn't be pushed
"asdfasdf"  # Meaningless
```

### Commit Frequency

- **DO**: Commit frequently with logical chunks
- **DON'T**: One massive commit with all changes
- **DO**: Commit working code (passes lint/type check)
- **DON'T**: Commit broken code

---

## 🔍 Pull Request Process

### Before Creating PR

1. ✅ All tests pass (manual testing checklist)
2. ✅ No TypeScript errors (`npm run build`)
3. ✅ No ESLint warnings (`npm run lint`)
4. ✅ Code formatted (Prettier)
5. ✅ Branch updated with latest main
6. ✅ Meaningful commit messages

### PR Title Format

```
[Type] Brief description

Examples:
[Feature] Add budget tracking functionality
[Fix] Resolve balance calculation issue in credit cards
[Refactor] Optimize transaction list rendering
[Docs] Update contributing guidelines
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- List of specific changes
- Another change
- One more change

## Testing Done
- [ ] Tested on Chrome
- [ ] Tested on mobile
- [ ] No console errors
- [ ] TypeScript passes
- [ ] ESLint passes

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Fixes #123
Closes #456
```

### Review Process

1. **Submit PR** - Create PR on GitHub
2. **Auto-checks** - Wait for CI/CD (if configured)
3. **Code Review** - Maintainer reviews code
4. **Address Feedback** - Make requested changes
5. **Approval** - PR gets approved
6. **Merge** - Maintainer merges to main

### Review Criteria

Reviewers will check:
- ✅ Code follows style guidelines
- ✅ No unnecessary complexity
- ✅ Proper error handling
- ✅ TypeScript types are correct
- ✅ No performance issues
- ✅ Documentation updated (if needed)

---

## 🎨 UI/UX Guidelines

### shadcn/ui Components

**DO** ✅
- Use existing shadcn/ui components
- Follow Tailwind utility classes
- Maintain consistent spacing
- Use semantic color names

**DON'T** ❌
- Modify shadcn/ui component files directly
- Use inline styles
- Use arbitrary color values
- Break responsive design

### Responsive Design

```tsx
// Mobile-first approach
<div className="p-2 sm:p-4 lg:p-6">
  <h1 className="text-lg sm:text-xl lg:text-2xl">
    Responsive Heading
  </h1>
</div>

// Show/hide on breakpoints
<div className="block sm:hidden">Mobile only</div>
<div className="hidden sm:block">Desktop only</div>
```

### Accessibility

```tsx
// Always add labels
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />

// Use semantic HTML
<nav>...</nav>
<main>...</main>
<footer>...</footer>

// Add ARIA labels
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>
```

---

## 🚫 Common Mistakes to Avoid

### 1. Modifying shadcn/ui Components

```typescript
// ❌ DON'T modify files in src/components/ui/
// These are generated components

// ✅ DO create wrapper components
export function CustomButton(props: ButtonProps) {
  return <Button className="custom-styles" {...props} />;
}
```

### 2. Ignoring Loading States

```typescript
// ❌ BAD
function TransactionList() {
  const { transactions } = useTransactionsStore();
  return <div>{transactions.map(...)}</div>;
}

// ✅ GOOD
function TransactionList() {
  const { transactions, loading } = useTransactionsStore();
  
  if (loading) return <Skeleton />;
  if (transactions.length === 0) return <EmptyState />;
  
  return <div>{transactions.map(...)}</div>;
}
```

### 3. Not Handling Errors

```typescript
// ❌ BAD
async function saveData() {
  await supabase.from('table').insert(data);
}

// ✅ GOOD
async function saveData() {
  try {
    const { error } = await supabase.from('table').insert(data);
    if (error) throw error;
    toast.success('Data saved!');
  } catch (error) {
    toast.error('Failed to save data');
    console.error('Save error:', error);
  }
}
```

### 4. Prop Drilling

```typescript
// ❌ BAD - Passing props through multiple levels
<Parent data={data}>
  <Child data={data}>
    <GrandChild data={data} />
  </Child>
</Parent>

// ✅ GOOD - Use Zustand store
function GrandChild() {
  const { data } = useDataStore();
  return <div>{data}</div>;
}
```

---

## 📚 Resources

### Documentation
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [Supabase](https://supabase.com/docs)

### Internal Docs
- [Architecture](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [Product Requirements](./PRD.md)

---

## ❓ Getting Help

### Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas
- **Code Review**: Tag maintainers in PR

### Questions to Ask

Before asking:
1. Did you read the documentation?
2. Did you search existing issues?
3. Can you provide a minimal reproduction?

---

## 🙏 Thank You!

Thank you for contributing to VaultWise! Every contribution, no matter how small, helps make the project better.

---

**Version**: 2.0  
**Last Updated**: January 6, 2025  
**Maintainer**: Srinidhi Rao
