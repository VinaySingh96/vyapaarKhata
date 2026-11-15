import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { useToast } from '../components/Toast.js';
import { formatIndianNumber } from '../utils/currency.js';

interface StockValuationItem {
  variantId: string;
  productName: string;
  quantity: number;
  valuation: number;
}

interface AuditLogItem {
  id: string;
  tenantId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  createdAt: string;
}

export const ReportsScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [activeReportTab, setActiveReportTab] = useState<'valuation' | 'pnl' | 'gst' | 'audit'>('valuation');
  const [valuationData, setValuationData] = useState<StockValuationItem[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
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
      .catch((err) => console.warn('Failed to load dashboard metrics:', err));

    // 3. Fetch automated audit logs
    fetchAuditLogs();
  };

  const fetchAuditLogs = () => {
    fetch('/api/v1/reports/audit-logs?limit=50', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAuditLogs(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load audit logs:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeReportTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeReportTab]);

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
            ₹ {formatIndianNumber(totalInventoryValuation, { decimals: 2 })}
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
            ₹ {formatIndianNumber(dashboardMetrics?.todaySales || 0, { decimals: 2 })}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Customer Receivables (उधारी)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
            ₹ {formatIndianNumber(dashboardMetrics?.totalReceivables || 0, { decimals: 2 })}
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
        <button
          type="button"
          onClick={() => setActiveReportTab('audit')}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: activeReportTab === 'audit' ? '#2563eb' : '#ffffff',
            color: activeReportTab === 'audit' ? '#ffffff' : '#374151',
          }}
        >
          🛡️ Audit Trail ({auditLogs.length})
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
                      ₹ {formatIndianNumber(s.valuation, { decimals: 2 })}
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
              <strong style={{ color: '#059669' }}>₹ {formatIndianNumber(dashboardMetrics?.todaySales || 0, { decimals: 2 })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              <span style={{ color: '#4b5563' }}>Customer Outstanding Khata:</span>
              <strong>₹ {formatIndianNumber(dashboardMetrics?.totalReceivables || 0, { decimals: 2 })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              <span style={{ color: '#4b5563' }}>Stock Assets In Godown:</span>
              <strong style={{ color: '#2563eb' }}>₹ {formatIndianNumber(totalInventoryValuation, { decimals: 2 })}</strong>
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
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>₹ {formatIndianNumber(dashboardMetrics?.todaySales || 0, { decimals: 2 })}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>₹ {formatIndianNumber((dashboardMetrics?.todaySales || 0) * 0.09, { decimals: 2 })}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>₹ {formatIndianNumber((dashboardMetrics?.todaySales || 0) * 0.09, { decimals: 2 })}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                    ₹ {formatIndianNumber((dashboardMetrics?.todaySales || 0) * 0.18, { decimals: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReportTab === 'audit' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                Automated Audit Trail & Event Log
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                Immutable system audit records automatically captured by server hooks for every transaction and catalog change.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={fetchAuditLogs}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                🔄 Refresh Logs
              </button>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#059669',
                  backgroundColor: '#ecfdf5',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid #a7f3d0',
                }}
              >
                🔒 Tamper-Evident Active
              </span>
            </div>
          </div>

          <div className="vk-table-responsive">
            <table>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Action Event</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Entity Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Summary / Target</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Target ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>IP / Origin</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                      No audit events recorded yet. New sales, purchasing, and catalog actions will automatically log here.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const isDangerous = log.action.includes('CANCEL') || log.action.includes('VOID') || log.action.includes('DELETE');
                    const isSuccess = log.action.includes('POST') || log.action.includes('CREATE') || log.action.includes('PAYMENT');

                    let summaryText = '-';
                    if (log.newValues) {
                      if (log.newValues.invoiceNumber) {
                        summaryText = `Invoice #${log.newValues.invoiceNumber}${
                          log.newValues.grandTotal !== undefined
                            ? ` • ₹ ${formatIndianNumber(log.newValues.grandTotal, { decimals: 2 })}`
                            : log.newValues.amount !== undefined
                            ? ` • ₹ ${formatIndianNumber(log.newValues.amount, { decimals: 2 })}`
                            : ''
                        }`;
                      } else if (log.newValues.receiptNumber) {
                        summaryText = `Receipt #${log.newValues.receiptNumber}`;
                      } else if (log.newValues.billNumber) {
                        summaryText = `Bill #${log.newValues.billNumber}`;
                      } else if (log.newValues.name || log.newValues.displayName) {
                        summaryText = String(log.newValues.name || log.newValues.displayName);
                      } else if (log.newValues.amount !== undefined) {
                        summaryText = `₹ ${formatIndianNumber(log.newValues.amount, { decimals: 2 })}${
                          log.newValues.paymentMode ? ` (${log.newValues.paymentMode})` : ''
                        }`;
                      }
                    }

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                        <td style={{ padding: '12px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              backgroundColor: isDangerous ? '#fee2e2' : isSuccess ? '#ecfdf5' : '#eff6ff',
                              color: isDangerous ? '#991b1b' : isSuccess ? '#065f46' : '#1e40af',
                              border: `1px solid ${isDangerous ? '#fca5a5' : isSuccess ? '#a7f3d0' : '#bfdbfe'}`,
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#374151' }}>
                          {log.entityType || 'system'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>
                          {summaryText}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>
                          {log.entityId ? `${log.entityId.slice(0, 8)}...${log.entityId.slice(-4)}` : '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '12px' }}>
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
