import { describe, it, expect } from 'vitest';
import {
  formatIndianNumber,
  formatIndianCurrency,
  formatCurrencyAuto,
  numberToIndianWords,
} from './currency.js';

describe('Indian Currency & Number Formatting', () => {
  describe('formatIndianNumber', () => {
    it('handles zero and null/undefined values safely', () => {
      expect(formatIndianNumber(0)).toBe('0');
      expect(formatIndianNumber(null)).toBe('0');
      expect(formatIndianNumber(undefined)).toBe('0');
      expect(formatIndianNumber('')).toBe('0');
      expect(formatIndianNumber('invalid')).toBe('0');
    });

    it('formats numbers below 1,000 without commas', () => {
      expect(formatIndianNumber(0)).toBe('0');
      expect(formatIndianNumber(5)).toBe('5');
      expect(formatIndianNumber(999)).toBe('999');
    });

    it('formats thousands properly (1,000 to 99,999)', () => {
      expect(formatIndianNumber(1000)).toBe('1,000');
      expect(formatIndianNumber(12500)).toBe('12,500');
      expect(formatIndianNumber(99999)).toBe('99,999');
    });

    it('formats Indian Lakhs properly (1,00,000 to 99,99,999)', () => {
      // Key test: 1 Lakh has comma after 1, then two digits, then three digits
      expect(formatIndianNumber(100000)).toBe('1,00,000');
      // User's exact sales amount from prompt: 428579
      expect(formatIndianNumber(428579)).toBe('4,28,579');
      // Central admin today sales amount: 533261.6
      expect(formatIndianNumber(533261.6, { decimals: 2 })).toBe('5,33,261.60');
      expect(formatIndianNumber(1000000)).toBe('10,00,000'); // 10 Lakhs
      expect(formatIndianNumber(5000000)).toBe('50,00,000'); // 50 Lakhs
      expect(formatIndianNumber(9999999)).toBe('99,99,999');
    });

    it('formats Indian Crores properly (1,00,00,000+)', () => {
      // 1 Crore: 1,00,00,000
      expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
      // 10 Crores: 10,00,00,000
      expect(formatIndianNumber(100000000)).toBe('10,00,00,000');
      // 12.5 Crores
      expect(formatIndianNumber(125000000)).toBe('12,50,00,000');
      // 100 Crores
      expect(formatIndianNumber(1000000000)).toBe('1,00,00,00,000');
    });

    it('handles decimal precision options correctly', () => {
      expect(formatIndianNumber(428579, { decimals: 2 })).toBe('4,28,579.00');
      expect(formatIndianNumber(428579.75, { decimals: 2 })).toBe('4,28,579.75');
      expect(formatIndianNumber(1000000.5, { decimals: 2 })).toBe('10,00,000.50');
    });
  });

  describe('formatIndianCurrency', () => {
    it('prefixes ₹ symbol and sets 2 decimals by default', () => {
      expect(formatIndianCurrency(428579)).toBe('₹ 4,28,579.00');
      expect(formatIndianCurrency(1000000)).toBe('₹ 10,00,000.00');
      expect(formatIndianCurrency(10000000)).toBe('₹ 1,00,00,000.00');
    });
  });

  describe('formatCurrencyAuto', () => {
    it('formats without decimals if integer, with 2 decimals if fraction', () => {
      expect(formatCurrencyAuto(5000)).toBe('₹ 5,000');
      expect(formatCurrencyAuto(428579)).toBe('₹ 4,28,579');
      expect(formatCurrencyAuto(428579.5)).toBe('₹ 4,28,579.50');
    });
  });

  describe('numberToIndianWords', () => {
    it('converts zero properly', () => {
      expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
    });

    it('converts thousands properly', () => {
      expect(numberToIndianWords(5000)).toBe('Five Thousand Rupees Only');
      expect(numberToIndianWords(12500)).toBe('Twelve Thousand Five Hundred Rupees Only');
    });

    it('converts Lakhs properly', () => {
      expect(numberToIndianWords(100000)).toBe('One Lakh Rupees Only');
      expect(numberToIndianWords(1000000)).toBe('Ten Lakh Rupees Only');
      expect(numberToIndianWords(428579)).toBe(
        'Four Lakh Twenty-Eight Thousand Five Hundred Seventy-Nine Rupees Only'
      );
    });

    it('converts Crores properly', () => {
      expect(numberToIndianWords(10000000)).toBe('One Crore Rupees Only');
      expect(numberToIndianWords(250000000)).toBe('Twenty-Five Crore Rupees Only');
    });

    it('converts Paise decimals properly', () => {
      expect(numberToIndianWords(428579.5)).toBe(
        'Four Lakh Twenty-Eight Thousand Five Hundred Seventy-Nine Rupees and Fifty Paise Only'
      );
      expect(numberToIndianWords(0.75)).toBe('Seventy-Five Paise Only');
    });
  });
});
