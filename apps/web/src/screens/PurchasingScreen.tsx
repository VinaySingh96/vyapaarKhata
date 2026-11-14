import React, { useState } from 'react';
import { PurchaseOrder, PurchaseReceipt, PurchaseBill } from '@vyapaarkhata/domain';

export const PurchasingScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'receipts' | 'bills'>('orders');
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);

  const [orders, setOrders] = useState<PurchaseOrder[]>([
    {
      id: 'po-1',
      tenantId: 't1',
      supplierId: 'pt-2',
      businessLocationId: 'b1',
      orderNumber: 'PO-2024-001',
      status: 'confirmed',
      subtotal: 30000,
      taxAmount: 5400,
      totalAmount: 35400,
      lines: [
        {
          id: 'pol-1',
          variantId: 'v1',
          quantity: 20,
          receivedQuantity: 20,
          unitId: 'u1',
          unitPrice: 1500,
          taxAmount: 270,
          lineTotal: 1770,
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ]);

  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([
    {
      id: 'grn-1',
      tenantId: 't1',
      supplierId: 'pt-2',
      purchaseOrderId: 'po-1',
      inventoryLocationId: 'w1',
      receiptNumber: 'GRN-2024-001',
      status: 'posted',
      lines: [
        {
          id: 'grnl-1',
          variantId: 'v1',
          unitId: 'u1',
          receivedQuantity: 20,
          acceptedQuantity: 20,
          rejectedQuantity: 0,
          unitCost: 1500,
        },
      ],
      postedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'grn-2',
      tenantId: 't1',
      supplierId: 'pt-2',
      purchaseOrderId: 'po-1',
      inventoryLocationId: 'w1',
      receiptNumber: 'GRN-2024-002',
      status: 'draft',
      lines: [
        {
          id: 'grnl-2',
          variantId: 'v2',
          unitId: 'u2',
          receivedQuantity: 15,
          acceptedQuantity: 15,
          rejectedQuantity: 0,
          unitCost: 55,
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ]);

  const [bills, setBills] = useState<PurchaseBill[]>([
    {
      id: 'bill-1',
      tenantId: 't1',
      supplierId: 'pt-2',
      businessLocationId: 'b1',
      billNumber: 'BILL-2024-001',
      supplierInvoiceNumber: 'INV-UT-9988',
      status: 'posted',
      subtotal: 30000,
      taxAmount: 5400,
      totalAmount: 35400,
      amountPaid: 35400,
      lines: [],
      postedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'bill-2',
      tenantId: 't1',
      supplierId: 'pt-2',
      businessLocationId: 'b1',
      billNumber: 'BILL-2024-002',
      supplierInvoiceNumber: 'INV-UT-9995',
      status: 'draft',
      subtotal: 12000,
      taxAmount: 2160,
      totalAmount: 14160,
      amountPaid: 0,
      lines: [],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ]);

  // Handle Action: Post Goods Receipt
  const handlePostReceipt = (receiptId: string) => {
    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId ? { ...r, status: 'posted', postedAt: new Date().toISOString() } : r
      )
    );
    alert(`✓ Goods Receipt ${receiptId} posted successfully. Physical stock balance updated without altering supplier ledger.`);
  };

  // Handle Action: Post Purchase Bill
  const handlePostBill = (billId: string) => {
    setBills((prev) =>
      prev.map((b) =>
        b.id === billId ? { ...b, status: 'posted', postedAt: new Date().toISOString() } : b
      )
    );
    alert(`✓ Purchase Bill ${billId} posted successfully. Supplier payable credited without duplicating physical inventory.`);
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            🛒 Procurement, Goods Receipts & Bills
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            Two-stage purchasing workflow: Physical Goods Receipt (GRN) updates inventory, and Financial Bill posts supplier credit.
          </p>
        </div>
        <button
          onClick={() => setShowCreatePOModal(true)}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          + Create Purchase Order
        </button>
      </div>

      {/* Workflow Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'orders' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'orders' ? '#2563eb' : '#6b7280',
            fontWeight: activeTab === 'orders' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          1. Purchase Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'receipts' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'receipts' ? '#2563eb' : '#6b7280',
            fontWeight: activeTab === 'receipts' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          2. Goods Receipts / GRN ({receipts.length})
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'bills' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'bills' ? '#2563eb' : '#6b7280',
            fontWeight: activeTab === 'bills' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          3. Purchase Bills ({bills.length})
        </button>
      </div>

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>PO Number</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Supplier</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Tax Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Value</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1d4ed8' }}>{po.orderNumber}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', color: '#111827' }}>UltraTech Cement Distributors</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>₹{po.taxAmount.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>₹{po.totalAmount.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#dcfce7', color: '#15803d', textTransform: 'uppercase' }}>
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Goods Receipts */}
      {activeTab === 'receipts' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>GRN Number</th>
                <th style={{ padding: '12px 16px' }}>Created Date</th>
                <th style={{ padding: '12px 16px' }}>Supplier</th>
                <th style={{ padding: '12px 16px' }}>Target Warehouse</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((grn) => (
                <tr key={grn.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1d4ed8' }}>{grn.receiptNumber}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{new Date(grn.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', color: '#111827' }}>UltraTech Cement Distributors</td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>Main Yard (MY-01)</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: grn.status === 'posted' ? '#dcfce7' : '#fef3c7',
                        color: grn.status === 'posted' ? '#15803d' : '#b45309',
                        textTransform: 'uppercase',
                      }}
                    >
                      {grn.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {grn.status === 'draft' ? (
                      <button
                        onClick={() => handlePostReceipt(grn.id)}
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Post Receipt (Add Stock)
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Posted to Inventory</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Purchase Bills */}
      {activeTab === 'bills' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Bill Number</th>
                <th style={{ padding: '12px 16px' }}>Supplier Invoice #</th>
                <th style={{ padding: '12px 16px' }}>Supplier</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Payable</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1d4ed8' }}>{bill.billNumber}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563' }}>{bill.supplierInvoiceNumber || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#111827' }}>UltraTech Cement Distributors</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                    ₹{bill.totalAmount.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: bill.status === 'posted' ? '#dcfce7' : '#fef3c7',
                        color: bill.status === 'posted' ? '#15803d' : '#b45309',
                        textTransform: 'uppercase',
                      }}
                    >
                      {bill.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {bill.status === 'draft' ? (
                      <button
                        onClick={() => handlePostBill(bill.id)}
                        style={{
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Post Bill (Credit Supplier)
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Posted to Ledger</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreatePOModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', width: '500px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Create Purchase Order</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Supplier</label>
              <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}>
                <option>UltraTech Cement Distributors Hub</option>
                <option>Kamdhenu Steel Rolling Mills</option>
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Item to Order</label>
              <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}>
                <option>UltraTech Cement 50kg Bags</option>
                <option>TMT Rebar 12mm</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Quantity</label>
                <input type="number" defaultValue="20" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Unit Price (₹)</label>
                <input type="number" defaultValue="310" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowCreatePOModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => {
                  setShowCreatePOModal(false);
                  alert('Purchase Order created.');
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
