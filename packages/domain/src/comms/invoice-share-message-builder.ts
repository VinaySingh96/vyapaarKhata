import { InvoiceShareMessageInput } from './types.js';

function formatAmount(amount: number): string {
  return (amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Builds the standard transactional message for WhatsApp Click to Chat (FR-COMMS-001 §6.5).
 * Deterministic and relies solely on immutable posted invoice snapshot totals.
 */
export function buildInvoiceShareMessage(input: InvoiceShareMessageInput): string {
  const {
    customerName,
    businessName,
    invoiceNumber,
    invoiceDate,
    currencySymbol = '₹',
    grandTotal = 0,
    amountPaid = 0,
    balanceDue = 0,
    language = 'en',
  } = input;

  const sym = currencySymbol ? `${currencySymbol} ` : '₹ ';
  const isPaid = balanceDue <= 0.005 && amountPaid >= grandTotal - 0.005;
  const isHi = language === 'hi';

  if (isHi) {
    if (isPaid) {
      return (
        `नमस्ते ${customerName},\n\n` +
        `${businessName} से आपका बिल ${invoiceNumber} तैयार हो गया है।\n` +
        `बिल दिनांक: ${invoiceDate}\n` +
        `कुल राशि: ${sym}${formatAmount(grandTotal)}\n` +
        `भुगतान स्थिति: पूर्ण चुकता (PAID) ✓\n\n` +
        `व्यापार के लिए धन्यवाद!`
      );
    }

    return (
      `नमस्ते ${customerName},\n\n` +
      `${businessName} से आपका बिल ${invoiceNumber} तैयार हो गया है।\n` +
      `बिल दिनांक: ${invoiceDate}\n` +
      `कुल राशि: ${sym}${formatAmount(grandTotal)}\n` +
      `जमा राशि: ${sym}${formatAmount(amountPaid)}\n` +
      `शेष राशि: ${sym}${formatAmount(balanceDue)}\n\n` +
      `व्यापार के लिए धन्यवाद!`
    );
  }

  // English Default Template
  if (isPaid) {
    return (
      `Hello ${customerName},\n\n` +
      `Your invoice ${invoiceNumber} from ${businessName} has been generated.\n` +
      `Invoice date: ${invoiceDate}\n` +
      `Invoice total: ${sym}${formatAmount(grandTotal)}\n` +
      `Payment status: Fully Paid ✓\n\n` +
      `Thank you for your business.`
    );
  }

  return (
    `Hello ${customerName},\n\n` +
    `Your invoice ${invoiceNumber} from ${businessName} has been generated.\n` +
    `Invoice date: ${invoiceDate}\n` +
    `Invoice total: ${sym}${formatAmount(grandTotal)}\n` +
    `Paid: ${sym}${formatAmount(amountPaid)}\n` +
    `Balance due: ${sym}${formatAmount(balanceDue)}\n\n` +
    `Thank you for your business.`
  );
}
