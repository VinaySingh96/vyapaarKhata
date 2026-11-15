import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.js';
import { useStore } from '../context/StoreContext.js';
import { useToast } from './Toast.js';

export interface DailyMetalRates {
  gold24k: number;    // ₹ per gram (999 pure)
  gold22k: number;    // ₹ per gram (916 hallmark)
  gold18k: number;    // ₹ per gram (750 hallmark)
  gold14k: number;    // ₹ per gram (585 hallmark)
  silver999: number;  // ₹ per gram (999 pure)
  silver925: number;  // ₹ per gram (925 sterling)
  diamondVVS: number; // ₹ per carat (VVS-GH)
  diamondVS: number;  // ₹ per carat (VS-SI)
  lastUpdated: string;
}

const DEFAULT_RATES: DailyMetalRates = {
  gold24k: 7850,
  gold22k: 7200,
  gold18k: 5890,
  gold14k: 4580,
  silver999: 95,
  silver925: 88,
  diamondVVS: 65000,
  diamondVS: 50000,
  lastUpdated: 'Today, 10:30 AM',
};

const STORAGE_KEY = 'vk_jewellery_daily_rates';

export const DailyMetalRatesBar: React.FC<{ isJewelleryShop?: boolean }> = ({ isJewelleryShop: explicitJewelleryProp }) => {
  const { storeSettings } = useStore();
  const toast = useToast();

  const isJewelleryShop =
    explicitJewelleryProp !== undefined
      ? explicitJewelleryProp
      : (
          storeSettings.storeName?.toLowerCase().includes('jewel') ||
          storeSettings.tradeName?.toLowerCase().includes('jewel') ||
          (typeof window !== 'undefined' && (window.location.port === '3003' || window.location.port === '4003'))
        );

  const [rates, setRates] = useState<DailyMetalRates>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_RATES;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form draft state for modal
  const [form24k, setForm24k] = useState<string>(rates.gold24k.toString());
  const [form22k, setForm22k] = useState<string>(rates.gold22k.toString());
  const [form18k, setForm18k] = useState<string>(rates.gold18k.toString());
  const [form14k, setForm14k] = useState<string>(rates.gold14k.toString());
  const [formSilver999, setFormSilver999] = useState<string>(rates.silver999.toString());
  const [formSilver925, setFormSilver925] = useState<string>(rates.silver925.toString());
  const [formDiamondVVS, setFormDiamondVVS] = useState<string>(rates.diamondVVS.toString());
  const [formDiamondVS, setFormDiamondVS] = useState<string>(rates.diamondVS.toString());

  // Listen for storage / cross-tab updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setRates(JSON.parse(e.newValue));
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!isJewelleryShop) {
    return null; // Zero footprint for non-jewellery shops like Patel Building Materials
  }

  const handleOpenModal = () => {
    setForm24k(rates.gold24k.toString());
    setForm22k(rates.gold22k.toString());
    setForm18k(rates.gold18k.toString());
    setForm14k(rates.gold14k.toString());
    setFormSilver999(rates.silver999.toString());
    setFormSilver925(rates.silver925.toString());
    setFormDiamondVVS(rates.diamondVVS.toString());
    setFormDiamondVS(rates.diamondVS.toString());
    setIsModalOpen(true);
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

    const updated: DailyMetalRates = {
      gold24k: parseFloat(form24k) || rates.gold24k,
      gold22k: parseFloat(form22k) || rates.gold22k,
      gold18k: parseFloat(form18k) || rates.gold18k,
      gold14k: parseFloat(form14k) || rates.gold14k,
      silver999: parseFloat(formSilver999) || rates.silver999,
      silver925: parseFloat(formSilver925) || rates.silver925,
      diamondVVS: parseFloat(formDiamondVVS) || rates.diamondVVS,
      diamondVS: parseFloat(formDiamondVS) || rates.diamondVS,
      lastUpdated: formattedDate,
    };

    setRates(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('vk_metal_rates_updated', { detail: updated }));
    } catch (err) {
      console.warn('Could not persist rates to localStorage:', err);
    }

    toast.success('Daily gold, silver & diamond rates updated successfully!');
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Static Top Rates Ribbon in Header Whitespace */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          backgroundColor: '#fefce8',
          border: '1px solid #fef08a',
          borderRadius: '8px',
          fontSize: '12px',
          boxShadow: '0 1px 2px rgba(234, 179, 8, 0.08)',
          maxWidth: '100%',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* Gold 24K */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '13px' }}>🟡</span>
          <span style={{ color: '#854d0e', fontWeight: 600 }}>24K:</span>
          <span style={{ color: '#713f12', fontWeight: 700 }}>₹{rates.gold24k.toLocaleString()}/g</span>
        </div>

        <span style={{ color: '#eab308', opacity: 0.6 }}>|</span>

        {/* Gold 22K (916) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#b45309', fontWeight: 600 }}>22K (916):</span>
          <span style={{ color: '#78350f', fontWeight: 700 }}>₹{rates.gold22k.toLocaleString()}/g</span>
        </div>

        <span style={{ color: '#eab308', opacity: 0.6 }}>|</span>

        {/* Silver 999 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '12px' }}>⚪</span>
          <span style={{ color: '#475569', fontWeight: 600 }}>Silver:</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>₹{rates.silver999.toLocaleString()}/g</span>
        </div>

        <span style={{ color: '#eab308', opacity: 0.6 }}>|</span>

        {/* Diamond */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '12px' }}>💎</span>
          <span style={{ color: '#0369a1', fontWeight: 600 }}>Diamond:</span>
          <span style={{ color: '#0c4a6e', fontWeight: 700 }}>₹{(rates.diamondVVS / 1000).toFixed(0)}k/ct</span>
        </div>

        {/* Configure Button */}
        <button
          type="button"
          onClick={handleOpenModal}
          title={`Last updated: ${rates.lastUpdated}. Click to configure today's metal rates.`}
          style={{
            marginLeft: '4px',
            padding: '3px 9px',
            backgroundColor: '#ca8a04',
            color: '#ffffff',
            border: 'none',
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = '#a16207')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = '#ca8a04')}
        >
          <span>⚙️</span>
          <span>Daily Rates</span>
        </button>
      </div>

      {/* Modal for Configuring Daily Metal Rates */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Daily Metal & Bullion Rates (दैनिक धातु दरें)"
        size="lg"
      >
        <form onSubmit={handleSaveRates}>
          <div style={{ marginBottom: '16px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
            Configure today's benchmark gold, silver and diamond selling rates for <strong>Shree Narayan Jewellers</strong>.
            All invoices and counter quotations can reference these rates. Standard <strong>3% GST</strong> applies at billing.
          </div>

          {/* Section 1: Gold Rates */}
          <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px' }}>🟡</span>
              <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#92400e' }}>
                Gold Rates (सोने के भाव - प्रति ग्राम / 10 ग्राम)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                  24K Pure Gold 999 (₹ / Gram)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1000"
                    required
                    value={form24k}
                    onChange={(e) => setForm24k(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: '6px', border: '1px solid #fde68a', fontWeight: 700, fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', display: 'block' }}>
                  = ₹{((parseFloat(form24k) || 0) * 10).toLocaleString()} per 10g (Tola)
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                  22K Standard 916 Hallmark (₹ / Gram)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1000"
                    required
                    value={form22k}
                    onChange={(e) => setForm22k(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: '6px', border: '1px solid #fde68a', fontWeight: 700, fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', display: 'block' }}>
                  = ₹{((parseFloat(form22k) || 0) * 10).toLocaleString()} per 10g (Tola)
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                  18K Hallmarked 750 (₹ / Gram)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1000"
                    required
                    value={form18k}
                    onChange={(e) => setForm18k(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: '6px', border: '1px solid #fde68a', fontWeight: 600, fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>
                  Standard for diamond jewellery
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                  14K Hallmarked 585 (₹ / Gram)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1000"
                    required
                    value={form14k}
                    onChange={(e) => setForm14k(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: '6px', border: '1px solid #fde68a', fontWeight: 600, fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>
                  Modern lightweight office wear
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Silver Rates */}
          <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px' }}>⚪</span>
              <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#334155' }}>
                Silver Rates (चांदी के भाव - प्रति ग्राम / प्रति किलो)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Fine Silver 999 Bullion (₹ / Gram)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="10"
                    required
                    value={formSilver999}
                    onChange={(e) => setFormSilver999(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  = ₹{((parseFloat(formSilver999) || 0) * 1000).toLocaleString()} per 1 Kg Bar
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  925 Sterling Silver Ornaments (₹ / Gram)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="10"
                    required
                    value={formSilver925}
                    onChange={(e) => setFormSilver925(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Standard for silver payal, bichhiya & ornaments
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Diamond Rates */}
          <div style={{ marginBottom: '24px', padding: '14px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px' }}>💎</span>
              <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#075985' }}>
                Diamond Benchmark Rates (हीरे के भाव - प्रति कैरट)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0369a1', marginBottom: '4px' }}>
                  VVS - GH Quality (₹ / Carat)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
                  <input
                    type="number"
                    step="500"
                    min="5000"
                    required
                    value={formDiamondVVS}
                    onChange={(e) => setFormDiamondVVS(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: '6px', border: '1px solid #bae6fd', fontWeight: 700, fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', display: 'block' }}>
                  Premium clean diamonds (1 Ct = 0.20g / 100 Cent)
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0369a1', marginBottom: '4px' }}>
                  VS - SI Quality (₹ / Carat)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8', fontSize: '13px' }}>₹</span>
                  <input
                    type="number"
                    step="500"
                    min="5000"
                    required
                    value={formDiamondVS}
                    onChange={(e) => setFormDiamondVS(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: '6px', border: '1px solid #bae6fd', fontWeight: 700, fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', display: 'block' }}>
                  Commercial grade diamonds
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 22px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#ca8a04',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(202, 138, 4, 0.25)',
              }}
            >
              Save Today's Rates
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
