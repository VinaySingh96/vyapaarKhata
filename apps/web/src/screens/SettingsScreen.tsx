import React, { useState } from 'react';

export const SettingsScreen: React.FC = () => {
  const [storeName, setStoreName] = useState('vyapaarKhata Wholesale & Retail Depot');
  const [gstin, setGstin] = useState('27AABCA1234F1Z8');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('Plot No. 42, MIDC Industrial Area, Pune, Maharashtra 411018');
  const [currency, setCurrency] = useState('INR (₹)');

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

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    alert('✓ Store profile settings updated successfully.');
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          ⚙️ Master Settings & Configuration
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
          Configure retail store profile, multi-warehouse locations, units of measurement, and GST tax slabs.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Business Profile Form */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
            🏪 Store & Business Profile
          </h3>
          <form onSubmit={handleSaveStore}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Store GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Billing Address</label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
              >
                <option value="INR (₹)">Indian Rupee (INR - ₹)</option>
              </select>
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save Store Profile
            </button>
          </form>
        </div>

        {/* Right Column: Master Data (Units & Taxes) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* GST Slabs */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>
              🏛️ Configured GST Tax Slabs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              {taxes.map((t) => (
                <div key={t.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>{t.name}</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>{t.rate}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Units */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>
              ⚖️ Units of Measurement (UOM)
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
