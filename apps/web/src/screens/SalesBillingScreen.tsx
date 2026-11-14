import React, { useState } from 'react';

export interface BillingLine {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  availableStock: number;
  reorderLevel: number;
}

export const SalesBillingScreen: React.FC = () => {
  const [customer, setCustomer] = useState('Acme Construction');
  const [lines, setLines] = useState<BillingLine[]>([
    {
      id: '1',
      name: 'UltraTech Portland Cement (50kg)',
      quantity: 5,
      unit: 'bags',
      price: 380,
      availableStock: 20,
      reorderLevel: 8,
    },
    {
      id: '2',
      name: 'TMT Steel Rebar 12mm',
      quantity: 10,
      unit: 'kg',
      price: 65,
      availableStock: 12, // Close to threshold
      reorderLevel: 10,
    },
  ]);

  const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.price, 0);
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      {/* Left: Bill drafting */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
              Customer (Party)
            </label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              style={{
                marginTop: '4px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                width: '260px',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
              Invoice No.
            </label>
            <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '16px', color: '#111827' }}>
              INV-2026-0042
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px' }}>
              <th style={{ padding: '8px 0' }}>Item Description</th>
              <th style={{ padding: '8px' }}>Available</th>
              <th style={{ padding: '8px' }}>Qty</th>
              <th style={{ padding: '8px' }}>Rate (₹)</th>
              <th style={{ padding: '8px 0', textAlign: 'right' }}>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const remaining = line.availableStock - line.quantity;
              const isWarning = remaining <= line.reorderLevel;

              return (
                <tr key={line.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '14px' }}>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ fontWeight: 600 }}>{line.name}</div>
                    {isWarning && (
                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500 }}>
                        ⚠️ Low stock warning: {remaining} {line.unit} remaining after posting
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#6b7280' }}>
                    {line.availableStock} {line.unit}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setLines(lines.map((l) => (l.id === line.id ? { ...l, quantity: val } : l)));
                      }}
                      style={{
                        width: '60px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 8px' }}>₹ {line.price}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>
                    ₹ {(line.quantity * line.price).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Right: Summary and Atomic Post Button */}
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
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Bill Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#6b7280' }}>Taxable Amount:</span>
            <span>₹ {subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#6b7280' }}>GST (18%):</span>
            <span>₹ {gst.toLocaleString()}</span>
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
            <span>Grand Total:</span>
            <span style={{ color: '#10b981' }}>₹ {grandTotal.toLocaleString()}</span>
          </div>
        </div>

        <div>
          <button
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Post & Finalize Bill (Ctrl+Enter)
          </button>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
            Atomically locks stock, updates party ledger & enqueues outbox sync.
          </div>
        </div>
      </div>
    </div>
  );
};
