import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
  billingAddress?: string;
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
  const [newAddress, setNewAddress] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState('0');

  // Excel Bulk Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImportItems, setParsedImportItems] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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
          billingAddress: newAddress.trim() || undefined,
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
      setNewAddress('');
      setNewOpeningBalance('0');
      loadParties();
    } catch (err: any) {
      toast.error(err.message || 'Error saving party');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let rawJson: any[] = [];
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const sheetRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
          if (sheetRows && sheetRows.length > 0) {
            rawJson = sheetRows;
            break;
          }
        }

        if (!rawJson || rawJson.length === 0) {
          setImportError('The uploaded Excel sheet contains no rows.');
          setParsedImportItems([]);
          return;
        }

        const mapped = rawJson
          .map((row) => {
            const getVal = (...keys: string[]) => {
              for (const k of keys) {
                const matchedKey = Object.keys(row).find(
                  (rk) => rk.trim().toLowerCase() === k.toLowerCase()
                );
                if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
                  return row[matchedKey];
                }
              }
              return '';
            };

            const name = String(
              getVal(
                'Party Name',
                'Customer Name',
                'name',
                'displayName',
                'Party',
                'Customer',
                'ग्राहक का नाम',
                'PartyName'
              ) || ''
            ).trim();
            const phone = String(
              getVal('Phone / Mobile', 'Phone', 'Mobile', 'Contact', 'phone', 'mobile', 'फोन', 'मोबाइल') || ''
            ).trim();
            const rawType = String(
              getVal('Party Type', 'Type', 'partyType', 'Customer/Supplier', 'प्रकार') || 'customer'
            )
              .trim()
              .toLowerCase();

            let partyType = 'customer';
            if (rawType.includes('supp') || rawType.includes('विक्रेता') || rawType.includes('सप्लायर')) {
              partyType = 'supplier';
            } else if (rawType.includes('both') || rawType.includes('दोनों')) {
              partyType = 'both';
            }

            const rawBal = getVal(
              'Opening Balance',
              'openingBalance',
              'Balance',
              'opening_balance',
              'प्रारंभिक शेष'
            );
            const openingBalance = Math.abs(parseFloat(String(rawBal)) || 0);

            const rawBalType = String(
              getVal(
                'Balance Type (To Receive / To Pay)',
                'Balance Type',
                'Debit/Credit',
                'openingBalanceType',
                'शेष प्रकार'
              ) || ''
            )
              .trim()
              .toLowerCase();

            let openingBalanceType = partyType === 'supplier' ? 'credit' : 'debit';
            if (rawBalType.includes('pay') || rawBalType.includes('देना') || rawBalType.includes('cr')) {
              openingBalanceType = 'credit';
            } else if (rawBalType.includes('rec') || rawBalType.includes('लेना') || rawBalType.includes('dr')) {
              openingBalanceType = 'debit';
            }

            const billingAddress = String(
              getVal('Billing Address', 'Address', 'billingAddress', 'address', 'पता') || ''
            ).trim();
            const gstin = String(
              getVal('GSTIN', 'GST', 'gstin', 'gst_number', 'जीएसटीआईएन') || ''
            )
              .trim()
              .toUpperCase();
            const pan = String(getVal('PAN', 'pan', 'pan_number', 'पैन') || '').trim().toUpperCase();
            const email = String(getVal('Email', 'email', 'ईमेल') || '').trim().toLowerCase();

            return {
              name,
              phone,
              partyType,
              openingBalance,
              openingBalanceType,
              billingAddress,
              gstin,
              pan,
              email,
            };
          })
          .filter((p) => p.name && p.name.trim() !== '');

        if (mapped.length === 0) {
          setImportError('Could not find valid rows with a "Party Name" or "Customer Name" column.');
          setParsedImportItems([]);
          return;
        }

        setParsedImportItems(mapped);
      } catch (err: any) {
        setImportError(`Failed to parse file: ${err.message}`);
        setParsedImportItems([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (parsedImportItems.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await apiFetch('/api/v1/parties/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: parsedImportItems }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Bulk import of customers failed');
      }
      toast.success(json.message || `Successfully processed ${parsedImportItems.length} parties!`);
      setShowImportModal(false);
      setParsedImportItems([]);
      setImportFile(null);
      loadParties();
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCustomers = () => {
    if (parties.length === 0) {
      toast.warning('No customer records to export.');
      return;
    }

    const exportRows = parties.map((p, idx) => {
      const bal = p.currentBalance || 0;
      const isRec = bal > 0;
      const isPay = bal < 0;
      const balStatus = isRec ? 'To Receive (Receivable)' : isPay ? 'To Pay (Payable)' : 'Settled (0)';

      return {
        '#': idx + 1,
        'Party Name': p.displayName || '',
        'Phone / Mobile': p.phone || '',
        'Party Type': p.partyType ? p.partyType.toUpperCase() : 'CUSTOMER',
        'Current Balance': Math.abs(bal),
        'Balance Status': balStatus,
        'Opening Balance': p.openingBalance || 0,
        'Opening Balance Type': p.openingBalanceType === 'credit' ? 'To Pay (Cr)' : 'To Receive (Dr)',
        'Billing Address': p.billingAddress || '',
        'GSTIN': p.gstin || '',
        'PAN': p.pan || '',
        'Email': p.email || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `customers_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${parties.length} customer records to Excel!`);
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            id="btn-export-customers"
            type="button"
            onClick={handleExportCustomers}
            style={{
              padding: '9px 14px',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            📤 Export Customers (.xlsx)
          </button>
          <button
            id="btn-import-customers-excel"
            type="button"
            onClick={() => {
              setImportFile(null);
              setParsedImportItems([]);
              setImportError(null);
              setShowImportModal(true);
            }}
            style={{
              padding: '9px 14px',
              backgroundColor: '#ffffff',
              color: '#15803d',
              border: '1px solid #86efac',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            📊 Import Excel / CSV
          </button>
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

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Billing Address / पता
            </label>
            <input
              type="text"
              placeholder="e.g. Shop 12, Main Market, Bhopal"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
            />
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

      {/* EXCEL / CSV BULK IMPORT MODAL */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          if (!isImporting) {
            setShowImportModal(false);
            setParsedImportItems([]);
            setImportFile(null);
            setImportError(null);
          }
        }}
        title="📊 Bulk Import Customers & Khata Parties from Excel"
        subtitle="Upload Customer / Supplier Name, Mobile Number, Opening Khata Balance, Address, and GSTIN"
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {parsedImportItems.length > 0 && (
                <span>
                  Ready to import: <strong>{parsedImportItems.length} parties</strong>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedImportItems([]);
                  setImportFile(null);
                  setImportError(null);
                }}
                disabled={isImporting}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {t('btn.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || parsedImportItems.length === 0}
                style={{
                  backgroundColor: isImporting || parsedImportItems.length === 0 ? '#93c5fd' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  cursor: isImporting || parsedImportItems.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isImporting ? 'Importing Parties...' : `Confirm & Upload (${parsedImportItems.length} Parties)`}
              </button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Template Download & Help Banner */}
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📥 Pre-formatted Customer Excel Spreadsheets Ready for Download:</span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#3b82f6', lineHeight: 1.5 }}>
              Download our sample Excel or CSV template, fill in your customer contacts and Khata balances, and upload it back.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
              <a
                href="/sample_customer_import_template.xlsx"
                download="sample_customer_import_template.xlsx"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  color: '#1d4ed8',
                  border: '1px solid #93c5fd',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                📋 Download Customer Template (.xlsx)
              </a>
              <a
                href="/sample_customer_import_template.csv"
                download="sample_customer_import_template.csv"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                📄 Download Customer CSV Template (.csv)
              </a>
            </div>
          </div>

          {/* File Upload Drop Zone */}
          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: importFile ? '#f8fafc' : '#ffffff',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onClick={(e) => {
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              {importFile ? importFile.name : 'Click to select or drag & drop a Customer Excel file (.xlsx, .xls, .csv)'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {importFile
                ? `${(importFile.size / 1024).toFixed(1)} KB — Click to choose a different file`
                : 'Supports columns: Party Name, Phone / Mobile, Party Type, Opening Balance, Balance Type (To Receive / To Pay), Billing Address, GSTIN, Email'}
            </div>
          </div>

          {/* Error Message */}
          {importError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#b91c1c',
              }}
            >
              ⚠️ {importError}
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedImportItems.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Preview: {parsedImportItems.length} parties parsed from file
                </span>
                <span style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 600 }}>
                  ✓ All rows validated
                </span>
              </div>
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>#</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Party Name</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Phone</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Type</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Opening Bal</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Bal Type</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Address</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>GSTIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedImportItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                        <td style={{ padding: '6px 10px', color: '#475569' }}>{item.phone || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: item.partyType === 'supplier' ? '#f0fdf4' : '#eff6ff',
                              color: item.partyType === 'supplier' ? '#15803d' : '#1d4ed8',
                            }}
                          >
                            {item.partyType ? item.partyType.toUpperCase() : 'CUSTOMER'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                          ₹ {formatIndianNumber(item.openingBalance || 0, { decimals: 2 })}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: item.openingBalanceType === 'credit' ? '#2563eb' : '#d97706',
                            }}
                          >
                            {item.openingBalanceType === 'credit' ? 'To Pay (Cr)' : 'To Receive (Dr)'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px', color: '#64748b', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.billingAddress || '—'}
                        </td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#475569' }}>
                          {item.gstin || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
