import React from 'react';

export const DashboardScreen: React.FC = () => {
  const kpis = [
    { label: "Today's Sales", value: '₹ 48,250', subtitle: '18 Invoices posted', color: '#10b981' },
    { label: 'Low Stock Alerts', value: '3 Items', subtitle: 'At or below reorder level', color: '#ef4444' },
    { label: 'Outstanding Receivables', value: '₹ 1,12,400', subtitle: '14 Customers pending', color: '#f59e0b' },
    { label: 'Offline Sync Queue', value: '0 Pending', subtitle: '100% Up to date', color: '#3b82f6' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
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
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + New Sales Bill (F2)
          </button>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Record Payment Received
          </button>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Goods Inward (GRN)
          </button>
        </div>
      </div>
    </div>
  );
};
