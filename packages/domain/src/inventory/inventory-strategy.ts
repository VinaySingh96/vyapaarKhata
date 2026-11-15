/**
 * vyapaarKhata Inventory Validation Policy & Invariants
 * ADR-003: Negative stock policy (Strict Reject) and low-stock warning threshold.
 */

export interface StockValidationContext {
  productId: string;
  productName?: string;
  locationId: string;
  locationName?: string;
  currentBalance: number;
  quantityChange: number; // Negative for deductions (e.g. sales, transfer-out), positive for receipts
  reorderLevel?: number; // Minimum safe threshold before triggering low-stock warning
}

export interface StockValidationResult {
  allowed: boolean;
  projectedBalance: number;
  isLowStockWarning: boolean;
  reorderLevel?: number;
  reason?: string;
}

export interface InventoryValidationStrategy {
  validateMovement(context: StockValidationContext): StockValidationResult;
}

/**
 * StrictRejectInventoryStrategy
 * Disallows any transaction that results in projected stock balance < 0.
 * Emits a low-stock warning flag if projected balance <= reorderLevel.
 */
export class StrictRejectInventoryStrategy implements InventoryValidationStrategy {
  validateMovement(context: StockValidationContext): StockValidationResult {
    const projectedBalance = context.currentBalance + context.quantityChange;

    if (projectedBalance < 0) {
      const itemLabel = context.productName ? `"${context.productName}"` : `product ${context.productId}`;
      const locLabel = context.locationName ? ` at ${context.locationName}` : (context.locationId ? ` at location ${context.locationId}` : '');
      return {
        allowed: false,
        projectedBalance,
        isLowStockWarning: false,
        reason: `Insufficient stock for ${itemLabel}${locLabel}. Current balance: ${context.currentBalance}, attempted change: ${context.quantityChange}.`,
      };
    }

    const isLowStockWarning =
      context.reorderLevel !== undefined &&
      projectedBalance <= context.reorderLevel;

    return {
      allowed: true,
      projectedBalance,
      isLowStockWarning,
      reorderLevel: context.reorderLevel,
    };
  }
}
