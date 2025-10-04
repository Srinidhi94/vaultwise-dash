import { startOfMonth, endOfMonth } from "date-fns";

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
 * Calculate current month's credit card expenses for a specific card
 */
export const calculateCardMonthlyUsage = (
  cardId: string,
  transactions: Transaction[],
  month: Date = new Date()
): number => {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  return transactions
    .filter((t) => {
      const transactionDate = new Date(t.transaction_date);
      return (
        t.account_id === cardId &&
        t.account_type === "credit" &&
        t.transaction_type === "expense" &&
        transactionDate >= start &&
        transactionDate <= end
      );
    })
    .reduce((total, t) => total + t.amount, 0);
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
 * Get credit card usage details
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
