import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export interface PhoneNormalizationResult {
  valid: boolean;
  rawInput: string;
  phoneE164?: string;
  formattedInternational?: string;
  waDigits?: string;
  countryCode?: string;
  nationalNumber?: string;
  error?: string;
}

/**
 * Normalizes and validates phone numbers following ITU E.164 specifications
 * and WhatsApp Click to Chat destination format rules (FR-COMMS-001 §6.3).
 */
export function normalizePhoneNumber(
  rawInput: string | undefined | null,
  defaultCountry?: CountryCode
): PhoneNormalizationResult {
  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    return {
      valid: false,
      rawInput: rawInput || '',
      error: 'Phone number cannot be empty',
    };
  }

  const cleaned = rawInput.trim();

  // If no country context provided and no leading '+', do not guess the country
  if (!defaultCountry && !cleaned.startsWith('+')) {
    return {
      valid: false,
      rawInput: cleaned,
      error: `Missing country code. Please provide international number starting with '+' or country code.`,
    };
  }

  // Parse using default country if provided
  let parsed = defaultCountry ? parsePhoneNumberFromString(cleaned, defaultCountry) : undefined;

  // If parsing with default country failed or resulted in invalid number, but user supplied an international plus
  if (!parsed || !parsed.isValid()) {
    if (cleaned.startsWith('+')) {
      parsed = parsePhoneNumberFromString(cleaned);
    }
  }

  if (!parsed || !parsed.isValid()) {
    return {
      valid: false,
      rawInput: cleaned,
      error: `Invalid or ambiguous phone number format: "${cleaned}"`,
    };
  }

  const phoneE164 = parsed.format('E.164');
  // WhatsApp Click to Chat requires international format with country code and digits ONLY (no +, spaces, hyphens)
  const waDigits = phoneE164.replace(/^\+/, '').replace(/\D/g, '');

  return {
    valid: true,
    rawInput: cleaned,
    phoneE164,
    formattedInternational: parsed.formatInternational(),
    waDigits,
    countryCode: parsed.countryCallingCode,
    nationalNumber: parsed.nationalNumber,
  };
}

/**
 * Masks a phone number for privacy in audit logs and public UI (e.g. +91 9876543210 -> +91 ******3210)
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'Unknown';
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  const last4 = clean.slice(-4);
  const prefix = clean.startsWith('+') ? clean.slice(0, 3) + ' ' : '';
  return `${prefix}******${last4}`;
}
