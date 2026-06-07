// ==========================================
// Royal Cash - Bit Payment Integration
// ==========================================
// Logic copied AS-IS from original HTML file
// ==========================================

import { sanitizePhoneNumber } from './formatters';

/**
 * Opens Bit payment app with the recipient's phone number and amount
 * Copied AS-IS from original payWithBit() function
 *
 * @param phoneNumber - Recipient's phone number
 * @param creditorName - Recipient's name (for display)
 * @param amount - Amount to pay in NIS
 * @returns Object with success status and message
 */
export async function payWithBit(
  phoneNumber: string | null | undefined,
  creditorName: string,
  amount: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Sanitize phone number
    const cleanPhone = sanitizePhoneNumber(phoneNumber);

    if (!cleanPhone) {
      return { success: false, message: 'מספר טלפון לא תקין' };
    }

    const roundedAmount = Math.round(amount);

    // Copy payment details to clipboard
    const paymentInfo = `${creditorName}: ${cleanPhone} - ${roundedAmount}₪`;
    try {
      await navigator.clipboard.writeText(paymentInfo);
    } catch (e) {
      console.log('Clipboard not available');
    }

    // Detect if mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Try different Bit deep link formats
    if (isMobile) {
      // On mobile, try app scheme first
      const appLink = `bit://pay?phone=${cleanPhone}&amount=${roundedAmount}`;
      window.location.href = appLink;

      // Fallback to web if app doesn't open
      setTimeout(() => {
        window.open('https://www.bitpay.co.il/app/', '_blank');
      }, 1500);

      return { success: true, message: `פותח Bit... ${creditorName}: ${roundedAmount}₪` };
    } else {
      // On desktop, open web version
      window.open('https://www.bitpay.co.il/app/', '_blank');

      return {
        success: true,
        message: `פרטי התשלום:\n\n👤 ${creditorName}\n📱 ${cleanPhone}\n💰 ${roundedAmount}₪\n\n(הפרטים הועתקו ללוח)`,
      };
    }
  } catch (error) {
    console.error('Error with Bit payment:', error);
    // Ultimate fallback
    window.open('https://www.bitpay.co.il/app/', '_blank');
    return { success: false, message: 'פותח Bit - הזן פרטים ידנית' };
  }
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
