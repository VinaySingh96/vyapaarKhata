/**
 * Rental Module Entities (ADR-007)
 * Issue (items go out, no money) → one or more Returns (each return bills rent for its own days).
 */
import { EntityId } from './types.js';

export type RentalIssueStatus = 'open' | 'partially_returned' | 'completed' | 'cancelled';
export type RentalReturnStatus = 'posted' | 'cancelled';

export interface RentalIssueLine {
  id: EntityId;
  issueId?: EntityId;
  variantId: EntityId;
  unitId: EntityId;
  description?: string;
  unitSymbol?: string;
  qtyIssued: number;
  qtyReturned: number;
  qtyLost: number;
  dailyRate: number;
  replacementRate: number;
}

export interface RentalIssue {
  id: EntityId;
  tenantId: EntityId;
  partyId: EntityId;
  partyName?: string;
  partyPhone?: string;
  businessLocationId?: EntityId;
  sourceLocationId: EntityId;
  onRentLocationId: EntityId;
  issueNumber: string;
  issueDate: string; // YYYY-MM-DD
  siteAddress?: string;
  status: RentalIssueStatus;
  depositAmount: number;
  notes?: string;
  createdBy?: EntityId;
  cancelledAt?: string;
  createdAt: string;
  updatedAt?: string;
  lines: RentalIssueLine[];
}

export interface RentalReturnLine {
  id: EntityId;
  returnId?: EntityId;
  issueLineId: EntityId;
  qtyReturned: number;
  qtyLost: number;
  days: number;
  dailyRate: number;
  rentAmount: number;
  lossRate: number;
  lossAmount: number;
  description?: string;
}

export interface RentalReturn {
  id: EntityId;
  tenantId: EntityId;
  issueId: EntityId;
  returnNumber: string;
  returnDate: string; // YYYY-MM-DD
  isFinal: boolean;
  status: RentalReturnStatus;
  salesInvoiceId?: EntityId;
  invoiceNumber?: string;
  gstRate: number;
  rentAmount: number;
  lossAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  createdBy?: EntityId;
  cancelledAt?: string;
  createdAt: string;
  lines: RentalReturnLine[];
}

export interface RentalSettings {
  enabled: boolean;
  /** Count both issue day and return day (1 Nov → 10 Nov = 10 days). */
  inclusiveDays: boolean;
  /** Minimum days charged per return line. */
  minDays: number;
  /** Default GST % applied on rent bills (rental of equipment, SAC 9973). */
  defaultGstRate: number;
}

export const DEFAULT_RENTAL_SETTINGS: RentalSettings = {
  enabled: false,
  inclusiveDays: true,
  minDays: 1,
  defaultGstRate: 18,
};
