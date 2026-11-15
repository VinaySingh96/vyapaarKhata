import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect.js';

export interface StockBalanceItem {
  id: string;
  variantId: string;
  productId?: string;
  itemName?: string;
  sku?: string;
  unit?: string;
  locationId?: string;
  locationName?: string;
  quantityOnHand?: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  reorderLevel?: number;
  currentBalance?: number;
}

export interface StockMovementItem {
  id: string;
  movementType: string;
  quantity: number;
  referenceDocumentType: string;
  referenceDocumentId: string;
  createdAt: string;
}

export const InventoryScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'balances' | 'movements'>('balances');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockBalanceItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [balances, setBalances] = useState<StockBalanceItem[]>([]);
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Adjustment form state
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [countedQty, setCountedQty] = useState('0');
  const [reason, setReason] = useState('Physical stock count reconciliation');

  const loadData = () => {
    setLoading(true);
    // 1. Fetch balances (all variants)
    fetch('/api/v1/inventory/balances', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setBalances(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load balances:', err));

    // 2. Fetch movements audit trail
    fetch('/api/v1/inventory/movements?limit=30', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setMovements(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load movements:', err));

    // 3. Fetch products catalog
    fetch('/api/v1/products', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load products:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const totalPhysicalUnits = useMemo(
    () => balances.reduce((sum, b) => sum + (b.quantityOnHand ?? b.currentBalance ?? 0), 0),
    [balances]
  );

  const outOfStockItems = useMemo(
    () => balances.filter((b) => (b.quantityAvailable ?? b.quantityOnHand ?? 0) <= 0),
    [balances]
  );

  const lowStockItems = useMemo(
    () =>
      balances.filter((b) => {
        const avail = b.quantityAvailable ?? b.quantityOnHand ?? 0;
        const reorder = b.reorderLevel || 10;
        return avail > 0 && avail <= reorder;
      }),
    [balances]
  );

  // Searchable select options for adjustment modal
  const variantSelectOptions: SelectOption[] = useMemo(() => {
    return balances.map((b) => {
      const onHand = b.quantityOnHand ?? b.currentBalance ?? 0;
      return {
        value: b.variantId,
        label: b.itemName || b.sku || 'Catalog Item',
        sublabel: `SKU: ${b.sku} | Loc: ${b.locationName || 'Main Godown'}`,
        badge: `${onHand} ${b.unit || 'units'}`,
        badgeType: onHand === 0 ? 'danger' : onHand <= (b.reorderLevel || 10) ? 'warning' : 'success',
      };
    });
  }, [balances]);

  // Open update modal for a specific row
  const handleOpenUpdateModal = (item: StockBalanceItem) => {
    setEditingItem(item);
    setSelectedVariantId(item.variantId);
    setCountedQty(String(item.quantityOnHand ?? item.currentBalance ?? 0));
    setReason('Physical count reconciliation');
    setShowAdjustmentModal(true);
  };

  // Open generic adjustment modal
  const handleOpenGenericModal = () => {
    setEditingItem(null);
    if (balances.length > 0) {
      setSelectedVariantId(balances[0].variantId);
      setCountedQty(String(balances[0].quantityOnHand ?? 0));
    } else {
      setSelectedVariantId('');
      setCountedQty('0');
    }
    setReason('Physical count reconciliation');
    setShowAdjustmentModal(true);
  };

  // Quick preset add handler
  const handleAddPreset = (deltaToAdd: number) => {
    const current = parseFloat(countedQty) || 0;
    setCountedQty(String(Math.max(0, current + deltaToAdd)));
  };

  // Selected item reference for modal calculations
  const activeModalItem = useMemo(() => {
    if (editingItem) return editingItem;
    return balances.find((b) => b.variantId === selectedVariantId) || null;
  }, [editingItem, selectedVariantId, balances]);

  const currentOnHand = activeModalItem?.quantityOnHand ?? activeModalItem?.currentBalance ?? 0;
  const parsedCountedQty = parseFloat(countedQty) || 0;
  const adjustmentDelta = parsedCountedQty - currentOnHand;

  // Submit stock adjustment
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(countedQty);
    if (isNaN(qty) || qty < 0) {
      toast.warning('Please enter a valid non-negative physical count');
      return;
    }

    if (!activeModalItem && !selectedVariantId) {
      toast.warning('Please select an item to adjust');
      return;
    }

    const delta = qty - currentOnHand;
    if (delta === 0) {
      toast.info('Counted quantity matches current balance. No adjustment required.');
      setShowAdjustmentModal(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const adjId = crypto.randomUUID();
      const adjNumber = `ADJ-${Date.now().toString().slice(-6)}`;
      const adjType = delta >= 0 ? 'increase' : 'decrease';
      const adjQty = Math.abs(delta);

      // Find unitId
      const prod = products.find(
        (p) => p.id === activeModalItem?.productId || p.defaultVariantId === activeModalItem?.variantId
      );
      const targetUnitId = prod?.baseUnitId || '10000000-0000-0000-0000-000000000001';

      const res = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          id: adjId,
          adjustmentNumber: adjNumber,
          inventoryLocationId: activeModalItem?.locationId || '70000000-0000-0000-0000-000000000001',
          reason: reason || 'Physical count verification',
          lines: [
            {
              id: crypto.randomUUID(),
              adjustmentId: adjId,
              variantId: activeModalItem?.variantId || selectedVariantId,
              unitId: targetUnitId,
              adjustmentType: adjType,
              quantity: adjQty,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to post adjustment');
      }

      toast.success(
        `Updated stock for "${activeModalItem?.itemName || 'Item'}": Now ${qty} ${activeModalItem?.unit || 'units'} (${delta >= 0 ? '+' : ''}${delta})`
      );
      setShowAdjustmentModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            {t('inventory.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('inventory.subtitle')}
          </p>
        </div>
        <button
          id="btn-stock-adjustment"
          type="button"
          onClick={handleOpenGenericModal}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
          }}
        >
          <span>⚖️</span>
          <span>{t('inventory.btnAdjust')}</span>
        </button>
      </div>

      {/* Critical Stock Alert Banner */}
      {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '14px 18px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🚨</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#991b1b' }}>
                  Critical Stock Alert: Attention Required
                </div>
                <div style={{ fontSize: '12.5px', color: '#b91c1c', marginTop: '2px' }}>
                  <strong>{outOfStockItems.length}</strong> items are completely <strong>OUT OF STOCK</strong>
                  {lowStockItems.length > 0 && (
                    <span>
                      {' '}and <strong>{lowStockItems.length}</strong> items are running critically low.
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#7f1d1d',
                backgroundColor: '#fee2e2',
                padding: '4px 10px',
                borderRadius: '12px',
              }}
            >
              Click any item below to update stock instantly
            </span>
          </div>

          {/* Quick-action item pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {outOfStockItems.slice(0, 10).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenUpdateModal(item)}
                title="Click to update physical stock"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 11px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#991b1b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#dc2626',
                    display: 'inline-block',
                  }}
                />
                <span>{item.itemName}</span>
                <span
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                  }}
                >
                  0 {item.unit}
                </span>
                <span style={{ color: '#2563eb', marginLeft: '2px', fontSize: '11px' }}>✏️</span>
              </button>
            ))}

            {lowStockItems.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenUpdateModal(item)}
                title="Click to update physical stock"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 11px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#92400e',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef3c7')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    display: 'inline-block',
                  }}
                />
                <span>{item.itemName}</span>
                <span
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                  }}
                >
                  {item.quantityAvailable} {item.unit}
                </span>
                <span style={{ color: '#2563eb', marginLeft: '2px', fontSize: '11px' }}>✏️</span>
              </button>
            ))}

            {outOfStockItems.length + lowStockItems.length > 16 && (
              <span style={{ alignSelf: 'center', fontSize: '12px', color: '#7f1d1d', fontWeight: 600 }}>
                +{outOfStockItems.length + lowStockItems.length - 16} more items
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Active Tracked Variants</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {balances.length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Physical Stock On Hand</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {totalPhysicalUnits} units
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Out of Stock / Critical</div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: outOfStockItems.length > 0 ? '#dc2626' : '#059669',
              marginTop: '4px',
            }}
          >
            {outOfStockItems.length} items
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Movement Audit Logs</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {movements.length} logged
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeTab === 'balances' ? '#2563eb' : '#ffffff',
            color: activeTab === 'balances' ? '#ffffff' : '#374151',
          }}
        >
          {t('inventory.tabBalances')} ({balances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeTab === 'movements' ? '#2563eb' : '#ffffff',
            color: activeTab === 'movements' ? '#ffffff' : '#374151',
          }}
        >
          {t('inventory.tabMovements')} ({movements.length})
        </button>
        <button
          type="button"
          onClick={loadData}
          style={{
            padding: '8px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151',
            marginLeft: 'auto',
          }}
        >
          {loading ? '...' : '↻ Refresh'}
        </button>
      </div>

      {/* Table Content */}
      <div className="vk-table-responsive">
        {activeTab === 'balances' ? (
          <table>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid #e5e7eb',
                  color: '#6b7280',
                  fontSize: '12px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Item / SKU</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>On-Hand Physical</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Reserved (Orders)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Available for Sale</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stock Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    No stock balances recorded. Inward stock from Purchasing or record initial stock.
                  </td>
                </tr>
              ) : (
                balances.map((b) => {
                  const prod = products.find(
                    (p) =>
                      p.defaultVariantId === b.variantId ||
                      p.variants?.some((v: any) => v.id === b.variantId) ||
                      p.id === b.variantId ||
                      p.id === b.productId
                  );
                  const name = b.itemName || (prod ? prod.name : 'Catalog Item');
                  const sku = b.sku || (prod ? prod.sku : 'SKU');
                  const unit = b.unit || (prod ? prod.baseUnitSymbol : 'units');
                  const locName = b.locationName || 'Main Godown (MG-01)';
                  const onHand = b.quantityOnHand ?? b.currentBalance ?? 0;
                  const reserved = b.quantityReserved ?? 0;
                  const available = b.quantityAvailable ?? (onHand - reserved);
                  const isOutOfStock = available <= 0;
                  const isLow = !isOutOfStock && available <= (b.reorderLevel || prod?.reorderLevel || 10);

                  return (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: '13.5px',
                        backgroundColor: isOutOfStock ? '#fffafa' : isLow ? '#fffdf7' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: isOutOfStock ? '#dc2626' : isLow ? '#f59e0b' : '#10b981',
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div>{name}</div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#6b7280',
                                fontFamily: 'monospace',
                                fontWeight: 400,
                              }}
                            >
                              {sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4b5563' }}>{locName}</td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: onHand === 0 ? '#9ca3af' : '#111827',
                        }}
                      >
                        {onHand} {unit}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                        {reserved} {unit}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isOutOfStock ? '#dc2626' : isLow ? '#d97706' : '#059669',
                        }}
                      >
                        {available} {unit}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: isOutOfStock ? '#fee2e2' : isLow ? '#fef3c7' : '#ecfdf5',
                            color: isOutOfStock ? '#991b1b' : isLow ? '#92400e' : '#065f46',
                            border: `1px solid ${
                              isOutOfStock ? '#fca5a5' : isLow ? '#fcd34d' : '#a7f3d0'
                            }`,
                          }}
                        >
                          <span style={{ fontSize: '10px' }}>
                            {isOutOfStock ? '❌' : isLow ? '⚠️' : '✅'}
                          </span>
                          {isOutOfStock ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'HEALTHY'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenUpdateModal(b)}
                          title="Update stock count"
                          style={{
                            padding: '5px 12px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#2563eb',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                            e.currentTarget.style.borderColor = '#93c5fd';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                        >
                          <span>✏️</span>
                          <span>Update</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid #e5e7eb',
                  color: '#6b7280',
                  fontSize: '12px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Movement Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Quantity Delta</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Reference Document</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Occurred At</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2',
                            color: isPositive ? '#065f46' : '#991b1b',
                          }}
                        >
                          {m.movementType.toUpperCase()}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isPositive ? '#059669' : '#dc2626',
                        }}
                      >
                        {isPositive ? `+${m.quantity}` : m.quantity} units
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563' }}>
                        {m.referenceDocumentType}: {m.referenceDocumentId.slice(0, 13)}...
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : 'Just now'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modern Custom Modal: Stock Update / Adjustment */}
      <Modal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        title={editingItem ? 'Update Physical Stock' : 'Physical Stock Reconciliation'}
        subtitle={
          editingItem
            ? `Reconcile actual on-hand stock for ${editingItem.itemName}.`
            : 'Reconcile physical warehouse counts against system balances.'
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAdjustmentModal(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('btn.cancel')}
            </button>
            <button
              type="submit"
              form="form-stock-adjustment"
              disabled={isSubmitting}
              style={{
                padding: '8px 18px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Stock Update'}
            </button>
          </>
        }
      >
        <form
          id="form-stock-adjustment"
          onSubmit={handleCreateAdjustment}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {editingItem ? (
            /* Targeted Item Info Card */
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 16px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                {editingItem.itemName}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                SKU: <span style={{ fontFamily: 'monospace' }}>{editingItem.sku}</span> | Godown:{' '}
                <strong>{editingItem.locationName || 'Main Godown'}</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px dashed #cbd5e1',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Current On-Hand</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                    {currentOnHand} {editingItem.unit}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Available for Sale</div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: (editingItem.quantityAvailable ?? 0) <= 0 ? '#dc2626' : '#059669',
                    }}
                  >
                    {editingItem.quantityAvailable ?? 0} {editingItem.unit}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Global Select */
            <div>
              <label
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#374151',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Select Item to Reconcile *
              </label>
              <SearchableSelect
                options={variantSelectOptions}
                value={selectedVariantId}
                onChange={(val) => {
                  setSelectedVariantId(val);
                  const matched = balances.find((b) => b.variantId === val);
                  if (matched) {
                    setCountedQty(String(matched.quantityOnHand ?? 0));
                  }
                }}
                placeholder="Search catalog item or SKU..."
              />
            </div>
          )}

          {/* New Physical Count Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                New Physical Count ({activeModalItem?.unit || 'units'}) *
              </label>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Current balance: <strong>{currentOnHand}</strong>
              </span>
            </div>

            <input
              type="number"
              min="0"
              step="any"
              required
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #94a3b8',
                fontSize: '16px',
                fontWeight: 700,
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            />

            {/* Quick add increment buttons */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>
                Quick Add:
              </span>
              {[+10, +50, +100, +500].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleAddPreset(inc)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  +{inc}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCountedQty('0')}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#991b1b',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Reset to 0
              </button>
            </div>

            {/* Live Delta Breakdown */}
            <div
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                backgroundColor:
                  adjustmentDelta > 0 ? '#ecfdf5' : adjustmentDelta < 0 ? '#fef2f2' : '#f8fafc',
                color:
                  adjustmentDelta > 0 ? '#065f46' : adjustmentDelta < 0 ? '#991b1b' : '#64748b',
                border: `1px solid ${
                  adjustmentDelta > 0 ? '#a7f3d0' : adjustmentDelta < 0 ? '#fca5a5' : '#e2e8f0'
                }`,
              }}
            >
              {adjustmentDelta > 0 ? (
                <span>
                  📈 Stock will INCREASE by <strong>+{adjustmentDelta} {activeModalItem?.unit || 'units'}</strong> (Inward adjustment)
                </span>
              ) : adjustmentDelta < 0 ? (
                <span>
                  📉 Stock will DECREASE by <strong>{adjustmentDelta} {activeModalItem?.unit || 'units'}</strong> (Outward adjustment)
                </span>
              ) : (
                <span>⚖️ Count is identical to current physical stock (0 delta)</span>
              )}
            </div>
          </div>

          {/* Audit Reason */}
          <div>
            <label
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Audit Reason / Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical count reconciliation, opening stock, replenishment..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
