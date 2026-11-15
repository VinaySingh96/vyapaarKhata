import React, { useState, useEffect } from 'react';
import { useI18n, Language } from '../i18n/index.js';
import { useToast } from '../components/Toast.js';
import { useStore } from '../context/StoreContext.js';
import { Modal } from '../components/Modal.js';

interface InventoryLocationItem {
  id: string;
  name: string;
  code: string;
  locationType?: string;
  isDefault: boolean;
  isActive: boolean;
}

export const SettingsScreen: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const toast = useToast();
  const { storeSettings, updateStoreSettings, isLoading } = useStore();

  const [storeName, setStoreName] = useState(storeSettings.storeName);
  const [gstin, setGstin] = useState(storeSettings.gstin || '');
  const [phone, setPhone] = useState(storeSettings.phone || '');
  const [address, setAddress] = useState(storeSettings.address || '');
  const [currency, setCurrency] = useState(storeSettings.currency || 'INR');
  const [isSaving, setIsSaving] = useState(false);

  // Godown / Warehouse Locations state
  const [locations, setLocations] = useState<InventoryLocationItem[]>([]);
  const [editingLocation, setEditingLocation] = useState<InventoryLocationItem | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locIsDefault, setLocIsDefault] = useState(true);
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  const loadLocations = () => {
    fetch('/api/v1/inventory/locations', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setLocations(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load locations:', err));
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleOpenEditLocation = (loc: InventoryLocationItem) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocCode(loc.code);
    setLocIsDefault(loc.isDefault);
    setShowLocationModal(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) {
      toast.error('Godown name cannot be empty');
      return;
    }
    setIsSavingLoc(true);
    try {
      const isNew = !editingLocation;
      const url = isNew ? '/api/v1/inventory/locations' : `/api/v1/inventory/locations/${editingLocation.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          name: locName.trim(),
          code: locCode.trim() || `WH-${Date.now().toString().slice(-4)}`,
          isDefault: locIsDefault,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to save godown');
      }
      toast.success(editingLocation ? 'Godown name updated successfully' : 'New godown added successfully');
      setShowLocationModal(false);
      loadLocations();
    } catch (err: any) {
      toast.error(err.message || 'Error updating godown');
    } finally {
      setIsSavingLoc(false);
    }
  };

  useEffect(() => {
    setStoreName(storeSettings.storeName);
    if (storeSettings.gstin) setGstin(storeSettings.gstin);
    if (storeSettings.phone) setPhone(storeSettings.phone);
    if (storeSettings.address) setAddress(storeSettings.address);
    if (storeSettings.currency) setCurrency(storeSettings.currency);
  }, [storeSettings]);

  const [units] = useState([
    { name: 'Pieces', symbol: 'pcs', dimension: 'quantity' },
    { name: 'Bag', symbol: 'bag', dimension: 'weight' },
    { name: 'Kilogram', symbol: 'kg', dimension: 'weight' },
    { name: 'Metric Ton', symbol: 'ton', dimension: 'weight' },
    { name: 'Liter', symbol: 'ltr', dimension: 'volume' },
    { name: 'Bucket / Tub', symbol: 'bucket', dimension: 'volume' },
    { name: 'Meter', symbol: 'mtr', dimension: 'length' },
  ]);

  const [taxes] = useState([
    { code: 'GST-EXEMPT', name: 'Exempt / Nil Rated', rate: '0%' },
    { code: 'GST-5', name: 'Essential Goods (5%)', rate: '5% (2.5% CGST + 2.5% SGST)' },
    { code: 'GST-12', name: 'Standard Low (12%)', rate: '12% (6% CGST + 6% SGST)' },
    { code: 'GST-18', name: 'Standard Commercial (18%)', rate: '18% (9% CGST + 9% SGST)' },
    { code: 'GST-28', name: 'Heavy Industrial / Luxury (28%)', rate: '28% (14% CGST + 14% SGST)' },
  ]);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.error('Store name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      await updateStoreSettings({
        storeName: storeName.trim(),
        tradeName: storeName.trim(),
        gstin: gstin.trim(),
        phone: phone.trim(),
        address: address.trim(),
        currency,
      });
      toast.success(t('settings.savedSuccess'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save store settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          {t('settings.title')}
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="vk-pos-layout">
        {/* Left Column: Business Profile Form */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
            {t('settings.storeProfile')}
          </h3>
          <form onSubmit={handleSaveStore}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
                {t('settings.storeName')}
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
                  {t('settings.storeGstin')}
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
                  {t('settings.contactPhone')}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
                {t('settings.billingAddress')}
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
                  {t('settings.defaultCurrency')}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                >
                  <option value="INR (₹)">Indian Rupee (INR - ₹)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
                  {t('settings.languagePref')}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', fontWeight: 600, color: '#1d4ed8' }}
                >
                  <option value="en">English (English)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                backgroundColor: isSaving ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? '...' : t('btn.save')}
            </button>
          </form>
        </div>

        {/* Right Column: Master Data (Units, Taxes & Godowns) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Godowns & Warehouses */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                🏢 Godowns & Warehouses (गोदाम)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingLocation(null);
                  setLocName('');
                  setLocCode(`WH-${Date.now().toString().slice(-4)}`);
                  setLocIsDefault(locations.length === 0);
                  setShowLocationModal(true);
                }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1d4ed8',
                  cursor: 'pointer',
                }}
              >
                + Add Godown
              </button>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#6b7280' }}>
              Configure physical storage locations where stock is inwarded, tracked, and dispatched.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {locations.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#9ca3af', fontStyle: 'italic', padding: '8px 0' }}>
                  No godowns registered yet. Click &quot;+ Add Godown&quot; above.
                </div>
              ) : (
                locations.map((loc) => (
                  <div
                    key={loc.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{loc.name}</span>
                        {loc.isDefault && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '10px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            Default Godown
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        Code: <span style={{ fontFamily: 'monospace' }}>{loc.code}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEditLocation(loc)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Edit Name
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GST Slabs */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>
              {t('settings.taxTitle')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              {taxes.map((tx) => (
                <div key={tx.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{tx.name}</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>{tx.rate}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Units */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>
              {t('settings.unitsTitle')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {units.map((u) => (
                <div
                  key={u.symbol}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: '#374151',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{u.name}</span> ({u.symbol})
                </div>
              ))}
            </div>
          </div>

          {/* Offline Sync & Runtime Information */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              🔌 Offline Architecture & Node Server
            </h4>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
              <div>• Engine: Fastify 5 Modular Monolith</div>
              <div>• Database: PostgreSQL 16 (Desktop) / SQLite WAL (Tablet)</div>
              <div>• Installation Mode: Primary Master Counter</div>
              <div>• Negative Stock Invariant: Strict Reject Active</div>
              <div>• Supported Languages: English (en), हिन्दी (hi)</div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT / ADD GODOWN MODAL */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title={editingLocation ? 'Edit Godown / Warehouse' : 'Add New Godown'}
        subtitle="Update godown name and code for storage tracking"
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              onClick={() => setShowLocationModal(false)}
              style={{
                padding: '8px 14px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="form-edit-location"
              disabled={isSavingLoc}
              style={{
                padding: '8px 16px',
                backgroundColor: isSavingLoc ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSavingLoc ? 'not-allowed' : 'pointer',
              }}
            >
              {isSavingLoc ? 'Saving...' : 'Save Godown'}
            </button>
          </div>
        }
      >
        <form id="form-edit-location" onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Godown / Warehouse Name *
            </label>
            <input
              type="text"
              required
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="e.g. Patel Main Godown, Waghodia Road Godown"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Godown Code *
            </label>
            <input
              type="text"
              required
              value={locCode}
              onChange={(e) => setLocCode(e.target.value)}
              placeholder="e.g. WH-GODOWN-01"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="cb-default-godown"
              checked={locIsDefault}
              onChange={(e) => setLocIsDefault(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="cb-default-godown" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
              Set as default godown for sales & purchasing
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
