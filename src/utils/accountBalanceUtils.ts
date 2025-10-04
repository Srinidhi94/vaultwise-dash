import { Transaction } from '@/stores/useTransactionsStore';

/**
 * Calculate the current balance for a savings account
 * Formula: opening_balance + sum(income) - sum(expense)
 */
export const calculateSavingsBalance = (
  accountId: string,
  openingBalance: number,
  transactions: Transaction[]
): number => {
  const accountTransactions = transactions.filter(
    (t) => t.account_id === accountId && t.account_type === 'savings'
  );

  const income = accountTransactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = accountTransactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return openingBalance + income - expense;
};

/**
 * Calculate the current balance for a credit card
 * Formula: sum(expense) - sum(income)
 * (Credit card balance represents amount owed - always positive)
 */
export const calculateCreditCardBalance = (
  cardId: string,
  transactions: Transaction[]
): number => {
  const cardTransactions = transactions.filter(
    (t) => t.account_id === cardId && t.account_type === 'credit'
  );

  const expense = cardTransactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const income = cardTransactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // Return absolute value to ensure positive balance (amount owed)
  return Math.abs(expense - income);
};
