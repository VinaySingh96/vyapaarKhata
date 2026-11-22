import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  maskPhoneNumber,
  buildInvoiceShareMessage,
  buildWhatsAppClickToChatUrl,
} from '../src/index.js';

describe('WhatsApp Invoice Sharing Domain Unit Suite (FR-COMMS-001 §17)', () => {
  describe('Phone Normalization and Validation (§17 Phone Tests 1-5)', () => {
    it('1. Valid Indian 10-digit number with default country becomes 91 plus 10 digits', () => {
      const res = normalizePhoneNumber('9876543210', 'IN');
      expect(res.valid).toBe(true);
      expect(res.phoneE164).toBe('+919876543210');
      expect(res.waDigits).toBe('919876543210');
      expect(res.countryCode).toBe('91');
    });

    it('2. Valid E.164 number is normalized correctly', () => {
      const res = normalizePhoneNumber('+919876543210');
      expect(res.valid).toBe(true);
      expect(res.phoneE164).toBe('+919876543210');
      expect(res.waDigits).toBe('919876543210');
    });

    it('3. Number containing spaces, brackets, hyphens and a leading domestic 0 is normalized safely', () => {
      const res = normalizePhoneNumber('0 (98765) 43-210', 'IN');
      expect(res.valid).toBe(true);
      expect(res.phoneE164).toBe('+919876543210');
      expect(res.waDigits).toBe('919876543210');
      // No leading domestic 0 in waDigits
      expect(res.waDigits?.startsWith('910')).toBe(false);
      expect(res.waDigits).toBe('919876543210');
    });

    it('4. Invalid or ambiguous number is rejected', () => {
      const res = normalizePhoneNumber('12345', 'IN');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('5. No country is guessed when foreign context is missing and number is ambiguous', () => {
      const res = normalizePhoneNumber('2025550199', undefined); // Missing country context without + prefix
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Missing country code');
    });

    it('masks phone numbers safely for audit and privacy', () => {
      expect(maskPhoneNumber('+919876543210')).toBe('+91 ******3210');
      expect(maskPhoneNumber('9876543210')).toBe('******3210');
    });
  });

  describe('Invoice Message Builder (§17 Invoice Message Tests 1-5)', () => {
    it('1. Fully unpaid invoice displays invoice total and full balance due', () => {
      const msg = buildInvoiceShareMessage({
        customerName: 'Sharma Construction',
        businessName: 'Patel Building Materials',
        invoiceNumber: 'INV/2026-27/0042',
        invoiceDate: '2026-11-22',
        currencySymbol: '₹',
        grandTotal: 25000,
        amountPaid: 0,
        balanceDue: 25000,
        paymentStatus: 'unpaid',
      });

      expect(msg).toContain('Hello Sharma Construction');
      expect(msg).toContain('INV/2026-27/0042');
      expect(msg).toContain('Patel Building Materials');
      expect(msg).toContain('2026-11-22');
      expect(msg).toContain('Invoice total: ₹ 25,000.00');
      expect(msg).toContain('Paid: ₹ 0.00');
      expect(msg).toContain('Balance due: ₹ 25,000.00');
    });

    it('2. Partially paid invoice displays total, amount paid and remaining balance', () => {
      const msg = buildInvoiceShareMessage({
        customerName: 'Gupta Traders',
        businessName: 'Patel Building Materials',
        invoiceNumber: 'INV/2026-27/0043',
        invoiceDate: '2026-11-22',
        currencySymbol: '₹',
        grandTotal: 50000,
        amountPaid: 20000,
        balanceDue: 30000,
        paymentStatus: 'partial',
      });

      expect(msg).toContain('Invoice total: ₹ 50,000.00');
      expect(msg).toContain('Paid: ₹ 20,000.00');
      expect(msg).toContain('Balance due: ₹ 30,000.00');
    });

    it('3. Fully paid invoice displays paid state and omits misleading balance due reminder', () => {
      const msg = buildInvoiceShareMessage({
        customerName: 'Verma & Sons',
        businessName: 'Patel Building Materials',
        invoiceNumber: 'INV/2026-27/0044',
        invoiceDate: '2026-11-22',
        currencySymbol: '₹',
        grandTotal: 15000,
        amountPaid: 15000,
        balanceDue: 0,
        paymentStatus: 'paid',
      });

      expect(msg).toContain('Invoice total: ₹ 15,000.00');
      expect(msg).toContain('Payment status: Fully Paid ✓');
      expect(msg).not.toContain('Balance due:');
    });

    it('4. Supports Hindi bilingual message format', () => {
      const msg = buildInvoiceShareMessage({
        customerName: 'शर्मा कंस्ट्रक्शन',
        businessName: 'पटेल बिल्डिंग मैटेरियल्स',
        invoiceNumber: 'INV/2026-27/0045',
        invoiceDate: '2026-11-22',
        currencySymbol: '₹',
        grandTotal: 10000,
        amountPaid: 4000,
        balanceDue: 6000,
        language: 'hi',
      });

      expect(msg).toContain('नमस्ते शर्मा कंस्ट्रक्शन');
      expect(msg).toContain('कुल राशि: ₹ 10,000.00');
      expect(msg).toContain('जमा राशि: ₹ 4,000.00');
      expect(msg).toContain('शेष राशि: ₹ 6,000.00');
      expect(msg).toContain('व्यापार के लिए धन्यवाद!');
    });

    it('5. Message does not contain private localhost URLs or server filesystem paths', () => {
      const msg = buildInvoiceShareMessage({
        customerName: 'Ramesh',
        businessName: 'Patel Store',
        invoiceNumber: 'INV-100',
        invoiceDate: '2026-11-22',
        grandTotal: 1000,
        amountPaid: 0,
        balanceDue: 1000,
      });

      expect(msg).not.toContain('localhost');
      expect(msg).not.toContain('/Users/');
      expect(msg).not.toContain('C:\\');
      expect(msg).not.toContain('/tmp/');
    });
  });

  describe('WhatsApp Click to Chat URL Builder (§17 Tests 6-8)', () => {
    it('6 & 7. Correctly encodes customer name with spaces, ampersands, unicode and symbols', () => {
      const message = buildInvoiceShareMessage({
        customerName: "Sharma & Sons' Store (शर्मा कंस्ट्रक्शन)",
        businessName: 'M/s Patel & Brothers Ltd.',
        invoiceNumber: 'INV/2026-27/0099 & 01',
        invoiceDate: '2026-11-22',
        currencySymbol: '₹',
        grandTotal: 12500.5,
        amountPaid: 0,
        balanceDue: 12500.5,
      });

      const url = buildWhatsAppClickToChatUrl('919876543210', message);

      expect(url.startsWith('https://wa.me/919876543210?text=')).toBe(true);
      // Destination has NO leading +, spaces or hyphens
      expect(url).not.toContain('https://wa.me/+');
      expect(url).not.toContain('https://wa.me/91 98765');

      // Query param contains strictly encoded characters
      expect(url).not.toContain(' ');
      expect(url).toContain('%20');
      expect(url).toContain(encodeURIComponent('₹'));
      expect(url).toContain(encodeURIComponent('&'));
      expect(url).toContain(encodeURIComponent("Sharma & Sons' Store (शर्मा कंस्ट्रक्शन)"));
    });

    it('8. Strips any accidental +, dashes or spaces from destination phone parameter', () => {
      const url = buildWhatsAppClickToChatUrl('+91 (98765) 43-210', 'Test message');
      expect(url.startsWith('https://wa.me/919876543210?text=')).toBe(true);
    });

    it('throws error when destination number contains no digits', () => {
      expect(() => buildWhatsAppClickToChatUrl('invalid-phone', 'Hello')).toThrow();
    });
  });
});
