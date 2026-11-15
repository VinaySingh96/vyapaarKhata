import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';

interface StockBalanceItem {
  id: string;
  variantId: string;
  itemName?: string;
  sku?: string;
  unit?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
}

interface StockMovementItem {
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
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [balances, setBalances] = useState<StockBalanceItem[]>([]);
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Adjustment form state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [countedQty, setCountedQty] = useState('20');
  const [reason, setReason] = useState('Physical count verification');

  const loadData = () => {
    setLoading(true);
    // 1. Fetch balances
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
          if (json.data.length > 0 && !selectedProductId) {
            setSelectedProductId(json.data[0].id);
          }
        }
      })
      .catch((err) => console.warn('Failed to load products:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPhysicalUnits = balances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(countedQty);
    if (isNaN(qty)) {
      toast.warning('Please enter valid counted quantity');
      return;
    }

    setIsSubmitting(true);
    try {
      const prod = products.find((p) => p.id === selectedProductId);
      const adjId = crypto.randomUUID();
      const adjNumber = `ADJ-${Date.now().toString().slice(-6)}`;

      const res = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          id: adjId,
          adjustmentNumber: adjNumber,
          inventoryLocationId: '70000000-0000-0000-0000-000000000001',
          reason,
          lines: [
            {
              id: crypto.randomUUID(),
              adjustmentId: adjId,
              variantId: prod?.defaultVariantId || prod?.variants?.[0]?.id || prod?.id || '8448562d-7ad1-4771-a48d-b3ce2e8aeb08',
              unitId: prod?.baseUnitId || '10000000-0000-0000-0000-000000000001',
              countedQuantity: qty,
              varianceQuantity: 0,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to post adjustment');
      }

      toast.success(`Adjustment ${adjNumber} saved successfully!`);
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
          onClick={() => setShowAdjustmentModal(true)}
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
          {t('inventory.btnAdjust')}
        </button>
      </div>

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
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Primary Godown Location</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#2563eb', marginTop: '6px' }}>
            Main Godown (MG-01)
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
              <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Item / SKU</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>On-Hand Physical</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Reserved (Orders)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Available for Sale</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    No stock balances recorded. Inward stock from Purchasing or record initial stock.
                  </td>
                </tr>
              ) : (
                balances.map((b) => {
                  const prod = products.find((p) => p.defaultVariantId === b.variantId || p.variants?.[0]?.id === b.variantId || p.id === b.variantId);
                  const name = prod ? prod.name : 'Catalog Item';
                  const sku = prod ? prod.sku : b.sku || 'SKU';
                  const unit = prod ? prod.baseUnitSymbol : 'units';
                  const isLow = b.quantityAvailable <= (prod?.reorderLevel || 10);

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                        {name}
                        <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>{sku}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4b5563' }}>Main Godown (MG-01)</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {b.quantityOnHand} {unit}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                        {b.quantityReserved || 0} {unit}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: b.quantityAvailable > 0 ? '#059669' : '#dc2626' }}>
                        {b.quantityAvailable} {unit}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: b.quantityAvailable === 0 ? '#fee2e2' : isLow ? '#fef3c7' : '#ecfdf5',
                            color: b.quantityAvailable === 0 ? '#b91c1c' : isLow ? '#b45309' : '#065f46',
                          }}
                        >
                          {b.quantityAvailable === 0 ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'HEALTHY'}
                        </span>
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
              <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
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

      {/* Modern Custom Modal: Stock Adjustment */}
      <Modal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        title="Physical Stock Adjustment"
        subtitle="Reconcile physical warehouse count against digital balances."
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
              {isSubmitting ? 'Saving...' : 'Save Adjustment'}
            </button>
          </>
        }
      >
        <form id="form-stock-adjustment" onSubmit={handleCreateAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Item to Reconcile *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Physical Counted Quantity *
            </label>
            <input
              type="number"
              min="0"
              required
              value={countedQty}
              onChange={(e) => setCountedQty(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', fontWeight: 700 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Audit Reason / Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
