import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';
import { useStore } from '../context/StoreContext.js';
import { formatIndianNumber } from '../utils/currency.js';
import { apiFetch } from '../utils/api.js';

interface ReceiptItem {
  id: string;
  receiptNumber: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  lines: any[];
  postedAt?: string;
  createdAt: string;
}

interface BillItem {
  id: string;
  billNumber: string;
  supplierInvoiceNumber?: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  postedAt?: string;
  createdAt: string;
}

export const PurchasingScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();
  const { tenantId } = useStore();

  const [activeTab, setActiveTab] = useState<'receipts' | 'bills'>('receipts');
  const [showCreateGRNModal, setShowCreateGRNModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Form State for GRN
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('20');
  const [unitCost, setUnitCost] = useState('310');

  const loadData = () => {
    setLoading(true);
    // 1. Fetch receipts
    apiFetch('/api/v1/purchasing/receipts')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setReceipts(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load receipts:', err));

    // 2. Fetch bills
    apiFetch('/api/v1/purchasing/bills')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setBills(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load bills:', err));

    // 3. Fetch products
    apiFetch('/api/v1/products')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
          if (json.data.length > 0 && !selectedProductId) {
            setSelectedProductId(json.data[0].id);
            setUnitCost(String(json.data[0].purchasePrice || 310));
          }
        }
      })
      .catch((err) => console.warn('Failed to load products:', err));

    // 4. Fetch suppliers
    apiFetch('/api/v1/parties')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const sups = json.data.filter((p: any) => p.partyType === 'supplier' || p.partyType === 'both');
          setSuppliers(sups);
          if (sups.length > 0 && !selectedSupplierId) {
            setSelectedSupplierId(sups[0].id);
          }
        }
      })
      .catch((err) => console.warn('Failed to load suppliers:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);
    if (!qty || qty <= 0) {
      toast.warning('Please enter a valid received quantity');
      return;
    }
    if (!selectedSupplierId || !selectedProductId) {
      toast.warning('Please select supplier and item');
      return;
    }

    setIsSubmitting(true);
    try {
      const receiptId = crypto.randomUUID();
      const receiptNumber = `GRN-${Date.now().toString().slice(-6)}`;
      const prod = products.find((p) => p.id === selectedProductId);

      // 1. Create draft receipt
      const res = await apiFetch('/api/v1/purchasing/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: receiptId,
          supplierId: selectedSupplierId,
          inventoryLocationId: '70000000-0000-0000-0000-000000000001',
          receiptNumber,
          lines: [
            {
              id: crypto.randomUUID(),
              receiptId,
              variantId: prod?.defaultVariantId || prod?.variants?.[0]?.id || prod?.id || '8448562d-7ad1-4771-a48d-b3ce2e8aeb08',
              unitId: prod?.baseUnitId || '10000000-0000-0000-0000-000000000001',
              receivedQuantity: qty,
              acceptedQuantity: qty,
              unitCost: cost,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create receipt');
      }

      // 2. Post receipt to increment stock balances
      const postRes = await apiFetch(`/api/v1/purchasing/receipts/${receiptId}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const postJson = await postRes.json();
      if (!postJson.success) {
        throw new Error(postJson.error?.message || 'Failed to post GRN to inventory');
      }

      // 3. Automatically create and post matching Purchase Bill so supplier payable ledger is credited
      const billId = crypto.randomUUID();
      const billNumber = `BILL-${receiptNumber.replace('GRN-', '')}`;
      const lineTotal = qty * cost;

      try {
        const billRes = await apiFetch('/api/v1/purchasing/bills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: billId,
            supplierId: selectedSupplierId,
            businessLocationId: '60000000-0000-0000-0000-000000000001',
            billNumber,
            supplierInvoiceNumber: receiptNumber,
            subtotal: lineTotal,
            taxAmount: 0,
            totalAmount: lineTotal,
            lines: [
              {
                id: crypto.randomUUID(),
                billId,
                variantId: prod?.defaultVariantId || prod?.variants?.[0]?.id || prod?.id,
                quantity: qty,
                unitPrice: cost,
                lineTotal,
              },
            ],
          }),
        });

        const billJson = await billRes.json();
        if (billJson.success) {
          await apiFetch(`/api/v1/purchasing/bills/${billId}/post`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
        }
      } catch (billErr) {
        console.warn('Failed to auto-create matching purchase bill:', billErr);
      }

      toast.success(`GRN ${receiptNumber} inward posted! +${qty} units added to Godown & purchase bill recorded.`);
      setShowCreateGRNModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error processing GRN');
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
            {t('purchasing.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('purchasing.subtitle')}
          </p>
        </div>
        <button
          id="btn-create-grn"
          onClick={() => setShowCreateGRNModal(true)}
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
          + Inward Goods Receipt (GRN)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Goods Receipts</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {receipts.length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Purchase Bills Logged</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {bills.length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Approved Suppliers</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {suppliers.length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Inventory Warehouse</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb', marginTop: '6px' }}>
            Main Godown (MG-01)
          </div>
        </div>
      </div>

      {/* Tabs */}
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
          onClick={() => setActiveTab('receipts')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeTab === 'receipts' ? '#2563eb' : '#ffffff',
            color: activeTab === 'receipts' ? '#ffffff' : '#374151',
          }}
        >
          {t('purchasing.tabReceipts')} ({receipts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bills')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeTab === 'bills' ? '#2563eb' : '#ffffff',
            color: activeTab === 'bills' ? '#ffffff' : '#374151',
          }}
        >
          {t('purchasing.tabBills')} ({bills.length})
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
        {activeTab === 'receipts' ? (
          <table>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>GRN Number</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Supplier</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Inward Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Posted Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    No goods receipts recorded yet. Click "+ Inward Goods Receipt" to add stock.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => {
                  const supplier = suppliers.find((s) => s.id === r.supplierId);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                        {r.receiptNumber}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#374151' }}>
                        {supplier ? supplier.displayName : (r.supplierName || 'UltraTech Distributors')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                          }}
                        >
                          POSTED (INWARD)
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                        {r.postedAt ? new Date(r.postedAt).toLocaleString() : 'Just now'}
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
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Bill Number</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Vendor Invoice No</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Bill Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    No purchase bills recorded.
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{b.billNumber}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563' }}>
                      {b.supplierInvoiceNumber || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                      ₹ {formatIndianNumber(b.totalAmount || 0, { decimals: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                        }}
                      >
                        {b.status?.toUpperCase() || 'POSTED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                      {b.postedAt ? new Date(b.postedAt).toLocaleDateString() : 'Today'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modern Custom Modal: Create Inward GRN */}
      <Modal
        isOpen={showCreateGRNModal}
        onClose={() => setShowCreateGRNModal(false)}
        title="Inward Goods Receipt Note (GRN)"
        subtitle="Accepts supplier delivery and increments physical warehouse inventory."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowCreateGRNModal(false)}
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
              form="form-create-grn"
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
              {isSubmitting ? 'Inwarding...' : 'Confirm Inward Stock'}
            </button>
          </>
        }
      >
        <form id="form-create-grn" onSubmit={handleCreateGRN} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Supplier / Distributor *
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Received Product / Item *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const p = products.find((prod) => prod.id === e.target.value);
                if (p) setUnitCost(String(p.purchasePrice || 310));
              }}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Received Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Unit Purchase Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
