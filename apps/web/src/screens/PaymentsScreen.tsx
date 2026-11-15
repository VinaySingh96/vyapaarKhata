import React, { useState, useEffect, useMemo } from 'react';
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
  adjustmentAmount?: number;
  adjustmentType?: string;
  paymentMode?: string;
  referenceNumber?: string;
  notes?: string;
  postedAt?: string;
  createdAt: string;
}

interface PartyOption {
  id: string;
  displayName: string;
  partyType: string;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  grandTotal: number;
  amountPaid?: number;
  adjustmentAmount?: number;
  balanceDue?: number;
  paymentStatus?: string;
  status: string;
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
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);

  // Form state
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('0');
  const [adjustmentType, setAdjustmentType] = useState('round_off');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
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
      .catch((err) => console.warn('Failed to load parties:', err));

    // 3. Fetch sales invoices
    fetch('/api/v1/sales/invoices', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setInvoices(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load invoices:', err))
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

  const totalAdjustments = payments
    .reduce((sum, p) => sum + (p.adjustmentAmount || 0), 0);

  const eligibleParties = useMemo(() => {
    return parties.filter((p) => {
      if (direction === 'inbound') {
        return p.partyType === 'customer' || p.partyType === 'both';
      } else {
        return p.partyType === 'supplier' || p.partyType === 'both';
      }
    });
  }, [parties, direction]);

  useEffect(() => {
    if (eligibleParties.length > 0 && !eligibleParties.some((p) => p.id === selectedPartyId)) {
      setSelectedPartyId(eligibleParties[0].id);
      setSelectedInvoiceId('');
      setAmount('');
      setAdjustmentAmount('0');
    }
  }, [eligibleParties, selectedPartyId]);

  // Filter invoices for selected party
  const partyPendingInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.customerId === selectedPartyId &&
        inv.status === 'posted' &&
        (inv.balanceDue === undefined || inv.balanceDue > 0.001)
    );
  }, [invoices, selectedPartyId]);

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (invId) {
      const inv = invoices.find((i) => i.id === invId);
      if (inv) {
        const bal =
          inv.balanceDue !== undefined
            ? inv.balanceDue
            : Math.max(0, (inv.grandTotal || 0) - ((inv.amountPaid || 0) + (inv.adjustmentAmount || 0)));
        setAmount(bal > 0 ? bal.toFixed(2) : '0');
        setAdjustmentAmount('0');
      }
    } else {
      setAmount('');
      setAdjustmentAmount('0');
    }
  };

  const selectedInv = useMemo(() => {
    return invoices.find((i) => i.id === selectedInvoiceId);
  }, [invoices, selectedInvoiceId]);

  const curBal = useMemo(() => {
    if (!selectedInv) return 0;
    return selectedInv.balanceDue !== undefined
      ? selectedInv.balanceDue
      : Math.max(
          0,
          (selectedInv.grandTotal || 0) -
            ((selectedInv.amountPaid || 0) + (selectedInv.adjustmentAmount || 0))
        );
  }, [selectedInv]);

  const invTotal = selectedInv ? selectedInv.grandTotal || 0 : 0;
  const payAmt = parseFloat(amount) || 0;
  const payAdj = parseFloat(adjustmentAmount) || 0;
  const totalSettling = payAmt + payAdj;
  const remainingLeft = Math.max(0, curBal - totalSettling);
  const isOverLimit = selectedInv ? totalSettling > curBal + 0.01 : false;

  const isFormSubmitDisabled =
    isSubmitting ||
    (direction === 'inbound' && !selectedInvoiceId) ||
    (direction === 'inbound' && isOverLimit) ||
    totalSettling <= 0 ||
    !selectedPartyId;

  const handleSetAutoKasar = () => {
    if (selectedInv) {
      if (payAmt < curBal) {
        setAdjustmentAmount((curBal - payAmt).toFixed(2));
      }
    }
  };

  const handleOpenRecordModal = () => {
    setDirection('inbound');
    setSelectedInvoiceId('');
    setAmount('');
    setAdjustmentAmount('0');
    setAdjustmentType('round_off');
    setPaymentMode('cash');
    setReference('');
    setNotes('');
    setShowRecordModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    const parsedAdj = parseFloat(adjustmentAmount) || 0;

    if (parsedAmount <= 0 && parsedAdj <= 0) {
      toast.warning('Please enter a valid payment amount or adjustment greater than 0');
      return;
    }
    if (!selectedPartyId) {
      toast.warning('Please select a party');
      return;
    }
    if (direction === 'inbound' && !selectedInvoiceId) {
      toast.warning('Please select an invoice number to record customer payment');
      return;
    }
    if (direction === 'inbound' && isOverLimit) {
      toast.error(`Total settlement (₹${totalSettling.toFixed(2)}) cannot exceed balance due (₹${curBal.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedInvoiceId && direction === 'inbound') {
        const res = await fetch(`/api/v1/sales/invoices/${selectedInvoiceId}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          },
          body: JSON.stringify({
            amount: parsedAmount,
            adjustmentAmount: parsedAdj,
            adjustmentType: parsedAdj > 0 ? adjustmentType : undefined,
            paymentMode,
            referenceNumber: reference.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message || 'Failed to record payment on invoice');
        }

        toast.success(
          `Payment of ₹${parsedAmount.toLocaleString()} ${
            parsedAdj > 0 ? `(+ ₹${parsedAdj.toLocaleString()} Kasar)` : ''
          } settled on invoice!`
        );
      } else {
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
            adjustmentAmount: parsedAdj,
            adjustmentType: parsedAdj > 0 ? adjustmentType : undefined,
            paymentMode,
            notes: notes.trim() || undefined,
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

        toast.success(
          `Payment ${paymentNumber} for ₹ ${parsedAmount.toLocaleString()} ${
            parsedAdj > 0 ? `(+ ₹${parsedAdj.toLocaleString()} Kasar)` : ''
          } posted to ledger!`
        );
      }

      setShowRecordModal(false);
      setAmount('');
      setAdjustmentAmount('0');
      setSelectedInvoiceId('');
      setReference('');
      setNotes('');
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
          onClick={handleOpenRecordModal}
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
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Settlement Kasar / Discount</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#4338ca', marginTop: '4px' }}>
            ₹ {totalAdjustments.toLocaleString()}
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
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount Paid</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Adjustment / Kasar</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Settled</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
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
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {(p.adjustmentAmount || 0) > 0 ? (
                        <span style={{ fontWeight: 600, color: '#4338ca', fontSize: '12.5px' }}>
                          ₹ {(p.adjustmentAmount || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                      ₹ {((p.amount || 0) + (p.adjustmentAmount || 0)).toLocaleString()}
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
              disabled={isFormSubmitDisabled}
              style={{
                padding: '8px 18px',
                backgroundColor: isFormSubmitDisabled ? '#9ca3af' : '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isFormSubmitDisabled ? 'not-allowed' : 'pointer',
                opacity: isFormSubmitDisabled ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
              title={
                direction === 'inbound' && !selectedInvoiceId
                  ? 'Invoice selection is required to post customer payment'
                  : isOverLimit
                  ? 'Settlement amount exceeds invoice balance due'
                  : undefined
              }
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
                onClick={() => {
                  setDirection('inbound');
                  setSelectedInvoiceId('');
                }}
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
                onClick={() => {
                  setDirection('outbound');
                  setSelectedInvoiceId('');
                }}
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
              onChange={(e) => {
                setSelectedPartyId(e.target.value);
                setSelectedInvoiceId('');
                setAmount('');
                setAdjustmentAmount('0');
              }}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
            >
              {eligibleParties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} ({p.partyType})
                </option>
              ))}
            </select>
          </div>

          {/* When receiving customer payment, invoice selection is MANDATORY */}
          {direction === 'inbound' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e40af', display: 'block' }}>
                  🧾 Invoice ID / Number *
                </label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {partyPendingInvoices.length > 0 ? `${partyPendingInvoices.length} open bill(s)` : 'Required'}
                </span>
              </div>

              {partyPendingInvoices.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#991b1b',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⚠️</span>
                  <span>This customer has no open or pending invoices. Customer payment requires an open invoice.</span>
                </div>
              ) : (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: !selectedInvoiceId ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    fontWeight: selectedInvoiceId ? 600 : 400,
                    color: '#1e293b',
                  }}
                >
                  <option value="">-- Select Invoice (Required) --</option>
                  {partyPendingInvoices.map((inv) => {
                    const bal =
                      inv.balanceDue !== undefined
                        ? inv.balanceDue
                        : Math.max(0, (inv.grandTotal || 0) - ((inv.amountPaid || 0) + (inv.adjustmentAmount || 0)));
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — Total ₹{inv.grandTotal.toLocaleString()} (Due: ₹{bal.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Amount Paid (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', fontWeight: 700, color: '#059669', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                  Adjustment / Kasar (₹)
                </label>
                {selectedInvoiceId && (
                  <button
                    type="button"
                    onClick={handleSetAutoKasar}
                    style={{
                      fontSize: '11px',
                      color: '#2563eb',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    ⚡ Auto Kasar
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', fontWeight: 700, color: '#4338ca', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Adjustment Reason
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="round_off">Round-off / Kasar (कसर)</option>
                <option value="cash_discount">Cash Discount (नकद छूट)</option>
                <option value="damage_allowance">Damaged Goods Allowance</option>
                <option value="short_settlement">Short Payment Write-off</option>
                <option value="other">Other Concession</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                <option value="cash">💵 Cash Counter</option>
                <option value="upi">📱 UPI / QR Code</option>
                <option value="bank">🏦 Bank Transfer (NEFT/RTGS)</option>
                <option value="cheque">📝 Cheque</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Reference / UTR / Cheque Number
              </label>
              <input
                type="text"
                placeholder="e.g. UTR-AXIS-991823"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Notes / Narration
              </label>
              <input
                type="text"
                placeholder="e.g. Cleared bill with kasar"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Dynamic Information Banners: Red if amount left, Green if settled against invoice */}
          {direction === 'inbound' && (
            <div>
              {!selectedInvoiceId ? (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '12.5px',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>ℹ️</span>
                  <span>Please select an <strong>Invoice ID / Number</strong> above to link payment. "Post to Ledger" is disabled until an invoice is selected.</span>
                </div>
              ) : isOverLimit ? (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #ef4444',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '13.5px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span>Settlement exceeds invoice #{selectedInv?.invoiceNumber} balance due!</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#b91c1c', marginLeft: '24px' }}>
                    Total settlement of ₹ {totalSettling.toFixed(2)} exceeds balance due of ₹ {curBal.toFixed(2)} by ₹ {(totalSettling - curBal).toFixed(2)}. Please reduce payment amount or kasar.
                  </div>
                </div>
              ) : remainingLeft > 0.01 ? (
                /* RED INFORMATION BANNER */
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #ef4444',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '14px' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <span>Amount ₹ {remainingLeft.toFixed(2)} is still left on invoice #{selectedInv?.invoiceNumber}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#b91c1c', marginLeft: '26px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <span>Total Bill: <strong>₹ {invTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                    <span>•</span>
                    <span>Current Due: <strong>₹ {curBal.toFixed(2)}</strong></span>
                    <span>•</span>
                    <span>Paying Now: <strong>₹ {payAmt.toFixed(2)}</strong></span>
                    {payAdj > 0 && (
                      <>
                        <span>•</span>
                        <span>Kasar: <strong>₹ {payAdj.toFixed(2)}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* GREEN INFORMATION BANNER */
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    border: '1.5px solid #10b981',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700, fontSize: '14px' }}>
                    <span style={{ fontSize: '18px' }}>✓</span>
                    <span>Settled against invoice #{selectedInv?.invoiceNumber} of ₹ {invTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} amount</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', marginLeft: '26px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <span>
                      Full Settlement: <strong>₹ {payAmt.toFixed(2)}</strong> received
                      {payAdj > 0 && (
                        <> + <strong>₹ {payAdj.toFixed(2)}</strong> Kasar</>
                      )}
                    </span>
                    <span>•</span>
                    <span>Remaining Balance: <strong>₹ 0.00 (Fully Settled)</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {direction === 'outbound' && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '12.5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#4b5563' }}>
                Net Supplier Settlement: <strong>₹ {payAmt.toFixed(2)}</strong> {payAdj > 0 ? `+ ₹ ${payAdj.toFixed(2)} Discount` : ''}
              </span>
              <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '14px' }}>
                Total Debit: ₹ {totalSettling.toFixed(2)}
              </span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
