import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';

interface PaymentItem {
  id: string;
  tenantId?: string;
  partyId?: string;
  partyName?: string;
  paymentNumber: string;
  direction: 'inbound' | 'outbound';
  status: string;
  amount: number;
  referenceNumber?: string;
  paymentMode?: string;
  postedAt?: string;
  createdAt: string;
}

interface PartyOption {
  id: string;
  displayName: string;
  partyType: string;
}

export const PaymentsScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);

  // Form state
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [amount, setAmount] = useState('1000');
  const [reference, setReference] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');

  const loadData = () => {
    setLoading(true);
    // 1. Fetch payments
    fetch('/api/v1/payments', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPayments(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load payments:', err));

    // 2. Fetch parties
    fetch('/api/v1/parties', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setParties(json.data);
          if (json.data.length > 0 && !selectedPartyId) {
            setSelectedPartyId(json.data[0].id);
          }
        }
      })
      .catch((err) => console.warn('Failed to load parties:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPayments = payments.filter((p) => {
    if (directionFilter === 'all') return true;
    return p.direction === directionFilter;
  });

  const totalInbound = payments
    .filter((p) => p.direction === 'inbound')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalOutbound = payments
    .filter((p) => p.direction === 'outbound')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.warning('Please enter a valid payment amount');
      return;
    }
    if (!selectedPartyId) {
      toast.warning('Please select a party');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentId = crypto.randomUUID();
      const paymentNumber = `PAY-${direction === 'inbound' ? 'REC' : 'OUT'}-${Date.now().toString().slice(-6)}`;

      // 1. Create draft payment
      const res = await fetch('/api/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          id: paymentId,
          partyId: selectedPartyId,
          paymentNumber,
          direction,
          amount: parsedAmount,
          referenceNumber: reference.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to record payment');
      }

      // 2. Post payment atomically to party ledger
      const postRes = await fetch(`/api/v1/payments/${paymentId}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({}),
      });

      const postJson = await postRes.json();
      if (!postJson.success) {
        throw new Error(postJson.error?.message || 'Failed to post payment');
      }

      toast.success(`Payment ${paymentNumber} for ₹ ${parsedAmount.toLocaleString()} posted to ledger!`);
      setShowRecordModal(false);
      setAmount('1000');
      setReference('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error processing payment');
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
            {t('payments.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('payments.subtitle')}
          </p>
        </div>
        <button
          id="btn-record-payment"
          onClick={() => setShowRecordModal(true)}
          style={{
            padding: '10px 18px',
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(5,150,105,0.2)',
          }}
        >
          {t('payments.recordPayment')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Customer Collections (Inward)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            ₹ {totalInbound.toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Supplier Settlements (Outward)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
            ₹ {totalOutbound.toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Net Cash Inflow</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
            ₹ {(totalInbound - totalOutbound).toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Ledger Transactions</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {payments.length}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
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
          onClick={() => setDirectionFilter('all')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: directionFilter === 'all' ? '#2563eb' : '#ffffff',
            color: directionFilter === 'all' ? '#ffffff' : '#374151',
          }}
        >
          {t('payments.all')}
        </button>
        <button
          type="button"
          onClick={() => setDirectionFilter('inbound')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: directionFilter === 'inbound' ? '#2563eb' : '#ffffff',
            color: directionFilter === 'inbound' ? '#ffffff' : '#374151',
          }}
        >
          {t('payments.inbound')}
        </button>
        <button
          type="button"
          onClick={() => setDirectionFilter('outbound')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: directionFilter === 'outbound' ? '#2563eb' : '#ffffff',
            color: directionFilter === 'outbound' ? '#ffffff' : '#374151',
          }}
        >
          {t('payments.outbound')}
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
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Payments Table */}
      <div className="vk-table-responsive">
        <table>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Receipt / Voucher No</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Party / Account</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Flow Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Reference / UTR</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                  No transactions found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => {
                const party = parties.find((partyItem) => partyItem.id === p.partyId);
                const displayName = party ? party.displayName : (p.partyName || 'Party');

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      {p.paymentNumber}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#374151' }}>
                      {displayName}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: p.direction === 'inbound' ? '#ecfdf5' : '#fef2f2',
                          color: p.direction === 'inbound' ? '#065f46' : '#991b1b',
                        }}
                      >
                        {p.direction === 'inbound' ? '↓ Received (In)' : '↑ Paid (Out)'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#6b7280' }}>
                      {p.referenceNumber || 'Cash Counter'}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: p.direction === 'inbound' ? '#059669' : '#dc2626',
                      }}
                    >
                      {p.direction === 'inbound' ? '+' : '-'} ₹ {(p.amount || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: p.status === 'posted' ? '#ecfdf5' : '#fef3c7',
                          color: p.status === 'posted' ? '#065f46' : '#92400e',
                        }}
                      >
                        {p.status?.toUpperCase() || 'POSTED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Today'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modern Custom Modal: Record Payment */}
      <Modal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        title={t('payments.modalTitle')}
        subtitle="Record receipt or payout. Commits debit/credit to party khata atomically."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowRecordModal(false)}
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
              form="form-record-payment"
              disabled={isSubmitting}
              style={{
                padding: '8px 18px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Posting...' : 'Post to Ledger'}
            </button>
          </>
        }
      >
        <form id="form-record-payment" onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Transaction Direction
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDirection('inbound')}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: direction === 'inbound' ? '2px solid #059669' : '1px solid #d1d5db',
                  backgroundColor: direction === 'inbound' ? '#ecfdf5' : '#ffffff',
                  color: direction === 'inbound' ? '#065f46' : '#374151',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ↓ Customer Collection (In)
              </button>
              <button
                type="button"
                onClick={() => setDirection('outbound')}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: direction === 'outbound' ? '2px solid #dc2626' : '1px solid #d1d5db',
                  backgroundColor: direction === 'outbound' ? '#fef2f2' : '#ffffff',
                  color: direction === 'outbound' ? '#991b1b' : '#374151',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ↑ Supplier Settlement (Out)
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Select Party *
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
            >
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} ({p.partyType})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
              >
                <option value="cash">Cash Counter</option>
                <option value="upi">UPI / QR Code</option>
                <option value="bank">Bank Transfer (NEFT/RTGS)</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Reference / UTR / Cheque Number
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-AXIS-991823"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
