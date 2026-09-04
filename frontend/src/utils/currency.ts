/**
 * Shared currency formatting utilities for INR (Indian Rupees)
 * Ensures consistent monetary display across the entire application
 */

/**
 * Format a numeric value as Indian Rupees (₹)
 * 
 * @param amount - The numeric amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "₹1,23,456.78")
 */
export function formatINR(amount: number, decimals: number = 2): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format a numeric value as compact Indian Rupees (e.g., ₹1.2k, ₹5L, ₹1Cr)
 * Useful for dashboards and charts where space is limited
 * 
 * @param amount - The numeric amount to format
 * @returns Compact formatted currency string
 */
export function formatINRCompact(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }

  const absAmount = Math.abs(amount);
  const isNegative = amount < 0 ? '-' : '';

  if (absAmount >= 1_00_00_000) {
    // Crores (Cr)
    return `${isNegative}₹${(absAmount / 1_00_00_000).toFixed(1)}Cr`;
  } else if (absAmount >= 1_00_000) {
    // Lakhs (L)
    return `${isNegative}₹${(absAmount / 1_00_000).toFixed(1)}L`;
  } else if (absAmount >= 1_000) {
    // Thousands (k)
    return `${isNegative}₹${(absAmount / 1_000).toFixed(1)}k`;
  } else {
    // Standard format for smaller amounts
    return formatINR(amount, 2);
  }
}

/**
 * Format a numeric value as Indian Rupees without currency symbol (just the number with commas)
 * Useful for table cells or when symbol is shown separately
 * 
 * @param amount - The numeric amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string (e.g., "1,23,456.78")
 */
export function formatINRNumber(amount: number, decimals: number = 2): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
