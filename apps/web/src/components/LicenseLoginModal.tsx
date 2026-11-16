import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.js';
import { useToast } from './Toast.js';

export interface LicenseLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseLoginModal: React.FC<LicenseLoginModalProps> = ({ isOpen, onClose }) => {
  const { licenseNumber, isLicenseLoggedIn, loginWithLicense, logoutLicense, storeType } = useStore();
  const toast = useToast();

  const [inputLicense, setInputLicense] = useState(licenseNumber || '');
  const [inputSecret, setInputSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handlePresetSelect = (lic: string, sec: string) => {
    setInputLicense(lic);
    setInputSecret(sec);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLicense.trim() || !inputSecret.trim()) {
      setErrorMessage('Please enter both License Number and Secret Key.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await loginWithLicense(inputLicense.trim(), inputSecret.trim());
      if (res.success) {
        toast.success(res.message || 'Authenticated successfully! 7-day token active.');
        onClose();
      } else {
        setErrorMessage(res.message || 'Invalid license number or secret key.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logoutLicense();
    toast.info('Logged out of license terminal session.');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>🔑</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                Store Terminal License Authentication
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
                7-Day JWT Token • Multi-Store Industry UI Routing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {isLicenseLoggedIn ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid #a7f3d0',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                <span>🔒</span> Active Licensed Terminal Session
              </div>
              <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
                License: <code style={{ color: '#0284c7' }}>{licenseNumber}</code>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Active UI Profile:{' '}
                <strong>
                  {storeType === 'jewellery'
                    ? '💍 Jewellery & Bullion Showroom'
                    : storeType === 'rental'
                    ? '🔁 Rental Store'
                    : '🏗️ Building Materials & Hardware'}
                </strong>
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '16px 0' }}>
                Your local terminal is verified with Central Cloud. Data automatically synchronizes
                every 10 minutes.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Switch License / Logout
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#1e40af',
                  marginBottom: '16px',
                  lineHeight: 1.5,
                }}
              >
                Enter your Central Cloud Store License credentials. On verification, a 7-day token is
                issued and the interface automatically configures the appropriate store mode.
              </div>

              {/* Demo Presets */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Quick Fill Store Presets:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() =>
                      handlePresetSelect('LIC-JW-2026-2002', 'sk_janardan_jw_live_48219')
                    }
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #fde68a',
                      backgroundColor: '#fffbeb',
                      color: '#92400e',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    💍 Janardan Swarn Kala<br />
                    <span style={{ fontSize: '10px', color: '#b45309' }}>LIC-JW-2026-2002</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handlePresetSelect('LIC-BM-2026-1001', 'sk_patel_bm_live_98374')
                    }
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    🏗️ Patel Materials<br />
                    <span style={{ fontSize: '10px', color: '#64748b' }}>LIC-BM-2026-1001</span>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  License Number (17 chars) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LIC-BM-2026-00001"
                  value={inputLicense}
                  onChange={(e) => setInputLicense(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Secret / Activation Key (24 chars) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. VK26-BM02-0001-A7B8-9F4D"
                  value={inputSecret}
                  onChange={(e) => setInputSecret(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {errorMessage && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '6px',
                    fontSize: '12px',
                    marginBottom: '14px',
                    border: '1px solid #fca5a5',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
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
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Verifying...' : 'Authenticate & Apply UI'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
