import { describe, it, expect } from 'vitest';
import { StrictRejectInventoryStrategy } from '../src/inventory/inventory-strategy.js';

describe('StrictRejectInventoryStrategy (ADR-003)', () => {
  const strategy = new StrictRejectInventoryStrategy();

  it('allows stock addition and computes correct projected balance', () => {
    const result = strategy.validateMovement({
      productId: 'prod-01',
      locationId: 'loc-01',
      currentBalance: 10,
      quantityChange: 5,
    });

    expect(result.allowed).toBe(true);
    expect(result.projectedBalance).toBe(15);
    expect(result.isLowStockWarning).toBe(false);
  });

  it('strictly rejects transactions that cause negative stock', () => {
    const result = strategy.validateMovement({
      productId: 'prod-01',
      locationId: 'loc-01',
      currentBalance: 5,
      quantityChange: -6, // Exceeds available stock
    });

    expect(result.allowed).toBe(false);
    expect(result.projectedBalance).toBe(-1);
    expect(result.reason).toContain('Insufficient stock');
  });

  it('allows deduction down to zero without going negative', () => {
    const result = strategy.validateMovement({
      productId: 'prod-01',
      locationId: 'loc-01',
      currentBalance: 10,
      quantityChange: -10,
      reorderLevel: 2,
    });

    expect(result.allowed).toBe(true);
    expect(result.projectedBalance).toBe(0);
    expect(result.isLowStockWarning).toBe(true);
  });

  it('triggers low-stock warning when balance drops below or equal to reorder level', () => {
    const result = strategy.validateMovement({
      productId: 'prod-01',
      locationId: 'loc-01',
      currentBalance: 20,
      quantityChange: -15, // projected = 5
      reorderLevel: 10,
    });

    expect(result.allowed).toBe(true);
    expect(result.projectedBalance).toBe(5);
    expect(result.isLowStockWarning).toBe(true);
  });
});
