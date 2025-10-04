import { startOfMonth, endOfMonth, differenceInMonths } from "date-fns";

interface Transaction {
  transaction_date: string;
  amount: number;
  transaction_type: "income" | "expense";
  account_type: "savings" | "credit";
  account_id: string;
}

interface CreditCard {
  id: string;
  credit_limit: number;
}

/**
 * Calculate credit card expenses for a specific card within a date range
 */
export const calculateCardUsage = (
  cardId: string,
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): number => {
  return transactions
    .filter((t) => {
      const transactionDate = new Date(t.transaction_date);
      return (
        t.account_id === cardId &&
        t.account_type === "credit" &&
        t.transaction_type === "expense" &&
        transactionDate >= startDate &&
        transactionDate <= endDate
      );
    })
    .reduce((total, t) => total + t.amount, 0);
};

/**
 * Calculate current month's credit card expenses for a specific card
 */
export const calculateCardMonthlyUsage = (
  cardId: string,
  transactions: Transaction[],
  month: Date = new Date()
): number => {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  return calculateCardUsage(cardId, transactions, start, end);
};

/**
 * Calculate credit utilization percentage for a specific card
 */
export const calculateCardUtilization = (
  cardId: string,
  creditLimit: number,
  transactions: Transaction[],
  month: Date = new Date()
): number => {
  if (creditLimit <= 0) return 0;
  const usage = calculateCardMonthlyUsage(cardId, transactions, month);
  return (usage / creditLimit) * 100;
};

/**
 * Calculate credit utilization for a date range (multi-month support)
 * Formula: (total_expenses / (credit_limit * months)) * 100
 */
export const calculateCardUtilizationForRange = (
  cardId: string,
  creditLimit: number,
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): number => {
  if (creditLimit <= 0) return 0;
  
  const usage = calculateCardUsage(cardId, transactions, startDate, endDate);
  const monthCount = Math.max(1, differenceInMonths(endDate, startDate) + 1);
  const effectiveLimit = creditLimit * monthCount;
  
  return (usage / effectiveLimit) * 100;
};

/**
 * Calculate total credit utilization across all cards
 */
export const calculateTotalCreditUtilization = (
  creditCards: CreditCard[],
  transactions: Transaction[],
  month: Date = new Date()
): number => {
  const totalLimit = creditCards.reduce((sum, card) => sum + card.credit_limit, 0);
  
  if (totalLimit <= 0) return 0;

  const totalUsage = creditCards.reduce((sum, card) => {
    return sum + calculateCardMonthlyUsage(card.id, transactions, month);
  }, 0);

  return (totalUsage / totalLimit) * 100;
};

/**
 * Calculate total credit utilization for a date range (multi-month support)
 */
export const calculateTotalCreditUtilizationForRange = (
  creditCards: CreditCard[],
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): number => {
  const totalLimit = creditCards.reduce((sum, card) => sum + card.credit_limit, 0);
  
  if (totalLimit <= 0) return 0;

  const monthCount = Math.max(1, differenceInMonths(endDate, startDate) + 1);
  const effectiveLimit = totalLimit * monthCount;

  const totalUsage = creditCards.reduce((sum, card) => {
    return sum + calculateCardUsage(card.id, transactions, startDate, endDate);
  }, 0);

  return (totalUsage / effectiveLimit) * 100;
};

/**
 * Get credit card usage details for current month
 */
export const getCreditCardDetails = (
  cardId: string,
  creditLimit: number,
  transactions: Transaction[],
  month: Date = new Date()
) => {
  const used = calculateCardMonthlyUsage(cardId, transactions, month);
  const available = Math.max(0, creditLimit - used);
  const utilization = calculateCardUtilization(cardId, creditLimit, transactions, month);

  return {
    limit: creditLimit,
    used,
    available,
    utilization,
  };
};

/**
 * Get credit card usage details for a date range (multi-month support)
 */
export const getCreditCardDetailsForRange = (
  cardId: string,
  creditLimit: number,
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
) => {
  const used = calculateCardUsage(cardId, transactions, startDate, endDate);
  const monthCount = Math.max(1, differenceInMonths(endDate, startDate) + 1);
  const effectiveLimit = creditLimit * monthCount;
  const available = Math.max(0, effectiveLimit - used);
  const utilization = (used / effectiveLimit) * 100;

  return {
    limit: effectiveLimit,
    used,
    available,
    utilization,
    monthCount,
  };
};
