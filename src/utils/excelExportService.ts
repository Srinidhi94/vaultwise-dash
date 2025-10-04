import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Transaction } from '@/stores/useTransactionsStore';
import { SavingsAccount, CreditCard } from '@/stores/useAccountsStore';

interface Category {
  id: string;
  name: string;
}

interface ExcelExportData {
  transactions: Transaction[];
  categories: Category[];
  savingsAccounts: SavingsAccount[];
  creditCards: CreditCard[];
  currencySymbol: string;
  dateRange: { start: Date | null; end: Date | null };
}

// Template categories for data validation
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Freelance', 'Other'];
const EXPENSE_CATEGORIES = [
  'Transportation', 'Groceries', 'Others', 'Investment', 'Food', 'Medical',
  'Self Transfer', 'Subscriptions', 'Personal', 'Family', 'Home', 'Shopping',
  'Party', 'Pets', 'Electronics', 'Travel', 'Rent', 'Debt'
];
const CREDIT_CATEGORIES = [
  'Transportation', 'Groceries', 'Others', 'Investment', 'Food', 'Medical',
  'Savings', 'Bills', 'Salon', 'Family', 'Tax', 'Shopping', 'Party',
  'Utilities', 'Electronics', 'Business', 'Trip', 'Charity', 'Insurance', 'Rent'
];

export class ExcelExportService {
  private data: ExcelExportData;
  private workbook: XLSX.WorkBook;

  constructor(data: ExcelExportData) {
    this.data = data;
    this.workbook = XLSX.utils.book_new();
  }

  private getAccountName(accountId: string, accountType: string): string {
    if (accountType === 'savings') {
      return this.data.savingsAccounts.find(a => a.id === accountId)?.name || 'Unknown Account';
    } else {
      return this.data.creditCards.find(c => c.id === accountId)?.name || 'Unknown Account';
    }
  }

  private getCategoryName(categoryId: string | null): string {
    if (!categoryId) return 'Other';
    return this.data.categories.find(c => c.id === categoryId)?.name || 'Other';
  }

  private formatAmount(amount: number): string {
    // Format exactly like the app: currencySymbol + amount with 2 decimals
    return `${this.data.currencySymbol}${amount.toFixed(2)}`;
  }

  private filterTransactions(): {
    income: Transaction[];
    expenses: Transaction[];
    creditCard: Transaction[];
  } {
    const { start, end } = this.data.dateRange;
    
    let filtered = this.data.transactions;
    if (start) {
      filtered = filtered.filter(t => new Date(t.transaction_date) >= start);
    }
    if (end) {
      filtered = filtered.filter(t => new Date(t.transaction_date) <= end);
    }

    const income = filtered.filter(t => t.transaction_type === 'income' && t.account_type === 'savings');
    const expenses = filtered.filter(t => t.transaction_type === 'expense' && t.account_type === 'savings');
    const creditCard = filtered.filter(t => t.account_type === 'credit');

    return { income, expenses, creditCard };
  }

  private createIncomeSheet(transactions: Transaction[]): void {
    const headers = ['Date', 'Amount', 'Description', 'Category', 'Account', 'Comments'];
    
    const data = transactions.map(t => [
      format(new Date(t.transaction_date), 'dd/MM/yyyy'),
      this.formatAmount(t.amount),
      t.description,
      this.getCategoryName(t.category_id),
      this.getAccountName(t.account_id, t.account_type),
      t.notes || ''
    ]);

    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { width: 12 }, // Date
      { width: 15 }, // Amount
      { width: 40 }, // Description
      { width: 15 }, // Category
      { width: 20 }, // Account
      { width: 20 }  // Comments
    ];

    // Style headers
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center" }
    };

    // Apply header styling
    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(cell => {
      if (ws[cell]) {
        ws[cell].s = headerStyle;
      }
    });

    // Amount column is already formatted as strings with currency symbol

    XLSX.utils.book_append_sheet(this.workbook, ws, 'Income');
  }

  private createExpenditureSheet(transactions: Transaction[]): void {
    const headers = ['Date', 'Amount', 'Description', 'Category', 'Account', 'Comments'];
    
    const data = transactions.map(t => [
      format(new Date(t.transaction_date), 'dd/MM/yyyy'),
      this.formatAmount(t.amount),
      t.description,
      this.getCategoryName(t.category_id),
      this.getAccountName(t.account_id, t.account_type),
      t.notes || ''
    ]);

    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { width: 12 }, // Date
      { width: 15 }, // Amount
      { width: 40 }, // Description
      { width: 15 }, // Category
      { width: 20 }, // Account
      { width: 20 }  // Comments
    ];

    // Style headers
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "DC2626" } },
      alignment: { horizontal: "center" }
    };

    // Apply header styling
    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(cell => {
      if (ws[cell]) {
        ws[cell].s = headerStyle;
      }
    });

    // Amount column is already formatted as strings with currency symbol

    XLSX.utils.book_append_sheet(this.workbook, ws, 'Expenditure');
  }

  private createCreditCardSheet(transactions: Transaction[]): void {
    const headers = ['Date', 'Amount', 'Description', 'Category', 'Card', 'Comments'];
    
    const data = transactions.map(t => [
      format(new Date(t.transaction_date), 'dd/MM/yyyy'),
      this.formatAmount(t.amount),
      t.description,
      this.getCategoryName(t.category_id),
      this.getAccountName(t.account_id, t.account_type),
      t.notes || ''
    ]);

    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { width: 12 }, // Date
      { width: 15 }, // Amount
      { width: 40 }, // Description
      { width: 15 }, // Category
      { width: 20 }, // Card
      { width: 20 }  // Comments
    ];

    // Style headers
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "7C3AED" } },
      alignment: { horizontal: "center" }
    };

    // Apply header styling
    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(cell => {
      if (ws[cell]) {
        ws[cell].s = headerStyle;
      }
    });

    // Amount column is already formatted as strings with currency symbol

    XLSX.utils.book_append_sheet(this.workbook, ws, 'Credit Card');
  }

  private createOverviewSheet(income: Transaction[], expenses: Transaction[], creditCard: Transaction[]): void {
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalCreditCard = creditCard.reduce((sum, t) => sum + t.amount, 0);
    const netAmount = totalIncome - totalExpenses - totalCreditCard;

    // Create a more visual layout
    const summaryData = [
      ['VaultWise Financial Dashboard', '', '', ''],
      ['', '', '', ''],
      ['💰 INCOME SUMMARY', '', '', ''],
      ['Total Income', this.formatAmount(totalIncome), '', ''],
      ['Income Transactions', income.length, '', ''],
      ['', '', '', ''],
      ['💸 EXPENSE SUMMARY', '', '', ''],
      ['Savings Expenses', this.formatAmount(totalExpenses), '', ''],
      ['Credit Card Expenses', this.formatAmount(totalCreditCard), '', ''],
      ['Total Expenses', this.formatAmount(totalExpenses + totalCreditCard), '', ''],
      ['Expense Transactions', expenses.length + creditCard.length, '', ''],
      ['', '', '', ''],
      ['📊 NET SUMMARY', '', '', ''],
      ['Net Amount', this.formatAmount(netAmount), '', ''],
      ['Savings Rate', totalIncome > 0 ? ((netAmount / totalIncome) * 100).toFixed(1) + '%' : '0%', '', ''],
      ['', '', '', ''],
      ['📈 CATEGORY BREAKDOWN', '', '', ''],
    ];

    // Add category breakdown
    const categoryTotals = new Map<string, number>();
    [...expenses, ...creditCard].forEach(t => {
      const category = this.getCategoryName(t.category_id);
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + t.amount);
    });

    // Sort categories by amount
    const sortedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 categories

    sortedCategories.forEach(([category, amount]) => {
      summaryData.push([category, this.formatAmount(amount), '', '']);
    });

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    ws['!cols'] = [
      { width: 30 }, // Labels
      { width: 20 }, // Values
      { width: 15 }, // Extra space
      { width: 15 }  // Extra space
    ];

    // Style the main header
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "F3F4F6" } },
        alignment: { horizontal: "center" }
      };
    }

    // Style section headers
    const sectionHeaders = ['A3', 'A7', 'A13', 'A17'];
    sectionHeaders.forEach(cell => {
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "059669" } },
          alignment: { horizontal: "left" }
        };
      }
    });

    // Currency values are already formatted as strings with currency symbol

    // Merge header cell
    ws['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: 3, r: 0 } }];

    XLSX.utils.book_append_sheet(this.workbook, ws, 'Overview');
  }

  public generateExcel(): void {
    const { income, expenses, creditCard } = this.filterTransactions();

    // Create sheets in order
    this.createIncomeSheet(income);
    this.createExpenditureSheet(expenses);
    this.createCreditCardSheet(creditCard);
    this.createOverviewSheet(income, expenses, creditCard);

    // Generate filename
    const { start, end } = this.data.dateRange;
    const dateRangeText = start && end 
      ? `${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}`
      : 'all_time';
    
    const filename = `vaultwise_transactions_${dateRangeText}.xlsx`;

    // Write and download
    XLSX.writeFile(this.workbook, filename);
  }
}

export const exportToExcel = (data: ExcelExportData): void => {
  const exporter = new ExcelExportService(data);
  exporter.generateExcel();
};
