import { jsPDF } from 'jspdf';

export interface InvoicePdfLine {
  sno?: number;
  name: string;
  quantity: number;
  unit?: string;
  price: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessGstin?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  currencySymbol?: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentStatus?: string;
  lines: InvoicePdfLine[];
}

export interface GeneratedPdfResult {
  doc: jsPDF;
  blob: Blob;
  file: File;
  download: (filename?: string) => void;
}

function formatCurrency(amount: number): string {
  return (amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates an authoritative, professional PDF tax invoice document (FR-COMMS-001 §7).
 */
export function generateInvoicePdf(data: InvoicePdfData): GeneratedPdfResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const sym = data.currencySymbol || 'Rs.';

  let y = margin + 15;

  // 1. Business Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.businessName || 'vyapaarKhata Store', margin, y);

  // Status Badge on Top Right
  const isPaid = (data.balanceDue ?? 0) <= 0.005 && (data.amountPaid ?? 0) >= data.grandTotal - 0.005;
  const statusLabel = isPaid ? 'PAID' : (data.amountPaid ?? 0) > 0 ? 'PARTIAL' : 'TAX INVOICE';
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  if (isPaid) {
    doc.setTextColor(22, 163, 74); // green
  } else {
    doc.setTextColor(37, 99, 235); // blue
  }
  doc.text(statusLabel, pageWidth - margin, y, { align: 'right' });

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600

  const busDetails = [];
  if (data.businessAddress) busDetails.push(data.businessAddress);
  if (data.businessPhone) busDetails.push(`Phone: ${data.businessPhone}`);
  if (data.businessGstin) busDetails.push(`GSTIN: ${data.businessGstin}`);

  for (const line of busDetails) {
    doc.text(line, margin, y);
    y += 12;
  }

  // Divider Line
  y += 6;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // 2. Invoice Meta & Bill To Box
  const col2X = margin + contentWidth * 0.55;

  // Bill To (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('BILL TO:', margin, y);

  // Invoice Details (Right)
  doc.text('INVOICE DETAILS:', col2X, y);
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.customerName || 'Walk-in Customer', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice No: ${data.invoiceNumber}`, col2X, y);
  y += 13;

  if (data.customerPhone) {
    doc.text(`Contact: ${data.customerPhone}`, margin, y);
  }
  doc.text(`Date: ${data.invoiceDate}`, col2X, y);
  y += 13;

  if (data.customerAddress) {
    doc.text(`Address: ${data.customerAddress}`, margin, y);
  }
  if (data.customerGstin) {
    y += 13;
    doc.text(`Customer GSTIN: ${data.customerGstin}`, margin, y);
  }

  y += 18;

  // 3. Line Items Table Header
  const tableTop = y;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, tableTop, contentWidth, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const colSno = margin + 8;
  const colDesc = margin + 30;
  const colQty = margin + 260;
  const colUnit = margin + 310;
  const colRate = margin + 360;
  const colTax = margin + 420;
  const colTotal = pageWidth - margin - 8;

  doc.text('#', colSno, tableTop + 14);
  doc.text('Item Description', colDesc, tableTop + 14);
  doc.text('Qty', colQty, tableTop + 14, { align: 'right' });
  doc.text('Unit', colUnit, tableTop + 14);
  doc.text('Rate', colRate, tableTop + 14, { align: 'right' });
  doc.text('Tax', colTax, tableTop + 14, { align: 'right' });
  doc.text('Total', colTotal, tableTop + 14, { align: 'right' });

  y = tableTop + 24;

  // 4. Line Items Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  let idx = 1;
  for (const line of data.lines || []) {
    // Alternate row styling
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 10, contentWidth, 18, 'F');
    }

    doc.text(String(line.sno || idx), colSno, y + 2);

    const truncatedName = line.name.length > 40 ? line.name.substring(0, 38) + '...' : line.name;
    doc.text(truncatedName, colDesc, y + 2);
    doc.text(String(line.quantity), colQty, y + 2, { align: 'right' });
    doc.text(line.unit || 'pcs', colUnit, y + 2);
    doc.text(`${formatCurrency(line.price)}`, colRate, y + 2, { align: 'right' });
    doc.text(line.taxRate ? `${line.taxRate}%` : '-', colTax, y + 2, { align: 'right' });
    doc.text(`${formatCurrency(line.lineTotal)}`, colTotal, y + 2, { align: 'right' });

    y += 18;
    idx++;

    // Safety check for multi-page invoices
    if (y > pageHeight - 140) {
      doc.addPage();
      y = margin + 20;
    }
  }

  // Bottom table line
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // 5. Totals & Settlement Box
  const summaryBoxWidth = 230;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal:', summaryBoxX, y);
  doc.text(`${sym} ${formatCurrency(data.subtotal)}`, pageWidth - margin, y, { align: 'right' });
  y += 14;

  doc.text('GST / Taxes:', summaryBoxX, y);
  doc.text(`${sym} ${formatCurrency(data.taxTotal)}`, pageWidth - margin, y, { align: 'right' });
  y += 16;

  // Grand Total Highlight
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.rect(summaryBoxX - 6, y - 10, summaryBoxWidth + 6, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('Grand Total:', summaryBoxX, y + 5);
  doc.text(`${sym} ${formatCurrency(data.grandTotal)}`, pageWidth - margin, y + 5, { align: 'right' });
  y += 24;

  // Payment Breakdown
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const amountPaid = data.amountPaid || 0;
  const balanceDue = data.balanceDue !== undefined ? data.balanceDue : Math.max(0, data.grandTotal - amountPaid);

  doc.text('Amount Received:', summaryBoxX, y);
  doc.text(`${sym} ${formatCurrency(amountPaid)}`, pageWidth - margin, y, { align: 'right' });
  y += 14;

  doc.setFont('helvetica', 'bold');
  if (balanceDue <= 0.005) {
    doc.setTextColor(22, 163, 74);
    doc.text('Balance Due:', summaryBoxX, y);
    doc.text('Rs. 0.00 (Fully Paid)', pageWidth - margin, y, { align: 'right' });
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text('Balance Due:', summaryBoxX, y);
    doc.text(`${sym} ${formatCurrency(balanceDue)}`, pageWidth - margin, y, { align: 'right' });
  }

  // 6. Footer Note
  const footerY = pageHeight - margin - 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('This is a computer generated invoice and requires no physical signature.', margin, footerY);
  doc.text('Thank you for your business! &middot; vyapaarKhata', pageWidth - margin, footerY, { align: 'right' });

  // Generate artifacts
  const pdfBlob = doc.output('blob');
  const safeNumber = (data.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeNumber}.pdf`;
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  return {
    doc,
    blob: pdfBlob,
    file: pdfFile,
    download: (customName) => {
      doc.save(customName || filename);
    },
  };
}
