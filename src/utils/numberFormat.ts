import { NumberFormat } from '@/stores/usePreferencesStore';

/**
 * Format a number based on the user's preferred number format
 * @param amount - The number to format
 * @param format - 'indian' for Lakhs/Crores or 'international' for Millions/Billions
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export const formatAmount = (
  amount: number,
  format: NumberFormat = 'indian',
  decimals: number = 2
): string => {
  if (format === 'indian') {
    // Indian numbering system: Thousands, Lakhs, Crores
    if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(decimals)}Cr`;
    }
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(decimals)}L`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(decimals)}K`;
    }
  } else {
    // International numbering system: Thousands, Millions, Billions
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(decimals)}B`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(decimals)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(decimals)}K`;
    }
  }
  
  return amount.toFixed(0);
};

/**
 * Get example amounts for preview in settings
 */
export const getFormatExamples = (format: NumberFormat) => {
  const examples = [
    { amount: 1234.56, label: 'Small' },
    { amount: 123456, label: 'Medium' },
    { amount: 12345678, label: 'Large' },
  ];

  return examples.map(({ amount, label }) => ({
    label,
    amount,
    formatted: formatAmount(amount, format, 2),
  }));
};

/**
 * Format a full number with proper comma placement based on format
 * Used for displaying full amounts (not abbreviated) like account balances
 * @param amount - The number to format
 * @param format - 'indian' for Indian comma placement or 'international' for standard
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with commas
 */
export const formatFullAmount = (
  amount: number,
  format: NumberFormat = 'indian',
  decimals: number = 2
): string => {
  const fixedAmount = amount.toFixed(decimals);
  const [integerPart, decimalPart] = fixedAmount.split('.');
  
  let formattedInteger: string;
  
  if (format === 'indian') {
    // Indian numbering: Last 3 digits, then groups of 2
    // e.g., 12,34,567.89
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    
    if (remaining.length > 0) {
      const groups: string[] = [];
      for (let i = remaining.length; i > 0; i -= 2) {
        groups.unshift(remaining.slice(Math.max(0, i - 2), i));
      }
      formattedInteger = groups.join(',') + ',' + lastThree;
    } else {
      formattedInteger = lastThree;
    }
  } else {
    // International numbering: Groups of 3
    // e.g., 1,234,567.89
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};
