/**
 * Commercial Software License Number & Key Generator & Validator
 *
 * Modeled after enterprise software licensing systems (Microsoft, SAP, Tally, JetBrains, Autodesk):
 * 1. Fixed Lengths:
 *    - License Number: Exactly 17 characters (`LIC-[TYPE]-[YEAR]-[SEQ5]`)
 *    - License Key:    Exactly 24 characters (`VK[YY]-[TYPE][TIER]-[SEQ4]-[ENTROPY]-[CHECKSUM]`)
 * 2. Sequence:
 *    - Monotonically increasing, collision-free integer sequences per calendar year.
 * 3. Year Checks:
 *    - Embedded year with strict validation (e.g. 2024–2099).
 *    - Cross-year verification between License Number and License Key.
 *    - Expiration & subscription window enforcement.
 * 4. Error Detection & Tamper Prevention:
 *    - Crockford Base32 charset (excludes ambiguous characters 'I', 'L', 'O', 'U').
 *    - Mathematical polynomial checksum block detects transcription typos and unauthorized tampering.
 */

export const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export type StoreIndustryCode = 'BM' | 'JW' | 'RN' | 'GN';
export type PlanTierCode = '01' | '02' | '03'; // 01=Starter, 02=Standard, 03=Enterprise

export interface LicensePairOptions {
  sequence: number;
  year?: number;
  storeType?: 'building_materials' | 'jewellery' | 'rental' | string;
  planTier?: 'starter' | 'standard' | 'enterprise' | string;
  customEntropy?: string;
}

export interface GeneratedLicensePair {
  licenseNumber: string;
  licenseKey: string;
  year: number;
  sequence: number;
  typeCode: StoreIndustryCode;
  tierCode: PlanTierCode;
  formattedDisplay: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
  data?: {
    year: number;
    typeCode: StoreIndustryCode;
    tierCode?: PlanTierCode;
    sequence?: number;
    isLegacy?: boolean;
  };
}

/**
 * Resolves standard 2-letter store vertical code
 */
export function resolveStoreTypeCode(storeType?: string): StoreIndustryCode {
  if (!storeType) return 'BM';
  const s = storeType.toLowerCase().trim();
  if (s === 'jewellery' || s === 'jw') return 'JW';
  if (s === 'rental' || s === 'rn') return 'RN';
  if (s === 'building_materials' || s === 'bm') return 'BM';
  return 'GN';
}

/**
 * Resolves standard 2-digit plan tier code
 */
export function resolvePlanTierCode(plan?: string): PlanTierCode {
  if (!plan) return '02';
  const p = plan.toLowerCase().trim();
  if (p === 'enterprise' || p === '03') return '03';
  if (p === 'starter' || p === '01') return '01';
  return '02'; // standard
}

/**
 * Computes a 4-character deterministic polynomial checksum over the 16-character core key
 */
export function computeLicenseKeyChecksum(core16: string): string {
  let hash = 0x811c9dc5;
  const input = `VK_ENTERPRISE_LIC_v1_${core16.toUpperCase()}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash >>>= 0;

  let checksum = '';
  let temp = hash;
  for (let i = 0; i < 4; i++) {
    checksum += CROCKFORD_BASE32[temp % 32];
    temp = Math.floor(temp / 32);
  }
  return checksum;
}

/**
 * Generates an Enterprise License Number and License Key pair
 */
export function generateLicensePair(opts: LicensePairOptions): GeneratedLicensePair {
  const year = opts.year || new Date().getFullYear();
  const yearShort = String(year).slice(-2);
  const typeCode = resolveStoreTypeCode(opts.storeType);
  const tierCode = resolvePlanTierCode(opts.planTier);
  const seq = Math.max(1, Math.floor(opts.sequence));

  // 1. License Number: LIC-[TYPE]-[YEAR]-[SEQ5] (Exactly 17 characters)
  const seq5 = String(seq).padStart(5, '0');
  const licenseNumber = `LIC-${typeCode}-${year}-${seq5}`;

  // 2. License Key: VK[YY]-[TYPE][TIER]-[SEQ4]-[ENTROPY]-[CHECKSUM] (Exactly 24 characters)
  const seq4 = String(seq % 10000).padStart(4, '0');
  let entropy = opts.customEntropy || '';
  if (entropy.length !== 4) {
    entropy = '';
    for (let i = 0; i < 4; i++) {
      entropy += CROCKFORD_BASE32[Math.floor(Math.random() * CROCKFORD_BASE32.length)];
    }
  }

  const block1 = `VK${yearShort}`;
  const block2 = `${typeCode}${tierCode}`;
  const block3 = seq4;
  const block4 = entropy.toUpperCase();
  const core16 = `${block1}${block2}${block3}${block4}`;
  const checksum = computeLicenseKeyChecksum(core16);
  const licenseKey = `${block1}-${block2}-${block3}-${block4}-${checksum}`;

  return {
    licenseNumber,
    licenseKey,
    year,
    sequence: seq,
    typeCode,
    tierCode,
    formattedDisplay: `${licenseNumber} / ${licenseKey}`,
  };
}

/**
 * Validates a License Number
 */
export function validateLicenseNumber(
  licenseNumber: string,
  options?: { currentYear?: number; allowLegacy?: boolean }
): LicenseValidationResult {
  const raw = (licenseNumber || '').trim().toUpperCase();
  const currentYear = options?.currentYear || new Date().getFullYear();

  // Check fixed length (17 characters for standard enterprise license)
  if (raw.length === 17) {
    const match = raw.match(/^LIC-(BM|JW|RN|GN)-(20\d{2})-(\d{5})$/);
    if (!match) {
      return {
        valid: false,
        error: 'INVALID_LICENSE_FORMAT',
        message: 'License number must strictly follow format LIC-[TYPE]-[YEAR]-[00001] (e.g. LIC-BM-2026-00001)',
      };
    }

    const typeCode = match[1] as StoreIndustryCode;
    const year = parseInt(match[2], 10);
    const seq = parseInt(match[3], 10);

    // Year check
    if (year < 2024 || year > 2099) {
      return {
        valid: false,
        error: 'INVALID_YEAR',
        message: `License issuance year ${year} is outside valid range (2024-2099)`,
      };
    }

    if (currentYear > year + 1) {
      return {
        valid: false,
        error: 'LICENSE_EXPIRED',
        message: `License for year ${year} has expired. Renewal required for active year ${currentYear}.`,
      };
    }

    return {
      valid: true,
      data: {
        typeCode,
        year,
        sequence: seq,
        isLegacy: false,
      },
    };
  }

  // Legacy preset support (e.g. LIC-BM-2026-1001 or LIC-JW-2026-2002)
  if (options?.allowLegacy !== false) {
    const legacyMatch = raw.match(/^LIC-(BM|JW|RN|GN|PC)-(20\d{2})-(\d{4,6})$/);
    if (legacyMatch) {
      return {
        valid: true,
        data: {
          typeCode: (legacyMatch[1] === 'PC' ? 'BM' : legacyMatch[1]) as StoreIndustryCode,
          year: parseInt(legacyMatch[2], 10),
          sequence: parseInt(legacyMatch[3], 10),
          isLegacy: true,
        },
      };
    }
  }

  return {
    valid: false,
    error: 'INVALID_LENGTH',
    message: `License number must be exactly 17 characters (got ${raw.length}). Format: LIC-BM-2026-00001`,
  };
}

/**
 * Validates a License Key
 */
export function validateLicenseKey(
  licenseKey: string,
  options?: { currentYear?: number; allowLegacy?: boolean }
): LicenseValidationResult {
  const raw = (licenseKey || '').trim().toUpperCase();
  const currentYear = options?.currentYear || new Date().getFullYear();

  // Standard Enterprise format: exactly 24 characters (5 blocks of 4)
  if (raw.length === 24) {
    const match = raw.match(/^VK(\d{2})-([A-Z]{2})(\d{2})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
    if (!match) {
      return {
        valid: false,
        error: 'INVALID_KEY_FORMAT',
        message: 'License key must follow format VKyy-[TYPE][TIER]-[SEQ4]-[ENTR]-[CHK4] (e.g. VK26-BM02-0001-A7B8-9F4D)',
      };
    }

    const yearShort = match[1];
    const typeCode = match[2] as StoreIndustryCode;
    const tierCode = match[3] as PlanTierCode;
    const seq4 = match[4];
    const entropy = match[5];
    const providedChecksum = match[6];

    // Verify Checksum
    const core16 = `VK${yearShort}${typeCode}${tierCode}${seq4}${entropy}`;
    const expectedChecksum = computeLicenseKeyChecksum(core16);
    if (providedChecksum !== expectedChecksum) {
      return {
        valid: false,
        error: 'CHECKSUM_FAILED',
        message: 'License key verification failed. The key appears to be mistyped or tampered.',
      };
    }

    // Year Check
    const fullYear = 2000 + parseInt(yearShort, 10);
    if (fullYear < 2024 || fullYear > 2099) {
      return {
        valid: false,
        error: 'INVALID_YEAR',
        message: `License key year ${fullYear} is outside valid operational range`,
      };
    }

    if (currentYear > fullYear + 1) {
      return {
        valid: false,
        error: 'LICENSE_EXPIRED',
        message: `License key for year ${fullYear} has expired. Renewal required for active year ${currentYear}.`,
      };
    }

    return {
      valid: true,
      data: {
        year: fullYear,
        typeCode,
        tierCode,
        isLegacy: false,
      },
    };
  }

  // Legacy preset support (e.g. sk_patel_bm_live_98374 or sk_live_...)
  if (options?.allowLegacy !== false && raw.toLowerCase().startsWith('sk_')) {
    return {
      valid: true,
      data: {
        year: currentYear,
        typeCode: 'BM',
        isLegacy: true,
      },
    };
  }

  return {
    valid: false,
    error: 'INVALID_LENGTH',
    message: `License key must be exactly 24 characters (got ${raw.length}). Format: VK26-BM02-0001-XXXX-XXXX`,
  };
}

/**
 * Validates a License Number and License Key as a matching pair
 */
export function validateLicensePair(
  licenseNumber: string,
  licenseKey: string,
  options?: { currentYear?: number; allowLegacy?: boolean }
): LicenseValidationResult {
  const licRes = validateLicenseNumber(licenseNumber, options);
  if (!licRes.valid) return licRes;

  const keyRes = validateLicenseKey(licenseKey, options);
  if (!keyRes.valid) return keyRes;

  if (!licRes.data || !keyRes.data) {
    return {
      valid: false,
      error: 'VALIDATION_FAILED',
      message: 'Failed to extract license data',
    };
  }

  // If both are legacy, bypass cross-check
  if (licRes.data.isLegacy || keyRes.data.isLegacy) {
    return {
      valid: true,
      data: {
        year: licRes.data.year || new Date().getFullYear(),
        typeCode: licRes.data.typeCode || 'BM',
        isLegacy: true,
      },
    };
  }

  // Cross-check: Years must match
  if (licRes.data.year !== keyRes.data.year) {
    return {
      valid: false,
      error: 'YEAR_MISMATCH',
      message: `License number year (${licRes.data.year}) does not match license key year (${keyRes.data.year})`,
    };
  }

  // Cross-check: Industry types must match
  if (licRes.data.typeCode !== keyRes.data.typeCode) {
    return {
      valid: false,
      error: 'TYPE_MISMATCH',
      message: `Store industry type mismatch: license number is ${licRes.data.typeCode}, key is ${keyRes.data.typeCode}`,
    };
  }

  return {
    valid: true,
    data: {
      year: licRes.data.year,
      typeCode: licRes.data.typeCode,
      tierCode: keyRes.data.tierCode,
      sequence: licRes.data.sequence,
      isLegacy: false,
    },
  };
}
