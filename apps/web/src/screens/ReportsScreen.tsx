import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { useToast } from '../components/Toast.js';

interface StockValuationItem {
  variantId: string;
  productName: string;
  quantity: number;
  valuation: number;
}

export const ReportsScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [activeReportTab, setActiveReportTab] = useState<'valuation' | 'pnl' | 'gst'>('valuation');
  const [valuationData, setValuationData] = useState<StockValuationItem[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    // 1. Fetch stock valuation
    fetch('/api/v1/reports/stock-valuation', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setValuationData(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load valuation report:', err));

    // 2. Fetch dashboard metrics
    fetch('/api/v1/reports/dashboard', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setDashboardMetrics(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load dashboard metrics:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalInventoryValuation = valuationData.reduce((acc, s) => acc + (s.valuation || 0), 0);
  const totalPhysicalQuantity = valuationData.reduce((acc, s) => acc + (s.quantity || 0), 0);

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            {t('reports.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('reports.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          style={{
            padding: '8px 14px',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh Data'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Godown Stock Valuation</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
            ₹ {totalInventoryValuation.toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Physical On-Hand Quantity</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {totalPhysicalQuantity} units
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Today's Total Sales</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            ₹ {(dashboardMetrics?.todaySales || 0).toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Customer Receivables (उधारी)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
            ₹ {(dashboardMetrics?.totalReceivables || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveReportTab('valuation')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeReportTab === 'valuation' ? '#2563eb' : '#ffffff',
            color: activeReportTab === 'valuation' ? '#ffffff' : '#374151',
          }}
        >
          {t('reports.inventoryValuation')}
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('pnl')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeReportTab === 'pnl' ? '#2563eb' : '#ffffff',
            color: activeReportTab === 'pnl' ? '#ffffff' : '#374151',
          }}
        >
          {t('reports.pnlSummary')}
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('gst')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeReportTab === 'gst' ? '#2563eb' : '#ffffff',
            color: activeReportTab === 'gst' ? '#ffffff' : '#374151',
          }}
        >
          {t('reports.gstSummary')}
        </button>
      </div>

      {/* Report Content */}
      {activeReportTab === 'valuation' && (
        <div className="vk-table-responsive">
          <table>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Item Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Current Balance</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Inventory Asset Valuation</th>
              </tr>
            </thead>
            <tbody>
              {valuationData.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                valuationData.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      {s.productName}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      {s.quantity} units
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                      ₹ {s.valuation.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeReportTab === 'pnl' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Profit & Loss Financial Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              <span style={{ color: '#4b5563' }}>Gross Sales Revenue:</span>
              <strong style={{ color: '#059669' }}>₹ {(dashboardMetrics?.todaySales || 0).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              <span style={{ color: '#4b5563' }}>Customer Outstanding Khata:</span>
              <strong>₹ {(dashboardMetrics?.totalReceivables || 0).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              <span style={{ color: '#4b5563' }}>Stock Assets In Godown:</span>
              <strong style={{ color: '#2563eb' }}>₹ {totalInventoryValuation.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'gst' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>GST Filing & Tax Breakdown (GSTR-1)</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px 0' }}>
            Harmonized GST compliance with automatic 18% CGST/SGST split and HSN classification.
          </p>
          <div className="vk-table-responsive">
            <table>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tax Slab</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Taxable Turnover</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>CGST (9%)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>SGST (9%)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Tax Liability</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>Standard Rate (18%)</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>₹ {(dashboardMetrics?.todaySales || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>₹ {((dashboardMetrics?.todaySales || 0) * 0.09).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>₹ {((dashboardMetrics?.todaySales || 0) * 0.09).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                    ₹ {((dashboardMetrics?.todaySales || 0) * 0.18).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
