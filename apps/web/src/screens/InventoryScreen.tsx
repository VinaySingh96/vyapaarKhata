import React, { useState } from 'react';
import { StockBalance, StockMovement } from '@vyapaarkhata/domain';

export const InventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'balances' | 'movements'>('balances');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const warehouses = [
    { id: 'all', name: 'All Warehouses' },
    { id: 'w1', name: 'Main Yard (MY-01)' },
    { id: 'w2', name: 'North Godown (NG-02)' },
    { id: 'w3', name: 'Retail Storefront (RS-01)' },
  ];

  const [balances, setBalances] = useState<(StockBalance & { itemName: string; sku: string; unit: string; warehouseName: string })[]>([
    {
      id: 'b1',
      tenantId: 't1',
      locationId: 'w1',
      productId: 'p1',
      variantId: 'v1',
      itemName: 'UltraTech Portland Pozzolana Cement',
      sku: 'CEM-PP-50KG',
      unit: 'bags',
      warehouseName: 'Main Yard (MY-01)',
      currentBalance: 35,
      reorderLevel: 10,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'b2',
      tenantId: 't1',
      locationId: 'w1',
      productId: 'p2',
      variantId: 'v2',
      itemName: 'TMT Steel Fe550D Rebar 12mm',
      sku: 'TMT-12MM-KG',
      unit: 'kg',
      warehouseName: 'Main Yard (MY-01)',
      currentBalance: 18,
      reorderLevel: 25, // Low stock warning!
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'b3',
      tenantId: 't1',
      locationId: 'w2',
      productId: 'p3',
      variantId: 'v3',
      itemName: 'Asian Paints Apex Ultima White (20L)',
      sku: 'PNT-APX-20L',
      unit: 'buckets',
      warehouseName: 'North Godown (NG-02)',
      currentBalance: 8,
      reorderLevel: 5,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'b4',
      tenantId: 't1',
      locationId: 'w3',
      productId: 'p4',
      variantId: 'v4',
      itemName: 'River Sand Fine Washed',
      sku: 'SND-WSH-TON',
      unit: 'tons',
      warehouseName: 'Retail Storefront (RS-01)',
      currentBalance: 0,
      reorderLevel: 5,
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [movements, setMovements] = useState<(StockMovement & { itemName: string; warehouseName: string })[]>([
    {
      id: 'm1',
      tenantId: 't1',
      locationId: 'w1',
      productId: 'p1',
      unitId: 'u1',
      itemName: 'UltraTech Portland Cement',
      warehouseName: 'Main Yard',
      movementType: 'sale',
      quantity: -5,
      referenceDocumentType: 'sales_invoice',
      referenceDocumentId: 'INV-10023',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'm2',
      tenantId: 't1',
      locationId: 'w1',
      productId: 'p1',
      unitId: 'u1',
      itemName: 'UltraTech Portland Cement',
      warehouseName: 'Main Yard',
      movementType: 'purchase_receipt',
      quantity: 20,
      referenceDocumentType: 'purchase_receipt',
      referenceDocumentId: 'GRN-0041',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: 'm3',
      tenantId: 't1',
      locationId: 'w1',
      productId: 'p2',
      unitId: 'u2',
      itemName: 'TMT Steel Fe550D Rebar 12mm',
      warehouseName: 'Main Yard',
      movementType: 'adjustment_in',
      quantity: 10,
      referenceDocumentType: 'inventory_adjustment',
      referenceDocumentId: 'ADJ-0012',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  // Adjustment Modal State
  const [adjWarehouse, setAdjWarehouse] = useState('w1');
  const [adjItem, setAdjItem] = useState('p1');
  const [adjType, setAdjType] = useState<'increase' | 'decrease'>('increase');
  const [adjQty, setAdjQty] = useState('5');
  const [adjReason, setAdjReason] = useState('physical_count');

  // Transfer Modal State
  const [fromWarehouse, setFromWarehouse] = useState('w1');
  const [toWarehouse, setToWarehouse] = useState('w2');
  const [transferItem, setTransferItem] = useState('p1');
  const [transferQty, setTransferQty] = useState('5');

  const filteredBalances = selectedWarehouse === 'all'
    ? balances
    : balances.filter((b) => b.locationId === selectedWarehouse);

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(adjQty) || 0;
    if (qty <= 0) return;

    const delta = adjType === 'increase' ? qty : -qty;

    // Update balances
    setBalances((prev) =>
      prev.map((b) => {
        if (b.productId === adjItem && b.locationId === adjWarehouse) {
          return { ...b, currentBalance: Math.max(0, b.currentBalance + delta) };
        }
        return b;
      })
    );

    // Record movement
    const selectedProd = balances.find((b) => b.productId === adjItem);
    setMovements([
      {
        id: `m-${Date.now()}`,
        tenantId: 't1',
        locationId: adjWarehouse,
        productId: adjItem,
        unitId: 'u1',
        itemName: selectedProd?.itemName || 'Product',
        warehouseName: warehouses.find((w) => w.id === adjWarehouse)?.name || 'Warehouse',
        movementType: adjType === 'increase' ? 'adjustment_in' : 'adjustment_out',
        quantity: delta,
        referenceDocumentType: 'inventory_adjustment',
        referenceDocumentId: `ADJ-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
      },
      ...movements,
    ]);

    setShowAdjustmentModal(false);
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(transferQty) || 0;
    if (qty <= 0 || fromWarehouse === toWarehouse) return;

    // Deduct from source, add to dest
    setBalances((prev) =>
      prev.map((b) => {
        if (b.productId === transferItem && b.locationId === fromWarehouse) {
          return { ...b, currentBalance: Math.max(0, b.currentBalance - qty) };
        }
        if (b.productId === transferItem && b.locationId === toWarehouse) {
          return { ...b, currentBalance: b.currentBalance + qty };
        }
        return b;
      })
    );

    const selectedProd = balances.find((b) => b.productId === transferItem);
    setMovements([
      {
        id: `m-trf-in-${Date.now()}`,
        tenantId: 't1',
        locationId: toWarehouse,
        productId: transferItem,
        unitId: 'u1',
        itemName: selectedProd?.itemName || 'Product',
        warehouseName: warehouses.find((w) => w.id === toWarehouse)?.name || 'Warehouse',
        movementType: 'transfer_in',
        quantity: qty,
        referenceDocumentType: 'stock_transfer',
        referenceDocumentId: `TRF-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
      },
      {
        id: `m-trf-out-${Date.now()}`,
        tenantId: 't1',
        locationId: fromWarehouse,
        productId: transferItem,
        unitId: 'u1',
        itemName: selectedProd?.itemName || 'Product',
        warehouseName: warehouses.find((w) => w.id === fromWarehouse)?.name || 'Warehouse',
        movementType: 'transfer_out',
        quantity: -qty,
        referenceDocumentType: 'stock_transfer',
        referenceDocumentId: `TRF-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
      },
      ...movements,
    ]);

    setShowTransferModal(false);
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            📦 Inventory & Multi-Warehouse Stock
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            Multi-location inventory tracking, negative stock rejection policy, transfers, and movement ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowAdjustmentModal(true)}
            style={{
              backgroundColor: '#4b5563',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ⚖️ Stock Adjustment
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ⇄ Inter-Warehouse Transfer
          </button>
        </div>
      </div>

      {/* Tabs and Warehouse Filter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => setActiveTab('balances')}
            style={{
              padding: '10px 4px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'balances' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'balances' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'balances' ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Stock Balances by Location
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            style={{
              padding: '10px 4px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'movements' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'movements' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'movements' ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Movement Audit Ledger
          </button>
        </div>

        {activeTab === 'balances' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Warehouse:</span>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                backgroundColor: '#ffffff',
              }}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Balances Table */}
      {activeTab === 'balances' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Item Name</th>
                <th style={{ padding: '12px 16px' }}>SKU</th>
                <th style={{ padding: '12px 16px' }}>Warehouse Location</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>On Hand</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Reorder Level</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stock Health Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.map((b) => {
                const isLow = b.currentBalance > 0 && b.currentBalance <= (b.reorderLevel || 0);
                const isOut = b.currentBalance === 0;

                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      {b.itemName}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563' }}>{b.sku}</td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>{b.warehouseName}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                      {b.currentBalance} {b.unit}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                      {b.reorderLevel} {b.unit}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {isOut ? (
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                          Out of Stock (Zero)
                        </span>
                      ) : isLow ? (
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309' }}>
                          ⚠️ Low Stock Threshold
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                          ✓ Healthy Balance
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Movement Audit Ledger */}
      {activeTab === 'movements' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Item Name</th>
                <th style={{ padding: '12px 16px' }}>Warehouse</th>
                <th style={{ padding: '12px 16px' }}>Movement Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Qty Change</th>
                <th style={{ padding: '12px 16px' }}>Reference Document</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const isPositive = m.quantity > 0;
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{m.itemName}</td>
                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>{m.warehouseName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          textTransform: 'uppercase',
                        }}
                      >
                        {m.movementType.replace('_', ' ')}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: isPositive ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {isPositive ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#2563eb' }}>
                      {m.referenceDocumentType}: {m.referenceDocumentId}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', width: '450px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Record Stock Adjustment</h3>
            <form onSubmit={handleCreateAdjustment}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Warehouse Location</label>
                <select
                  value={adjWarehouse}
                  onChange={(e) => setAdjWarehouse(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                >
                  {warehouses.filter((w) => w.id !== 'all').map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Select Product / Item</label>
                <select
                  value={adjItem}
                  onChange={(e) => setAdjItem(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                >
                  <option value="p1">UltraTech Cement (50kg)</option>
                  <option value="p2">TMT Steel Rebar 12mm</option>
                  <option value="p3">Asian Paints Apex (20L)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Adjustment Type</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                  >
                    <option value="increase">+ Increase Stock</option>
                    <option value="decrease">- Decrease Stock</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Quantity</label>
                  <input
                    type="number"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Reason</label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                >
                  <option value="physical_count">Physical Audit / Recount</option>
                  <option value="damage">Damaged in Transit / Warehouse</option>
                  <option value="expired">Expired Material</option>
                  <option value="theft">Discrepancy / Shrinkage</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Post Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', width: '450px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Inter-Warehouse Stock Transfer</h3>
            <form onSubmit={handleCreateTransfer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>From Source</label>
                  <select
                    value={fromWarehouse}
                    onChange={(e) => setFromWarehouse(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                  >
                    {warehouses.filter((w) => w.id !== 'all').map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>To Destination</label>
                  <select
                    value={toWarehouse}
                    onChange={(e) => setToWarehouse(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                  >
                    {warehouses.filter((w) => w.id !== 'all').map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Product / Item</label>
                <select
                  value={transferItem}
                  onChange={(e) => setTransferItem(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                >
                  <option value="p1">UltraTech Cement (50kg)</option>
                  <option value="p2">TMT Steel Rebar 12mm</option>
                  <option value="p3">Asian Paints Apex (20L)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Transfer Quantity</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
