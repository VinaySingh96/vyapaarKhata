import React, { useState } from 'react';
import { Party, PartyLedgerEntry } from '@vyapaarkhata/domain';

export const PartiesScreen: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'all' | 'customer' | 'supplier'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<Party | null>(null);

  const [parties, setParties] = useState<Party[]>([
    {
      id: 'pt-1',
      tenantId: 't1',
      partyType: 'customer',
      displayName: 'Acme Construction Pvt Ltd',
      legalName: 'Acme Construction Private Limited',
      phone: '+91 98765 43210',
      email: 'accounts@acmeconst.com',
      gstin: '27AABCA1234F1Z8',
      pan: 'AABCA1234F',
      openingBalance: 0,
      openingBalanceType: 'debit',
      currentBalance: 42480, // Receivable
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pt-2',
      tenantId: 't1',
      partyType: 'supplier',
      displayName: 'UltraTech Cement Distributors',
      legalName: 'UltraTech Cement Distributors Hub',
      phone: '+91 98111 22334',
      email: 'orders@utdist.com',
      gstin: '27AACCA5678B1Z2',
      pan: 'AACCA5678B',
      openingBalance: 0,
      openingBalanceType: 'credit',
      currentBalance: -35400, // Payable
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pt-3',
      tenantId: 't1',
      partyType: 'customer',
      displayName: 'Shree Sai Hardware',
      phone: '+91 97654 32109',
      openingBalance: 0,
      openingBalanceType: 'debit',
      currentBalance: 12500, // Receivable
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pt-4',
      tenantId: 't1',
      partyType: 'supplier',
      displayName: 'Kamdhenu Steel Rolling Mills',
      phone: '+91 98222 33445',
      gstin: '27AAACK1122D1Z4',
      openingBalance: 0,
      openingBalanceType: 'credit',
      currentBalance: 0, // Fully settled
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [ledgerEntries] = useState<Record<string, PartyLedgerEntry[]>>({
    'pt-1': [
      {
        id: 'le-1',
        tenantId: 't1',
        partyId: 'pt-1',
        entryType: 'debit',
        amount: 42480,
        referenceDocumentType: 'sales_invoice',
        referenceDocumentId: 'INV-10045',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    'pt-2': [
      {
        id: 'le-2',
        tenantId: 't1',
        partyId: 'pt-2',
        entryType: 'credit',
        amount: 35400,
        referenceDocumentType: 'purchase_bill',
        referenceDocumentId: 'BILL-0034',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  });

  // Add Party Form State
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [partyType, setPartyType] = useState<'customer' | 'supplier' | 'both'>('customer');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  const filteredParties = parties.filter((p) => {
    const matchesType =
      selectedType === 'all' ||
      p.partyType === selectedType ||
      p.partyType === 'both';
    const matchesSearch =
      p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone?.includes(searchTerm) || false) ||
      (p.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    return matchesType && matchesSearch;
  });

  const totalReceivables = parties
    .filter((p) => (p.currentBalance || 0) > 0)
    .reduce((acc, p) => acc + (p.currentBalance || 0), 0);

  const totalPayables = parties
    .filter((p) => (p.currentBalance || 0) < 0)
    .reduce((acc, p) => acc + Math.abs(p.currentBalance || 0), 0);

  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newParty: Party = {
      id: `pt-${Date.now()}`,
      tenantId: 't1',
      partyType,
      displayName: name,
      legalName: legalName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      gstin: gstin || undefined,
      pan: pan || undefined,
      openingBalance: parseFloat(openingBalance) || 0,
      openingBalanceType: 'debit',
      currentBalance: parseFloat(openingBalance) || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setParties([newParty, ...parties]);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setGstin('');
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            👥 Parties & Khata Directory
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            Manage Customer accounts, Supplier accounts, GST details, credit limits, and running balance ledgers.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
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
          + Add New Party
        </button>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>TOTAL PARTIES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {parties.length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>TOTAL RECEIVABLE (KHATA IN)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#065f46', marginTop: '4px' }}>
            ₹{totalReceivables.toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#fff1f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#be123c' }}>TOTAL PAYABLE (SUPPLIER DUES)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#9f1239', marginTop: '4px' }}>
            ₹{totalPayables.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="🔍 Search party by business name, phone, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'customer', 'supplier'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedType === t ? '#2563eb' : '#d1d5db',
                backgroundColor: selectedType === t ? '#eff6ff' : '#ffffff',
                color: selectedType === t ? '#1d4ed8' : '#4b5563',
                fontSize: '13px',
                fontWeight: selectedType === t ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t === 'all' ? 'All Parties' : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Party Name</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px' }}>Contact Phone</th>
              <th style={{ padding: '12px 16px' }}>GSTIN / PAN</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net Balance</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Ledger</th>
            </tr>
          </thead>
          <tbody>
            {filteredParties.map((p) => {
              const bal = p.currentBalance || 0;
              const isReceivable = bal > 0;
              const isPayable = bal < 0;

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{p.displayName}</div>
                    {p.legalName && <div style={{ fontSize: '11px', color: '#6b7280' }}>{p.legalName}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: p.partyType === 'customer' ? '#e0f2fe' : '#fef3c7',
                        color: p.partyType === 'customer' ? '#0369a1' : '#b45309',
                        textTransform: 'uppercase',
                      }}
                    >
                      {p.partyType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>{p.phone || '—'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563' }}>
                    <div>{p.gstin || '—'}</div>
                    {p.pan && <div style={{ fontSize: '11px', color: '#9ca3af' }}>PAN: {p.pan}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                    {bal === 0 ? (
                      <span style={{ color: '#6b7280' }}>₹0 (Settled)</span>
                    ) : isReceivable ? (
                      <span style={{ color: '#059669' }}>+₹{bal.toLocaleString()} (Receivable)</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>-₹{Math.abs(bal).toLocaleString()} (Payable)</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedPartyForLedger(p)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        backgroundColor: '#ffffff',
                        color: '#2563eb',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      📖 Statement
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Party Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', width: '500px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Add New Party</h3>
            <form onSubmit={handleAddParty}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bharat Hardware Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Party Type</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as any)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                  >
                    <option value="customer">Customer (Buyer)</option>
                    <option value="supplier">Supplier (Vendor)</option>
                    <option value="both">Both (Customer & Supplier)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>GSTIN</label>
                  <input
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>PAN Number</label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Opening Balance (₹)</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Statement Modal */}
      {selectedPartyForLedger && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  📖 Khata Statement: {selectedPartyForLedger.displayName}
                </h3>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Party Type: {selectedPartyForLedger.partyType.toUpperCase()} | Net Balance: ₹{(selectedPartyForLedger.currentBalance || 0).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedPartyForLedger(null)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}
              >
                ✕
              </button>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '10px 12px' }}>Date</th>
                    <th style={{ padding: '10px 12px' }}>Document / Ref</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Debit (₹)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledgerEntries[selectedPartyForLedger.id] || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                        No transactions recorded in this ledger period.
                      </td>
                    </tr>
                  ) : (
                    (ledgerEntries[selectedPartyForLedger.id] || []).map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#1d4ed8' }}>
                          {entry.referenceDocumentType}: {entry.referenceDocumentId}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: entry.entryType === 'debit' ? '#dc2626' : '#6b7280' }}>
                          {entry.entryType === 'debit' ? `₹${entry.amount.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: entry.entryType === 'credit' ? '#16a34a' : '#6b7280' }}>
                          {entry.entryType === 'credit' ? `₹${entry.amount.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedPartyForLedger(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
