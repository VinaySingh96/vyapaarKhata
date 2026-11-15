/**
 * Indian Number & Currency Formatting Utility
 * Formats numbers in the Indian Lakh / Crore numbering system (en-IN).
 *
 * Pattern:
 * - Up to 999: no grouping (e.g., 500)
 * - 1,000 to 99,999: Thousands (e.g., 10,000)
 * - 1,00,000 to 99,99,999: Lakhs (e.g., 4,28,579 or 50,00,000)
 * - 1,00,00,000+: Crores (e.g., 1,25,00,000)
 */

export interface FormatIndianNumberOptions {
  decimals?: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Formats a number or string into the Indian numbering format (e.g. 428579 -> "4,28,579")
 */
export function formatIndianNumber(
  value: number | string | null | undefined,
  options?: FormatIndianNumberOptions
): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '0';

  const minDecimals =
    options?.decimals !== undefined
      ? options.decimals
      : options?.minimumFractionDigits !== undefined
      ? options.minimumFractionDigits
      : 0;

  const maxDecimals =
    options?.decimals !== undefined
      ? options.decimals
      : options?.maximumFractionDigits !== undefined
      ? options.maximumFractionDigits
      : 2;

  return num.toLocaleString('en-IN', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Formats an amount with the Indian Rupee symbol prefix: "₹ 4,28,579" or "₹ 4,28,579.00"
 */
export function formatIndianCurrency(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  return `₹ ${formatIndianNumber(value, { decimals })}`;
}

/**
 * Formats an amount with ₹ prefix and optional decimals (defaults to 0 decimals for whole numbers, up to 2 for cents)
 */
export function formatCurrencyAuto(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined) return '₹ 0';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '₹ 0';
  const hasDecimals = num % 1 !== 0;
  return `₹ ${formatIndianNumber(num, { decimals: hasDecimals ? 2 : 0 })}`;
}

/**
 * Converts a numeric amount to Indian English Words (Rupees and Paise)
 * e.g., 428579.50 -> "Four Lakh Twenty-Eight Thousand Five Hundred Seventy-Nine Rupees and Fifty Paise Only"
 */
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(n: number): string {
    let s = '';
    if (n >= 100) {
      s += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      s += b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10].trim() : '') + ' ';
    } else if (n > 0) {
      s += a[n];
    }
    return s.trim();
  }

  function convertIndianPart(n: number): string {
    if (n === 0) return '';
    let res = '';
    const cr = Math.floor(n / 10000000);
    const remCr = n % 10000000;
    if (cr > 0) {
      res += convertIndianPart(cr) + ' Crore ';
    }
    const lk = Math.floor(remCr / 100000);
    const remLk = remCr % 100000;
    if (lk > 0) {
      res += convertBelowThousand(lk) + ' Lakh ';
    }
    const th = Math.floor(remLk / 1000);
    const remTh = remLk % 1000;
    if (th > 0) {
      res += convertBelowThousand(th) + ' Thousand ';
    }
    if (remTh > 0) {
      res += convertBelowThousand(remTh) + ' ';
    }
    return res.trim();
  }

  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const whole = Math.floor(rounded);
  const paise = Math.round((rounded - whole) * 100);

  let result = whole > 0 ? convertIndianPart(whole) + ' Rupees' : '';

  if (paise > 0) {
    const paiseText = convertBelowThousand(paise) + ' Paise';
    result = result ? `${result} and ${paiseText}` : `${paiseText}`;
  }

  return (result.trim() || 'Zero Rupees') + ' Only';
}
