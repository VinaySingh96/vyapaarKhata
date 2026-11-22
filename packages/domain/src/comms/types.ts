import { InvoiceStatus, InvoicePaymentStatus } from '../entities/types.js';

export type WhatsAppOptInStatus = 'opted_in' | 'opted_out' | 'unknown';

export interface InvoiceCustomerContactDto {
  id: string;
  displayName: string;
  phone: string;
  phoneE164?: string;
  isPrimary: boolean;
  isDedicatedWhatsApp?: boolean;
  whatsappPreference: WhatsAppOptInStatus;
}

export interface InvoiceShareDetailsDto {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  businessName: string;
  businessGstin?: string;
  businessPhone?: string;
  businessAddress?: string;
  customer: {
    id: string;
    displayName: string;
    contacts: InvoiceCustomerContactDto[];
  };
  currency: string;
  currencySymbol: string;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: InvoicePaymentStatus;
  pdfAvailable: boolean;
}

export interface InvoiceShareMessageInput {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currencySymbol?: string;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus?: InvoicePaymentStatus;
  language?: 'en' | 'hi';
}

export type InvoiceShareActionType =
  | 'WHATSAPP_CHAT_OPEN_REQUESTED'
  | 'PDF_SHARE_REQUESTED'
  | 'PDF_DOWNLOADED'
  | 'SHARE_SHEET_OPENED'
  | 'CANCELLED';

export interface InvoiceShareActionPayload {
  action: InvoiceShareActionType;
  maskedDestination?: string;
  platform?: string;
}
