import React, { useState } from 'react';
import { SyncStatusBadge } from './SyncStatusBadge.js';
import { useI18n, Language } from '../i18n/index.js';

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
  storeName,
}) => {
  const { t, language, setLanguage } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard') },
    { id: 'sales', label: t('nav.sales') },
    { id: 'products', label: t('nav.products') },
    { id: 'inventory', label: t('nav.inventory') },
    { id: 'purchasing', label: t('nav.purchasing') },
    { id: 'parties', label: t('nav.parties') },
    { id: 'payments', label: t('nav.payments') },
    { id: 'expenses', label: t('nav.expenses') },
    { id: 'reports', label: t('nav.reports') },
    { id: 'settings', label: t('nav.settings') },
  ];

  const currentStore = storeName || (language === 'hi' ? 'मुख्य व्यापार केंद्र' : 'Default Store');

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  const activeTitle = navItems.find((n) => n.id === activeNav)?.label || t('nav.dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f9fafb' }}>
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 90,
          }}
        />
      )}

      {/* Sidebar (Desktop Permanent, Mobile Slide-out Drawer) */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          zIndex: 100,
          transition: 'transform 0.25s ease-in-out',
          position: window.innerWidth <= 1024 ? 'fixed' : 'relative',
          top: 0,
          bottom: 0,
          left: 0,
          transform: window.innerWidth > 1024 || isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: isMobileMenuOpen ? '4px 0 24px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#60a5fa' }}>
              {t('header.brand')}
            </h2>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{currentStore}</div>
          </div>
          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '18px',
              cursor: 'pointer',
              display: window.innerWidth <= 1024 ? 'block' : 'none',
            }}
          >
            ✕
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: activeNav === item.id ? 600 : 400,
                backgroundColor: activeNav === item.id ? '#374151' : 'transparent',
                color: activeNav === item.id ? '#ffffff' : '#d1d5db',
                transition: 'background-color 0.15s',
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
        {/* Topbar */}
        <header
          style={{
            height: '60px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Hamburger Button for Mobile/Tablet */}
            <button
              type="button"
              id="btn-mobile-menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              style={{
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#374151',
              }}
            >
              ☰
            </button>

            <div style={{ fontWeight: 600, fontSize: '15.5px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeTitle}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Language Switcher */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
              }}
            >
              <span style={{ fontSize: '13px' }}>🌐</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                aria-label={t('header.language')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="en">EN</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>

            <span className="vk-hide-mobile" style={{ fontSize: '12px', color: '#6b7280' }}>
              {t('header.branch')}
            </span>

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
                fontSize: '12.5px',
                flexShrink: 0,
              }}
            >
              VK
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <section
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: window.innerWidth <= 768 ? '12px' : '20px',
            backgroundColor: '#f9fafb',
          }}
        >
          {children}
        </section>
      </main>
    </div>
  );
};
