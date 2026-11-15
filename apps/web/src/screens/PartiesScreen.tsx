import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';
import { useStore } from '../context/StoreContext.js';
import { formatIndianNumber } from '../utils/currency.js';
import { apiFetch } from '../utils/api.js';

interface PartyItem {
  id: string;
  tenantId?: string;
  partyType: 'customer' | 'supplier' | 'both';
  displayName: string;
  legalName?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  openingBalance?: number;
  openingBalanceType?: 'debit' | 'credit';
  currentBalance?: number;
  isActive?: boolean;
}

export const PartiesScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();
  const { tenantId } = useStore();

  const [selectedType, setSelectedType] = useState<'all' | 'customer' | 'supplier'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<PartyItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [parties, setParties] = useState<PartyItem[]>([]);

  // Add party form state
  const [newName, setNewName] = useState('');
  const [newLegalName, setNewLegalName] = useState('');
  const [newType, setNewType] = useState<'customer' | 'supplier'>('customer');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState('0');

  // Load parties from backend
  const loadParties = () => {
    setLoading(true);
    apiFetch('/api/v1/parties')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setParties(json.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load parties:', err);
        toast.error('Failed to load parties from server');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadParties();
  }, [tenantId]);

  const filteredParties = parties.filter((p) => {
    const matchesType = selectedType === 'all' || p.partyType === selectedType || p.partyType === 'both';
    const matchesSearch =
      p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.gstin?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalReceivables = parties
    .filter((p) => (p.currentBalance || 0) > 0)
    .reduce((sum, p) => sum + (p.currentBalance || 0), 0);

  const totalPayables = parties
    .filter((p) => (p.currentBalance || 0) < 0)
    .reduce((sum, p) => sum + Math.abs(p.currentBalance || 0), 0);

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.warning('Party name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const partyId = crypto.randomUUID();
      const res = await apiFetch('/api/v1/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: partyId,
          partyType: newType,
          displayName: newName.trim(),
          legalName: newLegalName.trim() || newName.trim(),
          phone: newPhone.trim() || undefined,
          email: newEmail.trim() || undefined,
          gstin: newGstin.trim().toUpperCase() || undefined,
          openingBalance: parseFloat(newOpeningBalance) || 0,
          openingBalanceType: newType === 'customer' ? 'debit' : 'credit',
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to save party');
      }

      toast.success(t('parties.createdSuccess'));
      setShowAddModal(false);
      setNewName('');
      setNewLegalName('');
      setNewPhone('');
      setNewEmail('');
      setNewGstin('');
      setNewOpeningBalance('0');
      loadParties();
    } catch (err: any) {
      toast.error(err.message || 'Error saving party');
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
            {t('parties.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('parties.subtitle')}
          </p>
        </div>
        <button
          id="btn-add-new-party"
          onClick={() => setShowAddModal(true)}
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
          {t('parties.addNew')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Registered Customers</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {parties.filter((p) => p.partyType === 'customer' || p.partyType === 'both').length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Registered Suppliers</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {parties.filter((p) => p.partyType === 'supplier' || p.partyType === 'both').length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Customer Receivables (उधारी)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
            ₹ {formatIndianNumber(totalReceivables, { decimals: 2 })}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Supplier Payables (देनदारी)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>
            ₹ {formatIndianNumber(totalPayables, { decimals: 2 })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder={t('parties.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13.5px',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: selectedType === 'all' ? '#2563eb' : '#ffffff',
              color: selectedType === 'all' ? '#ffffff' : '#374151',
            }}
          >
            {t('parties.all')}
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('customer')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: selectedType === 'customer' ? '#2563eb' : '#ffffff',
              color: selectedType === 'customer' ? '#ffffff' : '#374151',
            }}
          >
            {t('parties.customers')}
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('supplier')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: selectedType === 'supplier' ? '#2563eb' : '#ffffff',
              color: selectedType === 'supplier' ? '#ffffff' : '#374151',
            }}
          >
            {t('parties.suppliers')}
          </button>
          <button
            type="button"
            onClick={loadParties}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
            }}
          >
            {loading ? '...' : '↻'}
          </button>
        </div>
      </div>

      {/* Parties Table with Responsive Wrapper */}
      <div className="vk-table-responsive">
        <table>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('parties.colParty')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('parties.colType')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('parties.colContact')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('parties.colGstin')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('parties.colBalance')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>{t('parties.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredParties.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                  No parties found matching criteria.
                </td>
              </tr>
            ) : (
              filteredParties.map((p) => {
                const balance = p.currentBalance || 0;
                const isReceivable = balance > 0;
                const isPayable = balance < 0;

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      {p.displayName}
                      {p.legalName && p.legalName !== p.displayName && (
                        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>{p.legalName}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: p.partyType === 'customer' ? '#eff6ff' : '#f0fdf4',
                          color: p.partyType === 'customer' ? '#1d4ed8' : '#15803d',
                        }}
                      >
                        {p.partyType === 'customer' ? t('parties.badgeCustomer') : t('parties.badgeSupplier')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                      <div>{p.phone || '—'}</div>
                      {p.email && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{p.email}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#374151' }}>
                      {p.gstin || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>
                      <span
                        style={{
                          color: isReceivable ? '#d97706' : isPayable ? '#2563eb' : '#059669',
                        }}
                      >
                        ₹ {formatIndianNumber(Math.abs(balance), { decimals: 2 })}{' '}
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>
                          {isReceivable ? '(Dr / लेना)' : isPayable ? '(Cr / देना)' : '(Settled)'}
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPartyForLedger(p)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        {t('parties.viewLedger')}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modern Custom Modal: Add Party */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('parties.modalTitle')}
        subtitle="Register a new customer or supplier with GSTIN and opening Khata balance."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
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
              form="form-add-party"
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
              {isSubmitting ? 'Saving...' : t('btn.create')}
            </button>
          </>
        }
      >
        <form id="form-add-party" onSubmit={handleCreateParty} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              {t('parties.nameLabel')} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mahavir Hardware & Building Materials"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('parties.typeLabel')}
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
              >
                <option value="customer">Customer (ग्राहक)</option>
                <option value="supplier">Supplier / Vendor (आपूर्तिकर्ता)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('parties.phoneLabel')}
              </label>
              <input
                type="tel"
                placeholder="+91 98XXX XXXXX"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('parties.gstinLabel')}
              </label>
              <input
                type="text"
                placeholder="27AABCA1234F1Z8"
                value={newGstin}
                onChange={(e) => setNewGstin(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('parties.openingLabel')} (₹)
              </label>
              <input
                type="number"
                min="0"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Modern Custom Modal: Ledger Statement */}
      <Modal
        isOpen={Boolean(selectedPartyForLedger)}
        onClose={() => setSelectedPartyForLedger(null)}
        title={selectedPartyForLedger ? `Khata Statement: ${selectedPartyForLedger.displayName}` : 'Party Statement'}
        subtitle={`Current Ledger Balance: ₹ ${formatIndianNumber(Math.abs(selectedPartyForLedger?.currentBalance || 0), { decimals: 2 })} ${(selectedPartyForLedger?.currentBalance || 0) >= 0 ? 'Dr (Receivable)' : 'Cr (Payable)'}`}
        size="lg"
        footer={
          <button
            type="button"
            onClick={() => setSelectedPartyForLedger(null)}
            style={{
              padding: '8px 18px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t('btn.close')}
          </button>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Phone: </span>
                <strong>{selectedPartyForLedger?.phone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>GSTIN: </span>
                <strong>{selectedPartyForLedger?.gstin || 'Unregistered'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Khata Status: </span>
                <strong style={{ color: (selectedPartyForLedger?.currentBalance || 0) > 0 ? '#d97706' : '#059669' }}>
                  {(selectedPartyForLedger?.currentBalance || 0) === 0 ? 'Fully Settled' : 'Active Balance'}
                </strong>
              </div>
            </div>
          </div>
          <p style={{ margin: '8px 0', fontSize: '13px', color: '#475569' }}>
            Transactions are recorded atomically via double-entry debit/credit ledger entries.
          </p>
        </div>
      </Modal>
    </div>
  );
};
