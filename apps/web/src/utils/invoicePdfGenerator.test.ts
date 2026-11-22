import { describe, it, expect, vi } from 'vitest';
import { generateInvoicePdf, InvoicePdfData } from './invoicePdfGenerator.js';

describe('invoicePdfGenerator (FR-COMMS-001 §7.1)', () => {
  const sampleInvoice: InvoicePdfData = {
    invoiceNumber: 'INV-2026-0089',
    invoiceDate: '2026-11-22',
    businessName: 'Patel Hardware & Electricals',
    businessAddress: 'Station Road, Ahmedabad, Gujarat 380001',
    businessPhone: '+91 98250 12345',
    businessGstin: '24AAACP1234A1Z5',
    customerName: 'Kishore Kumar',
    customerPhone: '+91 98765 43210',
    customerAddress: '12 Shanti Nagar, Ring Road, Ahmedabad',
    customerGstin: '24BBBCP5678B1Z2',
    currencySymbol: 'INR',
    subtotal: 1000,
    taxTotal: 180,
    grandTotal: 1180,
    amountPaid: 500,
    balanceDue: 680,
    paymentStatus: 'PARTIAL',
    lines: [
      {
        sno: 1,
        name: 'PVC Pipe 2 inch 10ft',
        quantity: 5,
        unit: 'pcs',
        price: 200,
        taxRate: 18,
        taxAmount: 180,
        lineTotal: 1180,
      },
    ],
  };

  it('generates a valid PDF with File, Blob, and download function', () => {
    const result = generateInvoicePdf(sampleInvoice);

    expect(result).toBeDefined();
    expect(result.doc).toBeDefined();
    expect(result.blob).toBeDefined();
    expect(result.blob.type).toBe('application/pdf');
    expect(result.file).toBeInstanceOf(File);
    expect(result.file.name).toBe('INV-2026-0089.pdf');
    expect(result.file.type).toBe('application/pdf');
    expect(result.file.size).toBeGreaterThan(0);
    expect(typeof result.download).toBe('function');
  });

  it('handles zero balance due and fully paid invoice correctly', () => {
    const paidInvoice: InvoicePdfData = {
      ...sampleInvoice,
      invoiceNumber: 'INV-PAID-001',
      amountPaid: 1180,
      balanceDue: 0,
      paymentStatus: 'PAID',
    };

    const result = generateInvoicePdf(paidInvoice);
    expect(result.file.name).toBe('INV-PAID-001.pdf');
    expect(result.file.size).toBeGreaterThan(0);
  });

  it('handles optional fields omitted (no GSTIN, no phone, no address)', () => {
    const minimalInvoice: InvoicePdfData = {
      invoiceNumber: 'INV-MIN-002',
      invoiceDate: '2026-11-22',
      businessName: 'Simple Trading',
      customerName: 'Cash Customer',
      subtotal: 100,
      taxTotal: 0,
      grandTotal: 100,
      lines: [
        {
          name: 'General Item',
          quantity: 1,
          price: 100,
          lineTotal: 100,
        },
      ],
    };

    const result = generateInvoicePdf(minimalInvoice);
    expect(result.file.name).toBe('INV-MIN-002.pdf');
    expect(result.file.size).toBeGreaterThan(0);
  });

  it('download method triggers doc.save with expected filename', () => {
    const result = generateInvoicePdf(sampleInvoice);
    const saveSpy = vi.spyOn(result.doc, 'save').mockImplementation(() => result.doc);

    result.download();
    expect(saveSpy).toHaveBeenCalledWith('INV-2026-0089.pdf');

    result.download('Custom-Name.pdf');
    expect(saveSpy).toHaveBeenCalledWith('Custom-Name.pdf');
  });
});
