import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.js';
import { useToast } from '../components/Toast.js';

export interface LicenseStatusScreenProps {
  status: string;
  onRecheck: () => Promise<{ status: string; message?: string }>;
}

export const LicenseStatusScreen: React.FC<LicenseStatusScreenProps> = ({ status, onRecheck }) => {
  const { storeSettings, tenantId, licenseNumber, logoutLicense, setSimulatedTenantStatus } = useStore();
  const toast = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [activePreview, setActivePreview] = useState<string>(status);

  // Sync active preview with incoming status prop if it changes
  React.useEffect(() => {
    setActivePreview(status);
  }, [status]);

  const effectiveStatus = activePreview || status || 'suspended';

  const handleRecheck = async () => {
    setIsChecking(true);
    try {
      const result = await onRecheck();
      if (result.status === 'active' || result.status === 'trial') {
        toast.success(result.message || 'Store account is active! Unlocking terminal...');
      } else {
        toast.info(result.message || `Store status is still "${result.status}".`);
      }
    } catch {
      toast.error('Unable to reach server. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  // Status configuration details
  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'expired':
        return {
          title: 'Software License Expired',
          titleHi: 'सॉफ्टवेयर लाइसेंस समाप्त हो गया है',
          badgeText: 'LICENSE EXPIRED / लाइसेंस समाप्त',
          badgeBg: '#fee2e2',
          badgeColor: '#dc2626',
          headerGradient: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)',
          accentColor: '#dc2626',
          icon: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ),
          subtitle: 'Your active subscription license has expired. Billing & sync paused.',
          description:
            'The software license term associated with this store has ended. While local records remain securely archived, new invoices, receipts, and multi-device synchronization require an active software license.',
          resolutionStep:
            'Please contact your organization administrator or VyapaarKhata Sales to renew the license subscription.',
          primaryActionText: 'Recheck License Status',
        };

      case 'cancelled':
        return {
          title: 'Subscription Cancelled',
          titleHi: 'सदस्यता रद्द कर दी गई है',
          badgeText: 'SUBSCRIPTION CANCELLED / सदस्यता रद्द',
          badgeBg: '#f1f5f9',
          badgeColor: '#475569',
          headerGradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
          accentColor: '#475569',
          icon: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          ),
          subtitle: 'The subscription for this store account has been discontinued.',
          description:
            'This store account is marked as cancelled in the central cloud management plane. Access to transactional billing is discontinued until reactivated.',
          resolutionStep:
            'If this cancellation was in error, please reach out to central cloud administration to restore account standing.',
          primaryActionText: 'Recheck Account Status',
        };

      case 'revoked':
        return {
          title: 'Terminal Device Revoked',
          titleHi: 'टर्मिनल पहुंच रद्द कर दी गई है',
          badgeText: 'DEVICE REVOKED / उपकरण प्रतिबंधित',
          badgeBg: '#ede9fe',
          badgeColor: '#6d28d9',
          headerGradient: 'linear-gradient(135deg, #5b21b6 0%, #2e1065 100%)',
          accentColor: '#7c3aed',
          icon: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <line x1="2" y1="3" x2="22" y2="17" stroke="#ef4444" strokeWidth="2.5" />
            </svg>
          ),
          subtitle: 'This POS terminal installation is no longer authorized.',
          description:
            'The counter device license for this laptop or tablet has been revoked by the system administrator. Re-authorization from the Central Admin console is required to continue.',
          resolutionStep:
            'Ask your administrator to approve this terminal in Central Admin -> Installations, or log in with a valid counter license.',
          primaryActionText: 'Check Device Authorization',
        };

      case 'suspended':
      default:
        return {
          title: 'Store Account Suspended',
          titleHi: 'स्टोर खाता निलंबित है',
          badgeText: 'ACCOUNT SUSPENDED / खाता निलंबित',
          badgeBg: '#fef3c7',
          badgeColor: '#b45309',
          headerGradient: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
          accentColor: '#d97706',
          icon: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ),
          subtitle: 'POS Terminal access paused by administrator in Central Console.',
          description:
            'This store account has been placed on administrative hold in the Central Admin dashboard. While in suspended status, sales invoice generation, stock modifications, and cloud synchronization are temporarily locked.',
          resolutionStep:
            'Please contact your organization administrator or VyapaarKhata support to reactivate the account in the Central Admin console.',
          primaryActionText: 'Recheck Account Status',
        };
    }
  };

  const config = getStatusConfig(effectiveStatus);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          color: '#0f172a',
        }}
      >
        {/* Banner Header */}
        <div
          style={{
            background: config.headerGradient,
            padding: '32px 24px 24px',
            color: '#ffffff',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Circular Glowing Icon */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            {config.icon}
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              backgroundColor: 'rgba(0,0,0,0.3)',
              color: '#ffffff',
              marginBottom: '10px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {config.badgeText}
          </div>

          <h1
            style={{
              margin: '0 0 4px',
              fontSize: '24px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {config.title}
          </h1>

          <div
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.85)',
              fontWeight: 500,
            }}
          >
            {config.titleHi}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 24px' }}>
          {/* Description Callout */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: config.badgeBg,
              border: `1px solid ${config.badgeColor}33`,
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: config.badgeColor,
                marginBottom: '6px',
              }}
            >
              {config.subtitle}
            </div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.55' }}>
              {config.description}
            </div>
          </div>

          {/* Store Account Identity Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '12px',
              }}
            >
              Terminal & Tenant Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Store Name</span>
                <strong style={{ color: '#0f172a' }}>{storeSettings.storeName || 'Patel Centring Store'}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>License Key</span>
                <code
                  style={{
                    backgroundColor: '#e2e8f0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#0f172a',
                  }}
                >
                  {licenseNumber || 'LIC-PC-2026-3001'}
                </code>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Tenant ID</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#475569',
                    wordBreak: 'break-all',
                  }}
                >
                  {tenantId}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Current Status</span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: config.badgeBg,
                    color: config.badgeColor,
                    textTransform: 'capitalize',
                  }}
                >
                  {effectiveStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleRecheck}
              disabled={isChecking}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: isChecking ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isChecking ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              {isChecking ? (
                <>
                  <svg
                    style={{ animation: 'spin 1s linear infinite' }}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Checking License Status with Central Cloud...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  {config.primaryActionText}
                </>
              )}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={logoutLicense}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Switch Account / Login
              </button>

              <a
                href="http://127.0.0.1:5000/admin"
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Central Admin HQ
              </a>
            </div>
          </div>

          {/* Support Helpline Footer */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            Need help? Contact VyapaarKhata Cloud Support:
            <div style={{ marginTop: '4px', fontWeight: 600, color: '#334155' }}>
              📞 +91 98765 43210 &nbsp;|&nbsp; ✉️ support@vyapaarkhata.com
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Admin State Switcher Bar */}
      <div
        style={{
          marginTop: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          color: '#cbd5e1',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ fontWeight: 600, color: '#94a3b8' }}>Preview Screen States:</span>
        {(['suspended', 'expired', 'cancelled', 'revoked'] as const).map((st) => (
          <button
            key={st}
            onClick={() => {
              setActivePreview(st);
              setSimulatedTenantStatus(st);
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: effectiveStatus === st ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: effectiveStatus === st ? '#0284c7' : 'transparent',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {st}
          </button>
        ))}

        <button
          onClick={() => {
            setActivePreview('active');
            setSimulatedTenantStatus('active');
          }}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid #22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            color: '#86efac',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: '6px',
          }}
        >
          Unlock (Active)
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
