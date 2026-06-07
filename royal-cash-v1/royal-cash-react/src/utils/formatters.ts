// ==========================================
// Royal Cash - Formatters
// ==========================================
// Logic copied AS-IS from original HTML file
// ==========================================

/**
 * Sanitizes a phone number by removing dashes, spaces, and international codes
 * Copied AS-IS from original sanitizePhoneNumber() function
 *
 * @param phoneNumber - The phone number to sanitize
 * @returns Clean phone number (e.g., "0501234567")
 */
export function sanitizePhoneNumber(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber) return null;

  // Remove all non-digit characters (dashes, spaces, parentheses, etc.)
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Remove international prefix if present (e.g., 972, +972)
  if (cleaned.startsWith('972')) {
    cleaned = '0' + cleaned.substring(3);
  }

  // Ensure it starts with 0 and has 10 digits
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  // Return only if it's a valid 10-digit Israeli phone number
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return cleaned;
  }

  return cleaned; // Return as-is if doesn't match expected format
}

/**
 * Format currency with sign
 */
export function formatCurrency(amount: number, showSign: boolean = true): string {
  const sign = showSign && amount > 0 ? '+' : '';
  return `${sign}${Math.round(amount)}₪`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string, locale: string = 'he-IL'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for display
 */
export function formatTime(dateString: string, locale: string = 'he-IL'): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(dateString: string, locale: string = 'he-IL'): string {
  return `${formatDate(dateString, locale)} ${formatTime(dateString, locale)}`;
}
