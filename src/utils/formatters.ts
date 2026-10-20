/**
 * Centralized formatting utilities for Qatar Automotive Workshop ERP
 */

export interface FormatCurrencyOptions {
  currency?: string;
  isArabic?: boolean;
  decimals?: number;
}

/**
 * Format monetary values consistently in QAR
 * English: "QAR 1,250.00"
 * Arabic: "1,250.00 ر.ق"
 */
export function formatQAR(amount: number | string | null | undefined, options: FormatCurrencyOptions = {}): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const decimals = options.decimals !== undefined ? options.decimals : 2;
  const currency = options.currency || 'QAR';
  const isAr = options.isArabic || false;

  const formattedNum = num.toLocaleString(isAr ? 'ar-QA' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  if (isAr) {
    const symbolAr = currency === 'QAR' ? 'ر.ق' : currency;
    return `${formattedNum} ${symbolAr}`;
  }

  return `${currency} ${formattedNum}`;
}

/**
 * Legacy alias for formatCurrency
 */
export function formatCurrency(amount: number | string | null | undefined, isArabic: boolean = false): string {
  return formatQAR(amount, { isArabic });
}

/**
 * Format dates consistently as day/month/year (DD/MM/YYYY) for the entire app.
 * e.g. "2026-10-03" -> "03/10/2026"
 */
export function formatDate(dateInput: string | number | Date | null | undefined, isArabic: boolean = false): string {
  if (!dateInput) return isArabic ? 'غير محدد' : 'N/A';
  try {
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      // If already DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
      // Match YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
      const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
      if (isoMatch) {
        const [, y, m, d] = isoMatch;
        return `${d}/${m}/${y}`;
      }
    }
    const d = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format Qatar phone numbers nicely
 */
export function formatQatarPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+974') && cleaned.length === 12) {
    return `+974 ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
  }
  if (cleaned.length === 8) {
    return `+974 ${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  return phone;
}
