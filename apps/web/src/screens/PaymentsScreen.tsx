import React, { useState } from 'react';
import { Payment } from '@vyapaarkhata/domain';

export const PaymentsScreen: React.FC = () => {
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [showRecordModal, setShowRecordModal] = useState(false);

  const [payments, setPayments] = useState<(Payment & { partyName: string; paymentMode: string })[]>([
    {
      id: 'pay-1',
      tenantId: 't1',
      partyId: 'pt-1',
      partyName: 'Acme Construction Pvt Ltd',
      paymentNumber: 'REC-2024-001',
      direction: 'inbound',
      status: 'posted',
      amount: 42480,
      referenceNumber: 'UPI-AXIS-992211',
      paymentMode: 'UPI / QR',
      allocations: [],
      postedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'pay-2',
      tenantId: 't1',
      partyId: 'pt-2',
      partyName: 'UltraTech Cement Distributors',
      paymentNumber: 'PAY-2024-001',
      direction: 'outbound',
      status: 'posted',
      amount: 35400,
      referenceNumber: 'NEFT-HDFC-883344',
      paymentMode: 'Bank Transfer (NEFT)',
      allocations: [],
      postedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'pay-3',
      tenantId: 't1',
      partyId: 'pt-3',
      partyName: 'Shree Sai Hardware',
      paymentNumber: 'REC-2024-002',
      direction: 'inbound',
      status: 'posted',
      amount: 5000,
      referenceNumber: 'CASH',
      paymentMode: 'Cash',
      allocations: [],
      postedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ]);

  // Form State
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [partyName, setPartyName] = useState('Acme Construction Pvt Ltd');
  const [amount, setAmount] = useState('10000');
  const [paymentMode, setPaymentMode] = useState('UPI / QR');
  const [refNumber, setRefNumber] = useState('');

  const filteredPayments = directionFilter === 'all'
    ? payments
    : payments.filter((p) => p.direction === directionFilter);

  const totalInbound = payments
    .filter((p) => p.direction === 'inbound')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalOutbound = payments
    .filter((p) => p.direction === 'outbound')
    .reduce((acc, p) => acc + p.amount, 0);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;

    const newPay: Payment & { partyName: string; paymentMode: string } = {
      id: `pay-${Date.now()}`,
      tenantId: 't1',
      partyId: `pt-${Date.now()}`,
      partyName,
      paymentNumber: `${direction === 'inbound' ? 'REC' : 'PAY'}-${Date.now().toString().slice(-4)}`,
      direction,
      status: 'posted',
      amount: amt,
      referenceNumber: refNumber || 'DIRECT',
      paymentMode,
      allocations: [],
      postedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setPayments([newPay, ...payments]);
    setShowRecordModal(false);
    setAmount('');
    setRefNumber('');
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            💳 Payments, Collections & Cash Flow
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            Multi-mode payments: Customer Receipts (UPI/Cash/Bank) and Supplier Settlements with document allocations.
          </p>
        </div>
        <button
          onClick={() => setShowRecordModal(true)}
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
          + Record New Payment
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>TOTAL INBOUND COLLECTIONS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#065f46', marginTop: '4px' }}>
            +₹{totalInbound.toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#fff1f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#be123c' }}>TOTAL OUTBOUND PAYMENTS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#9f1239', marginTop: '4px' }}>
            -₹{totalOutbound.toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}>NET CASH FLOW BALANCE</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e40af', marginTop: '4px' }}>
            ₹{(totalInbound - totalOutbound).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'inbound', 'outbound'] as const).map((dir) => (
          <button
            key={dir}
            onClick={() => setDirectionFilter(dir)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: directionFilter === dir ? '#2563eb' : '#d1d5db',
              backgroundColor: directionFilter === dir ? '#eff6ff' : '#ffffff',
              color: directionFilter === dir ? '#1d4ed8' : '#4b5563',
              fontSize: '13px',
              fontWeight: directionFilter === dir ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {dir === 'all' ? 'All Transactions' : dir === 'inbound' ? '↓ Inbound Receipts' : '↑ Outbound Payments'}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Payment #</th>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Party Name</th>
              <th style={{ padding: '12px 16px' }}>Type & Mode</th>
              <th style={{ padding: '12px 16px' }}>Reference / UTR</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((p) => {
              const isIn = p.direction === 'inbound';
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1d4ed8' }}>{p.paymentNumber}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{p.partyName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: isIn ? '#dcfce7' : '#fee2e2',
                        color: isIn ? '#15803d' : '#b91c1c',
                        marginRight: '6px',
                      }}
                    >
                      {isIn ? '↓ RECEIPT' : '↑ PAYMENT'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#4b5563' }}>{p.paymentMode}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563' }}>{p.referenceNumber || '—'}</td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '14px',
                      color: isIn ? '#059669' : '#dc2626',
                    }}
                  >
                    {isIn ? `+₹${p.amount.toLocaleString()}` : `-₹${p.amount.toLocaleString()}`}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#dcfce7', color: '#15803d' }}>
                      POSTED
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', width: '480px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Record Payment Transaction</h3>
            <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                  Transaction Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDirection('inbound')}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: direction === 'inbound' ? '#16a34a' : '#d1d5db',
                      backgroundColor: direction === 'inbound' ? '#dcfce7' : '#fff',
                      color: direction === 'inbound' ? '#15803d' : '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ↓ Customer Receipt (In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('outbound')}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: direction === 'outbound' ? '#dc2626' : '#d1d5db',
                      backgroundColor: direction === 'outbound' ? '#fee2e2' : '#fff',
                      color: direction === 'outbound' ? '#b91c1c' : '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ↑ Supplier Payment (Out)
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Party Name</label>
                <select
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                >
                  <option value="Acme Construction Pvt Ltd">Acme Construction Pvt Ltd (Customer)</option>
                  <option value="Shree Sai Hardware">Shree Sai Hardware (Customer)</option>
                  <option value="UltraTech Cement Distributors">UltraTech Cement Distributors (Supplier)</option>
                  <option value="Kamdhenu Steel Rolling Mills">Kamdhenu Steel Rolling Mills (Supplier)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                  >
                    <option value="UPI / QR">UPI / QR Code</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank Transfer (NEFT)">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Reference # (UTR / Cheque No / Notes)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref: 3344119900"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Record & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
