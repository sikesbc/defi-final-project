import { format, parseISO } from 'date-fns';

export const formatCurrency = (amount: number | string): string => {
  // Convert string to number if needed
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '$0.00';
  }
  
  if (numAmount >= 1_000_000_000) {
    return `$${(numAmount / 1_000_000_000).toFixed(2)}B`;
  } else if (numAmount >= 1_000_000) {
    return `$${(numAmount / 1_000_000).toFixed(2)}M`;
  } else if (numAmount >= 1_000) {
    return `$${(numAmount / 1_000).toFixed(2)}K`;
  } else {
    return `$${numAmount.toFixed(2)}`;
  }
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
};

export const formatDateShort = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MM/dd/yy');
  } catch {
    return dateString;
  }
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

