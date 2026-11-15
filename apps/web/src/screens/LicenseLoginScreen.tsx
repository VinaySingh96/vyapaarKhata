import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.js';
import { useToast } from '../components/Toast.js';

export const LicenseLoginScreen: React.FC = () => {
  const { loginWithLicense, licenseNumber } = useStore();
  const toast = useToast();

  const [inputLicense, setInputLicense] = useState(licenseNumber || '');
  const [inputSecret, setInputSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePresetSelect = (lic: string, sec: string) => {
    setInputLicense(lic);
    setInputSecret(sec);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lic = inputLicense.trim();
    const sec = inputSecret.trim();

    if (!lic || !sec) {
      setErrorMessage('Please enter both Store License Number and Secret Key.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await loginWithLicense(lic, sec);
      if (res.success) {
        toast.success(res.message || 'Terminal unlocked successfully! Access token valid for 7 days.');
      } else {
        setErrorMessage(res.message || 'Invalid license number or secret key. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate with Central Cloud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          color: '#0f172a',
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            padding: '28px 24px 20px',
            color: '#ffffff',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              backgroundColor: '#2563eb',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 800,
              margin: '0 auto 12px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            VK
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '-0.025em' }}>
            vyapaarKhata POS & Store Activation
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Terminal is locked. Enter your Store License & Secret Key to continue.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              marginTop: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <span>🔒</span> Authentication Required
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '18px',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <div>
                <strong>Authentication Failed:</strong> {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="input-license-number"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.025em',
                }}
              >
                Store License Number *
              </label>
              <input
                id="input-license-number"
                type="text"
                value={inputLicense}
                onChange={(e) => setInputLicense(e.target.value.toUpperCase())}
                placeholder="e.g. LIC-BM-2026-1001 or LIC-JW-2026-2002"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: '14.5px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: '#0f172a',
                  letterSpacing: '0.05em',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor="input-secret-key"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em',
                  }}
                >
                  Store Secret Key *
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: '#2563eb',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  {showSecret ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>
              <input
                id="input-secret-key"
                type={showSecret ? 'text' : 'password'}
                value={inputSecret}
                onChange={(e) => setInputSecret(e.target.value)}
                placeholder="e.g. sk_patel_bm_live_98374"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: '#0f172a',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />
            </div>

            <button
              id="btn-unlock-terminal"
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '13px',
                backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>🔄 Validating with Central Cloud...</>
              ) : (
                <>🔓 Unlock Terminal & Login (7 Days)</>
              )}
            </button>
          </form>

          {/* Quick Preset Buttons for Developer & Demo testing */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #e2e8f0' }}>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              Demo / Fast-Fill Store Credentials:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                id="btn-preset-patel"
                onClick={() =>
                  handlePresetSelect('LIC-BM-2026-1001', 'sk_patel_bm_live_98374')
                }
                style={{
                  padding: '9px 10px',
                  textAlign: 'left',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#1e293b',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🏗️</span> Patel Building
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                  LIC-BM-2026-1001
                </div>
              </button>

              <button
                type="button"
                id="btn-preset-janardan"
                onClick={() =>
                  handlePresetSelect('LIC-JW-2026-2002', 'sk_janardan_jw_live_48219')
                }
                style={{
                  padding: '9px 10px',
                  textAlign: 'left',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#1e293b',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>💍</span> Janardan Swarn
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                  LIC-JW-2026-2002
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            fontSize: '11px',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>🛡️ HMAC-SHA256 JWT Security</span>
          <span>⏱️ 7-Day Validity</span>
          <span>⚡ 10-Min Auto-Sync</span>
        </div>
      </div>
    </div>
  );
};
