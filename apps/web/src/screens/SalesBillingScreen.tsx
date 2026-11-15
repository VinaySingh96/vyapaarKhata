import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { useToast } from '../components/Toast.js';

export interface BillingLine {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  unit: string;
  unitId: string;
  quantity: number;
  price: number;
  taxRate: number;
  availableStock: number;
  reorderLevel: number;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  variantId?: string;
  sellingPrice: number;
  totalStock: number;
  baseUnitSymbol: string;
  baseUnitId: string;
  reorderLevel: number;
  taxRate?: number;
}

interface CustomerParty {
  id: string;
  displayName: string;
  phone?: string;
  currentBalance?: number;
}

export const SalesBillingScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [customers, setCustomers] = useState<CustomerParty[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('90000000-0000-0000-0000-000000000001');
  const [customCustomerName, setCustomCustomerName] = useState<string>('Acme Construction Pvt Ltd');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'credit'>('cash');
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');

  const [lines, setLines] = useState<BillingLine[]>([]);

  // Fetch live products and customers from backend
  const loadData = () => {
    // 1. Fetch products
    fetch('/api/v1/products', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: ProductItem[] = json.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku || 'SKU',
            variantId: p.defaultVariantId || p.variants?.[0]?.id || p.id,
            sellingPrice: p.sellingPrice || p.variants?.[0]?.sellingPrice || 380,
            totalStock: p.totalStock !== undefined ? p.totalStock : (p.variants?.[0]?.stockOnHand || 0),
            baseUnitSymbol: p.baseUnitSymbol || 'pcs',
            baseUnitId: p.baseUnitId || '10000000-0000-0000-0000-000000000001',
            reorderLevel: p.reorderLevel || p.variants?.[0]?.reorderLevel || 10,
            taxRate: p.taxRate || 18,
          }));
          setProducts(mapped);

          // Populate initial lines if empty
          setLines((prev) => {
            if (prev.length > 0) return prev;
            const first = mapped[0];
            return [
              {
                id: `line-${Date.now()}-1`,
                productId: first.id,
                variantId: first.variantId || first.id,
                name: first.name,
                sku: first.sku,
                unit: first.baseUnitSymbol,
                unitId: first.baseUnitId,
                quantity: 1,
                price: first.sellingPrice,
                taxRate: first.taxRate || 18,
                availableStock: first.totalStock,
                reorderLevel: first.reorderLevel,
              },
            ];
          });
        }
      })
      .catch((err) => console.warn('Could not load products:', err));

    // 2. Fetch customer parties
    fetch('/api/v1/parties', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const custs = json.data.filter((p: any) => p.partyType === 'customer' || p.partyType === 'both');
          setCustomers(custs);
          if (custs.length > 0) {
            setSelectedCustomerId(custs[0].id);
            setCustomCustomerName(custs[0].displayName);
          }
        }
      })
      .catch((err) => console.warn('Could not load parties:', err));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Add Item handler
  const handleAddItem = (productId?: string) => {
    setInvoiceError(null);
    const targetProduct = products.find((p) => p.id === productId) || products[0];
    if (!targetProduct) return;

    // Check if product is already in bill
    const existingIndex = lines.findIndex((l) => l.productId === targetProduct.id);
    if (existingIndex >= 0) {
      // Increment existing line quantity
      const updated = [...lines];
      updated[existingIndex].quantity += 1;
      setLines(updated);
    } else {
      // Add fresh line
      const newLine: BillingLine = {
        id: `line-${Date.now()}-${lines.length + 1}`,
        productId: targetProduct.id,
        variantId: targetProduct.variantId || targetProduct.id,
        name: targetProduct.name,
        sku: targetProduct.sku,
        unit: targetProduct.baseUnitSymbol,
        unitId: targetProduct.baseUnitId,
        quantity: 1,
        price: targetProduct.sellingPrice,
        taxRate: targetProduct.taxRate || 18,
        availableStock: targetProduct.totalStock,
        reorderLevel: targetProduct.reorderLevel,
      };
      setLines([...lines, newLine]);
    }
  };

  // Remove Item handler
  const handleRemoveLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  // Change product in an existing line
  const handleLineProductChange = (lineId: string, newProductId: string) => {
    const targetProduct = products.find((p) => p.id === newProductId);
    if (!targetProduct) return;

    setLines(
      lines.map((l) =>
        l.id === lineId
          ? {
              ...l,
              productId: targetProduct.id,
              variantId: targetProduct.variantId || targetProduct.id,
              name: targetProduct.name,
              sku: targetProduct.sku,
              unit: targetProduct.baseUnitSymbol,
              unitId: targetProduct.baseUnitId,
              price: targetProduct.sellingPrice,
              availableStock: targetProduct.totalStock,
              reorderLevel: targetProduct.reorderLevel,
            }
          : l
      )
    );
  };

  // Financial calculations
  const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.price, 0);
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  // Post invoice to backend
  const handlePostInvoice = async () => {
    setInvoiceError(null);
    setInvoiceSuccess(null);

    if (lines.length === 0) {
      const msg = 'Please add at least one item to generate a sale bill.';
      setInvoiceError(msg);
      toast.warning(msg);
      return;
    }

    // Check for 0 or negative quantities
    for (const line of lines) {
      if (line.quantity <= 0) {
        const msg = `Quantity for "${line.name}" must be greater than 0.`;
        setInvoiceError(msg);
        toast.warning(msg);
        return;
      }
    }

    // Check for negative stock violation
    for (const line of lines) {
      if (line.quantity > line.availableStock) {
        const msg = t('sales.outOfStock', { avail: line.availableStock, req: line.quantity }) + ` (${line.name})`;
        setInvoiceError(msg);
        toast.error(msg);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const invoiceId = crypto.randomUUID();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create draft invoice
      const createRes = await fetch('/api/v1/sales/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          id: invoiceId,
          businessLocationId: '60000000-0000-0000-0000-000000000001',
          invoiceNumber,
          customerId: selectedCustomerId,
          subtotal,
          taxTotal: gst,
          grandTotal,
          lines: lines.map((l, idx) => ({
            id: crypto.randomUUID(),
            productId: l.productId,
            variantId: l.variantId,
            locationId: '70000000-0000-0000-0000-000000000001',
            quantity: l.quantity,
            unitId: l.unitId,
            unitPrice: l.price,
            taxAmount: l.quantity * l.price * 0.18,
            lineTotal: l.quantity * l.price * 1.18,
          })),
        }),
      });

      const createJson = await createRes.json();
      if (!createJson.success) {
        throw new Error(createJson.error?.message || 'Failed to create sales invoice');
      }

      // 2. Post invoice atomically
      const postRes = await fetch(`/api/v1/sales/invoices/${invoiceId}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({}),
      });

      const postJson = await postRes.json();
      if (!postJson.success) {
        throw new Error(postJson.error?.message || 'Failed to post sales invoice');
      }

      // Success
      const successMsg = `${t('sales.invoiceSuccess', { no: invoiceNumber })} | ${customCustomerName} | ₹ ${grandTotal.toLocaleString()}`;
      setInvoiceSuccess(successMsg);
      toast.success(successMsg);

      // Refresh stock balances and reset cart
      loadData();
      setLines([]);
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred while posting invoice';
      setInvoiceError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="vk-pos-layout">
      {/* Left: Bill drafting */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '20px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            {t('sales.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#6b7280' }}>
            {t('sales.subtitle')}
          </p>
        </div>

        {invoiceSuccess && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              color: '#065f46',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            ✓ {invoiceSuccess}
          </div>
        )}

        {invoiceError && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            {invoiceError}
          </div>
        )}

        {/* Customer & Bill details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #f3f4f6',
          }}
        >
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '4px' }}>
              {t('sales.customer')}
            </label>
            {customers.length > 0 ? (
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value);
                  setSelectedCustomerId(e.target.value);
                  if (cust) setCustomCustomerName(cust.displayName);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                }}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customCustomerName}
                onChange={(e) => setCustomCustomerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                }}
              />
            )}
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '4px' }}>
              {t('sales.invoiceNo')}
            </label>
            <div style={{ padding: '8px 0', fontWeight: 700, fontSize: '15px', color: '#111827' }}>
              Auto-Generated POS Receipt
            </div>
          </div>
        </div>

        {/* Items Table with Responsive Overflow */}
        <div className="vk-table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px' }}>
              <th style={{ padding: '8px 0', width: '38%' }}>{t('sales.itemDesc')}</th>
              <th style={{ padding: '8px', width: '18%' }}>{t('sales.available')}</th>
              <th style={{ padding: '8px', width: '14%' }}>{t('sales.qty')}</th>
              <th style={{ padding: '8px', width: '14%' }}>{t('sales.rate')}</th>
              <th style={{ padding: '8px', width: '16%', textAlign: 'right' }}>{t('sales.total')}</th>
              <th style={{ padding: '8px 0', width: '4%' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af' }}>
                  No items in current bill. Click <strong>"{t('sales.addItem')}"</strong> below or select a product to begin.
                </td>
              </tr>
            ) : (
              lines.map((line) => {
                const remaining = line.availableStock - line.quantity;
                const isOutOfStock = remaining < 0;
                const isLowStock = remaining >= 0 && remaining <= line.reorderLevel;

                return (
                  <tr key={line.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                    <td style={{ padding: '12px 0' }}>
                      {products.length > 1 ? (
                        <select
                          value={line.productId}
                          onChange={(e) => handleLineProductChange(line.id, e.target.value)}
                          style={{
                            width: '95%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontWeight: 600 }}>{line.name}</div>
                      )}
                      <div style={{ marginTop: '2px' }}>
                        {isOutOfStock ? (
                          <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                            ❌ Out of stock! Deficit of {Math.abs(remaining)} {line.unit}
                          </span>
                        ) : isLowStock ? (
                          <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 500 }}>
                            {t('sales.lowStockWarning', { count: remaining, unit: line.unit })}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>
                            ✓ In stock ({remaining} {line.unit} left after sale)
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', color: '#4b5563' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: line.availableStock > 0 ? '#eff6ff' : '#fef2f2',
                          color: line.availableStock > 0 ? '#1d4ed8' : '#b91c1c',
                        }}
                      >
                        {line.availableStock} {line.unit}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (line.quantity > 1) {
                              setLines(
                                lines.map((l) => (l.id === line.id ? { ...l, quantity: l.quantity - 1 } : l))
                              );
                            }
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#f9fafb',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700,
                            lineHeight: '1',
                          }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setLines(lines.map((l) => (l.id === line.id ? { ...l, quantity: val } : l)));
                          }}
                          style={{
                            width: '50px',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            textAlign: 'center',
                            fontWeight: 600,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLines(
                              lines.map((l) => (l.id === line.id ? { ...l, quantity: l.quantity + 1 } : l))
                            );
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#f9fafb',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700,
                            lineHeight: '1',
                          }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <input
                        type="number"
                        value={line.price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setLines(lines.map((l) => (l.id === line.id ? { ...l, price: val } : l)));
                        }}
                        style={{
                          width: '70px',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          fontWeight: 500,
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>
                      ₹ {(line.quantity * line.price).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        title="Remove item"
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 700,
                          padding: '4px 8px',
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Action Bar: Add Item & Quick Product Selector */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={selectedProductToAdd}
              onChange={(e) => {
                if (e.target.value) {
                  handleAddItem(e.target.value);
                  setSelectedProductToAdd('');
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                minWidth: '240px',
              }}
            >
              <option value="">{t('sales.selectItem')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.sellingPrice} | Stock: {p.totalStock} {p.baseUnitSymbol})
                </option>
              ))}
            </select>

            <button
              id="btn-add-item-to-bill"
              type="button"
              onClick={() => handleAddItem(products[0]?.id)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
              }}
            >
              {t('sales.addItem')}
            </button>
          </div>

          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => setLines([])}
              style={{
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                color: '#ef4444',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {t('sales.clearCart')}
            </button>
          )}
        </div>
      </div>

      {/* Right: Summary, Payment Mode & Atomic Post Button */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
            {t('sales.subtotal')}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px' }}>
            <span style={{ color: '#6b7280' }}>{t('sales.subtotal')}:</span>
            <span style={{ fontWeight: 600 }}>₹ {subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px' }}>
            <span style={{ color: '#6b7280' }}>{t('sales.gst')} (18%):</span>
            <span style={{ fontWeight: 600 }}>₹ {gst.toLocaleString()}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              margin: '16px 0',
              paddingTop: '16px',
              borderTop: '2px solid #e5e7eb',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            <span>{t('sales.grandTotal')}:</span>
            <span style={{ color: '#10b981' }}>₹ {grandTotal.toLocaleString()}</span>
          </div>

          {/* Payment Mode Selector */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
              {t('sales.paymentMode')}
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: '#f9fafb',
                fontWeight: 500,
              }}
            >
              <option value="cash">{t('sales.modeCash')}</option>
              <option value="upi">{t('sales.modeUpi')}</option>
              <option value="bank">{t('sales.modeBank')}</option>
              <option value="credit">{t('sales.modeCredit')}</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <button
            id="btn-post-sales-bill"
            onClick={handlePostInvoice}
            disabled={isSubmitting || lines.length === 0}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: isSubmitting || lines.length === 0 ? '#9ca3af' : '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: isSubmitting || lines.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {isSubmitting ? 'Posting to Ledger...' : t('sales.postBill')}
          </button>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
            Atomically locks stock, updates party ledger & enqueues outbox sync.
          </div>
        </div>
      </div>
    </div>
  );
};
