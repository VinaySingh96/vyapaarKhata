import React, { useState } from 'react';

export const ReportsScreen: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'valuation' | 'pnl' | 'gst'>('valuation');

  const stockValuation = [
    { name: 'UltraTech Portland Cement (50kg)', sku: 'CEM-PP-50KG', qty: 35, unit: 'bags', unitCost: 310, totalValue: 10850 },
    { name: 'TMT Steel Fe550D Rebar 12mm', sku: 'TMT-12MM-KG', qty: 18, unit: 'kg', unitCost: 56, totalValue: 1008 },
    { name: 'Asian Paints Apex Ultima White (20L)', sku: 'PNT-APX-20L', qty: 8, unit: 'buckets', unitCost: 3850, totalValue: 30800 },
    { name: 'River Sand Fine Washed', sku: 'SND-WSH-TON', qty: 0, unit: 'tons', unitCost: 1200, totalValue: 0 },
  ];

  const totalInventoryValuation = stockValuation.reduce((acc, s) => acc + s.totalValue, 0);

  return (
    <div style={{ padding: '4px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
          📈 Reports, Valuation & Business Analytics
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
          Real-time stock valuation (FIFO/Moving Average), estimated P&L, receivables aging, and GST output/input summaries.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveReportTab('valuation')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeReportTab === 'valuation' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeReportTab === 'valuation' ? '#2563eb' : '#6b7280',
            fontWeight: activeReportTab === 'valuation' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Stock Valuation Report
        </button>
        <button
          onClick={() => setActiveReportTab('pnl')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeReportTab === 'pnl' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeReportTab === 'pnl' ? '#2563eb' : '#6b7280',
            fontWeight: activeReportTab === 'pnl' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Profit & Loss Summary
        </button>
        <button
          onClick={() => setActiveReportTab('gst')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            borderBottom: activeReportTab === 'gst' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeReportTab === 'gst' ? '#2563eb' : '#6b7280',
            fontWeight: activeReportTab === 'gst' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          GST GSTR-1 / GSTR-3B Tax Summary
        </button>
      </div>

      {/* Report 1: Stock Valuation */}
      {activeReportTab === 'valuation' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>TOTAL STOCK VALUATION</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                ₹{totalInventoryValuation.toLocaleString()}
              </div>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>VALUATION METHOD</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: '6px' }}>
                Weighted Average / FIFO
              </div>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>ITEMS VALUED</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                {stockValuation.length} Items
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Product Name</th>
                  <th style={{ padding: '12px 16px' }}>SKU</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>On Hand</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Unit Purchase Cost</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Inventory Value</th>
                </tr>
              </thead>
              <tbody>
                {stockValuation.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{s.name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#6b7280' }}>{s.sku}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{s.qty} {s.unit}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4b5563' }}>₹{s.unitCost.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>
                      ₹{s.totalValue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: P&L Summary */}
      {activeReportTab === 'pnl' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px', maxWidth: '650px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Estimated Income Statement (P&L)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontWeight: 600 }}>Total Sales Revenue</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>₹42,480.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
              <span>Less: Cost of Goods Sold (COGS)</span>
              <span>-₹30,000.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
              <span style={{ fontWeight: 700, color: '#15803d' }}>Gross Profit Margin (29.4%)</span>
              <span style={{ fontWeight: 700, color: '#15803d' }}>₹12,480.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
              <span>Less: Operating Expenses (Utilities, Tea, Cartage)</span>
              <span>-₹7,150.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #111827', fontSize: '16px' }}>
              <span style={{ fontWeight: 800 }}>Net Estimated Operating Profit</span>
              <span style={{ fontWeight: 800, color: '#2563eb' }}>₹5,330.00</span>
            </div>
          </div>
        </div>
      )}

      {/* Report 3: GST Summary */}
      {activeReportTab === 'gst' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#111827', fontWeight: 700 }}>Output Tax (Sales Invoices)</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Taxable Sales:</span>
              <span style={{ fontWeight: 600 }}>₹36,000.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>CGST (9%):</span>
              <span style={{ fontWeight: 600 }}>₹3,240.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>SGST (9%):</span>
              <span style={{ fontWeight: 600 }}>₹3,240.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '8px', fontWeight: 700 }}>
              <span>Total Output Tax Collected:</span>
              <span style={{ color: '#dc2626' }}>₹6,480.00</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#111827', fontWeight: 700 }}>Input Tax Credit (ITC - Purchases)</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Taxable Purchases:</span>
              <span style={{ fontWeight: 600 }}>₹30,000.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Input CGST (9%):</span>
              <span style={{ fontWeight: 600 }}>₹2,700.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Input SGST (9%):</span>
              <span style={{ fontWeight: 600 }}>₹2,700.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '8px', fontWeight: 700 }}>
              <span>Total Eligible ITC:</span>
              <span style={{ color: '#16a34a' }}>₹5,400.00</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
