import React from 'react';
import { SyncStatusBadge } from './SyncStatusBadge.js';

export interface LayoutProps {
  children: React.ReactNode;
  activeNav: string;
  onNavigate: (nav: string) => void;
  storeName?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeNav,
  onNavigate,
  storeName = 'Default Store',
}) => {
  const navItems = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'sales', label: '🧾 POS & Billing' },
    { id: 'products', label: '🏷️ Products & Catalog' },
    { id: 'inventory', label: '📦 Inventory & Stock' },
    { id: 'purchasing', label: '🛒 Purchasing & Bills' },
    { id: 'parties', label: '👥 Parties (Khata)' },
    { id: 'payments', label: '💳 Payments & Cash' },
    { id: 'expenses', label: '💸 Expenses' },
    { id: 'reports', label: '📈 Reports & Valuation' },
    { id: 'settings', label: '⚙️ Master Settings' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#60a5fa' }}>
            vyapaarKhata
          </h2>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{storeName}</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeNav === item.id ? 600 : 400,
                backgroundColor: activeNav === item.id ? '#374151' : 'transparent',
                color: activeNav === item.id ? '#ffffff' : '#d1d5db',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ paddingTop: '16px', borderTop: '1px solid #374151' }}>
          <SyncStatusBadge isPrimary={true} isOnline={true} pendingOutboxCount={0} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header
          style={{
            height: '60px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '16px', color: '#111827' }}>
            {navItems.find((n) => n.id === activeNav)?.label || 'Overview'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Branch: Main Yard (MY-01)</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              VK
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <section style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f9fafb' }}>
          {children}
        </section>
      </main>
    </div>
  );
};
