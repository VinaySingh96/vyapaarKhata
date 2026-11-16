import { describe, it, expect } from 'vitest';
import {
  generateLicensePair,
  validateLicenseNumber,
  validateLicenseKey,
  validateLicensePair,
  computeLicenseKeyChecksum,
  resolveStoreTypeCode,
  resolvePlanTierCode,
} from '../src/licensing/license-manager.js';

describe('LicenseManager - Enterprise Sequence, Fixed Length & Year Check', () => {
  it('should generate a fixed-length 17-character license number', () => {
    const pair = generateLicensePair({ sequence: 1, year: 2026, storeType: 'building_materials' });
    expect(pair.licenseNumber).toHaveLength(17);
    expect(pair.licenseNumber).toBe('LIC-BM-2026-00001');
  });

  it('should generate a fixed-length 24-character license key with checksum', () => {
    const pair = generateLicensePair({ sequence: 1, year: 2026, storeType: 'building_materials', planTier: 'standard' });
    expect(pair.licenseKey).toHaveLength(24);
    // Format: VK26-BM02-0001-XXXX-CCCC
    expect(pair.licenseKey.startsWith('VK26-BM02-0001-')).toBe(true);
    expect(pair.licenseKey.split('-')).toHaveLength(5);
  });

  it('should format sequential numbers with proper zero-padding', () => {
    const p1 = generateLicensePair({ sequence: 5, year: 2026, storeType: 'jewellery' });
    const p2 = generateLicensePair({ sequence: 42, year: 2026, storeType: 'rental' });
    const p3 = generateLicensePair({ sequence: 1024, year: 2026, storeType: 'general' });

    expect(p1.licenseNumber).toBe('LIC-JW-2026-00005');
    expect(p1.licenseKey.includes('-JW02-0005-')).toBe(true);

    expect(p2.licenseNumber).toBe('LIC-RN-2026-00042');
    expect(p2.licenseKey.includes('-RN02-0042-')).toBe(true);

    expect(p3.licenseNumber).toBe('LIC-GN-2026-01024');
    expect(p3.licenseKey.includes('-GN02-1024-')).toBe(true);
  });

  it('should correctly map plan tiers into key codes', () => {
    expect(resolvePlanTierCode('starter')).toBe('01');
    expect(resolvePlanTierCode('standard')).toBe('02');
    expect(resolvePlanTierCode('enterprise')).toBe('03');

    const starterPair = generateLicensePair({ sequence: 1, year: 2026, planTier: 'starter' });
    const entPair = generateLicensePair({ sequence: 1, year: 2026, planTier: 'enterprise' });

    expect(starterPair.licenseKey.includes('-BM01-')).toBe(true);
    expect(entPair.licenseKey.includes('-BM03-')).toBe(true);
  });

  it('should validate matching license pairs successfully', () => {
    const pair = generateLicensePair({ sequence: 12, year: 2026, storeType: 'jewellery', planTier: 'enterprise' });
    const result = validateLicensePair(pair.licenseNumber, pair.licenseKey, 2026);

    expect(result.valid).toBe(true);
    expect(result.data?.year).toBe(2026);
    expect(result.data?.sequence).toBe(12);
    expect(result.data?.typeCode).toBe('JW');
    expect(result.data?.tierCode).toBe('03');
  });

  it('should fail validation when checksum is tampered', () => {
    const pair = generateLicensePair({ sequence: 1, year: 2026 });
    const lastChar = pair.licenseKey.slice(-1);
    const alteredChar = lastChar === 'A' ? 'B' : 'A';
    const tamperedKey = pair.licenseKey.slice(0, -1) + alteredChar;

    const res = validateLicenseKey(tamperedKey, { currentYear: 2026 });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('CHECKSUM_FAILED');
  });

  it('should fail year check when license is expired', () => {
    const oldPair = generateLicensePair({ sequence: 1, year: 2024 });
    const res = validateLicensePair(oldPair.licenseNumber, oldPair.licenseKey, 2026);

    expect(res.valid).toBe(false);
    expect(res.error).toBe('LICENSE_EXPIRED');
    expect(res.message).toContain('expired');
  });

  it('should fail when year mismatch exists between license number and key', () => {
    const pair2025 = generateLicensePair({ sequence: 1, year: 2025 });
    const pair2026 = generateLicensePair({ sequence: 1, year: 2026 });

    const res = validateLicensePair(pair2025.licenseNumber, pair2026.licenseKey, 2026);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('YEAR_MISMATCH');
  });

  it('should fail when store type mismatch exists', () => {
    const bmPair = generateLicensePair({ sequence: 1, year: 2026, storeType: 'building_materials' });
    const jwPair = generateLicensePair({ sequence: 1, year: 2026, storeType: 'jewellery' });

    const res = validateLicensePair(bmPair.licenseNumber, jwPair.licenseKey, 2026);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('TYPE_MISMATCH');
  });

  it('should accept legacy preset credentials for backward compatibility', () => {
    const legacyNumber = 'LIC-BM-2026-1001';
    const legacySecret = 'sk_patel_bm_live_98374';

    const numRes = validateLicenseNumber(legacyNumber, { allowLegacy: true });
    expect(numRes.valid).toBe(true);
    expect(numRes.data?.isLegacy).toBe(true);

    const keyRes = validateLicenseKey(legacySecret, { allowLegacy: true });
    expect(keyRes.valid).toBe(true);
    expect(keyRes.data?.isLegacy).toBe(true);

    const pairRes = validateLicensePair(legacyNumber, legacySecret, { allowLegacy: true });
    expect(pairRes.valid).toBe(true);
  });
});
