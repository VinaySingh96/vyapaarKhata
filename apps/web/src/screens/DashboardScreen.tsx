import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';

export interface DashboardScreenProps {
  onNavigate?: (nav: string) => void;
}

interface LiveMetrics {
  todaySales: number;
  todayInvoicesCount: number;
  totalReceivables: number;
  totalPayables: number;
  lowStockCount: number;
  totalProductsCount: number;
  totalStockValuation: number;
  recentInvoices: any[];
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);

  useEffect(() => {
    fetch('/api/v1/reports/dashboard', {
      headers: {
        'x-tenant-id': '00000000-0000-0000-0000-000000000001',
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setMetrics(json.data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch live dashboard metrics, using fallback:', err);
      });
  }, []);

  // Keyboard shortcut F2 for New Sales Bill
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        onNavigate?.('sales');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  const todaySalesVal = metrics ? `₹ ${metrics.todaySales.toLocaleString()}` : '₹ 2,242';
  const invoicesCount = metrics ? metrics.todayInvoicesCount : 1;
  const lowStockVal = metrics ? `${metrics.lowStockCount} ${t('dashboard.items')}` : `0 ${t('dashboard.items')}`;
  const receivablesVal = metrics ? `₹ ${metrics.totalReceivables.toLocaleString()}` : '₹ 0';
  const valuationVal = metrics ? `₹ ${metrics?.totalStockValuation?.toLocaleString()}` : '₹ 4,650';

  const kpis = [
    {
      label: t('dashboard.todaySales'),
      value: todaySalesVal,
      subtitle: t('dashboard.invoicesPosted', { count: invoicesCount }),
      color: '#10b981',
    },
    {
      label: t('dashboard.lowStock'),
      value: lowStockVal,
      subtitle: t('dashboard.lowStockSub'),
      color: metrics && metrics.lowStockCount > 0 ? '#ef4444' : '#10b981',
    },
    {
      label: t('dashboard.receivables'),
      value: receivablesVal,
      subtitle: t('dashboard.receivablesSub'),
      color: '#f59e0b',
    },
    {
      label: 'Inventory Valuation',
      value: valuationVal,
      subtitle: 'Total Godown Asset Value',
      color: '#3b82f6',
    },
  ];

  return (
    <div>
      <div className="vk-grid-4" style={{ marginBottom: '24px' }}>
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{kpi.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: kpi.color, margin: '8px 0 4px 0' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{kpi.subtitle}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>{t('dashboard.quickActions')}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            id="btn-quick-new-sale"
            onClick={() => onNavigate?.('sales')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
            }}
          >
            {t('dashboard.newBill')}
          </button>
          <button
            id="btn-quick-receive-payment"
            onClick={() => onNavigate?.('payments')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {t('dashboard.receivePayment')}
          </button>
          <button
            id="btn-quick-goods-inward"
            onClick={() => onNavigate?.('purchasing')}
            style={{
              padding: '12px 20px',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {t('dashboard.goodsInward')}
          </button>
        </div>
      </div>

      {metrics?.recentInvoices && metrics.recentInvoices.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Recent Sales Invoices</h3>
            <button
              onClick={() => onNavigate?.('sales')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to POS Billing →
            </button>
          </div>
          <div className="vk-table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280' }}>
                  <th style={{ padding: '8px 12px' }}>Invoice No</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Total Amount</th>
                  <th style={{ padding: '8px 12px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentInvoices.map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: inv.status === 'posted' ? '#ecfdf5' : '#fef3c7',
                          color: inv.status === 'posted' ? '#065f46' : '#92400e',
                        }}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>₹ {inv.grandTotal?.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                      {inv.postedAt ? new Date(inv.postedAt).toLocaleString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
