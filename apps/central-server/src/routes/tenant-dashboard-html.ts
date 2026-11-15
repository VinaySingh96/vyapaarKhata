export function renderTenantDashboardPage(tenantId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Store Dashboard - vyapaarKhata Central Cloud</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --bg-main: #f8fafc;
      --bg-card: #ffffff;
      --border: #e2e8f0;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --success: #16a34a;
      --warning: #eab308;
      --danger: #dc2626;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-family);
      background-color: var(--bg-main);
      color: var(--text-main);
      line-height: 1.5;
    }
    header {
      background: #0f172a;
      color: #fff;
      padding: 0.85rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #334155;
    }
    .brand { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: inherit; }
    .brand-icon {
      background: #2563eb;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
    }
    .brand-title { font-size: 1.15rem; font-weight: 700; }
    .header-actions { display: flex; align-items: center; gap: 1rem; }
    .container {
      max-width: 1280px;
      margin: 1.5rem auto;
      padding: 0 1.5rem;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
    }
    .breadcrumb a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    .breadcrumb a:hover { text-decoration: underline; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: #ffffff; border-color: var(--border); color: var(--text-main); }
    .btn-secondary:hover { background: #f1f5f9; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-danger:hover { background: #dc2626; }
    .btn-success { background: #10b981; color: white; }
    .btn-success:hover { background: #059669; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .badge-active { background: #dcfce7; color: #15803d; }
    .badge-suspended { background: #fee2e2; color: #b91c1c; }
    .badge-trial { background: #fef3c7; color: #b45309; }
    .badge-plan { background: #e0e7ff; color: #4338ca; }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.825rem; }
    th {
      background: #f8fafc;
      text-align: left;
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
      font-weight: 600;
    }
    td {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--border);
    }
    tr:last-child td { border-bottom: none; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    @media (max-width: 900px) {
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
      .grid-2 { grid-template-columns: 1fr; }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 460px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }
    .modal-header {
      padding: 1.25rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }
    .modal-body { padding: 1.25rem; }
    .modal-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
    }

    /* Toast Notification System */
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.08);
      animation: toastSlideIn 0.25s ease forwards;
      max-width: 380px;
    }
    @keyframes toastSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast-success { background: #0f172a; color: #34d399; border: 1.5px solid #059669; }
    .toast-error { background: #0f172a; color: #f87171; border: 1.5px solid #dc2626; }
    .toast-info { background: #0f172a; color: #38bdf8; border: 1.5px solid #0284c7; }
  </style>
</head>
<body>
  <header>
    <a href="/admin" class="brand">
      <div class="brand-icon">VK</div>
      <div>
        <div class="brand-title">vyapaarKhata Central Cloud</div>
        <div style="font-size: 0.725rem; color: #94a3b8;">Central Multi-Store Intelligence & Control Plane</div>
      </div>
    </a>
    <div class="header-actions">
      <a href="/admin" class="btn btn-secondary btn-sm" style="background: rgba(255,255,255,0.12); color: white; border: 1px solid rgba(255,255,255,0.2);">
        ← Back to Tenants Directory
      </a>
      <div style="font-size: 0.8rem; color: #94a3b8; font-family: monospace;" id="pageTime"></div>
    </div>
  </header>

  <div class="container" id="pageContainer">
    <div style="text-align: center; padding: 4rem 1rem; color: #64748b;">
      <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔄 Loading Tenant Dashboard...</div>
      <div>Fetching real-time financial telemetry from Central Sync Inbox</div>
    </div>
  </div>

  <!-- Reusable Confirmation Modal -->
  <div class="modal-overlay" id="customConfirmModal">
    <div class="modal-content">
      <div class="modal-header">
        <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a; display: flex; align-items: center; gap: 8px;" id="confirmModalTitle">
          Confirm Action
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeConfirmModal()" style="border:none; background:none; font-size:1.1rem; cursor:pointer; color: #64748b;">✕</button>
      </div>
      <div class="modal-body">
        <p id="confirmModalMessage" style="font-size: 0.925rem; color: #475569; line-height: 1.6; margin: 0;"></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeConfirmModal()">Cancel</button>
        <button type="button" class="btn btn-primary" id="confirmModalActionBtn" onclick="executeConfirmModal()">Confirm</button>
      </div>
    </div>
  </div>

  <!-- Global Floating Toast Notification Container -->
  <div id="toastContainer" class="toast-container"></div>

  <script>
    const tenantId = "${tenantId}";

    setInterval(() => {
      document.getElementById('pageTime').textContent = new Date().toLocaleTimeString();
    }, 1000);
    document.getElementById('pageTime').textContent = new Date().toLocaleTimeString();

    // Toast Notification Dispatcher
    function showToast(message, type = 'success') {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'toast-item toast-' + type;
      const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
      toast.innerHTML = \`<span style="font-size: 1.1rem; font-weight: 800;">\${icon}</span><span>\${message}</span>\`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        toast.style.transform = 'translateY(12px)';
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    }

    // Custom Confirmation Modal Helper
    let pendingConfirmAction = null;
    function openConfirmModal(title, message, confirmText, btnClass, onConfirm) {
      document.getElementById('confirmModalTitle').innerHTML = title;
      document.getElementById('confirmModalMessage').textContent = message;
      const confirmBtn = document.getElementById('confirmModalActionBtn');
      confirmBtn.textContent = confirmText || 'Confirm';
      confirmBtn.className = 'btn ' + (btnClass || 'btn-primary');
      pendingConfirmAction = onConfirm;
      document.getElementById('customConfirmModal').style.display = 'flex';
    }
    function closeConfirmModal() {
      document.getElementById('customConfirmModal').style.display = 'none';
      pendingConfirmAction = null;
    }
    function executeConfirmModal() {
      if (pendingConfirmAction) {
        pendingConfirmAction();
      }
      closeConfirmModal();
    }

    function copyToClipboard(text, label) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(label + ' copied to clipboard! 📋', 'success');
      }).catch(() => {
        showToast('Failed to copy to clipboard', 'error');
      });
    }

    function toggleStatus(newStatus) {
      const isSuspended = newStatus === 'suspended';
      openConfirmModal(
        isSuspended ? '⚠️ Suspend Store?' : '✅ Activate Store?',
        isSuspended
          ? 'Are you sure you want to suspend this store? POS terminals for this store will not be able to authenticate or sync.'
          : 'Are you sure you want to activate this store? POS terminals will be able to connect and sync immediately.',
        isSuspended ? 'Yes, Suspend Store' : 'Yes, Activate Store',
        isSuspended ? 'btn-danger' : 'btn-success',
        async () => {
          try {
            const res = await fetch('/api/v1/admin/tenants/' + tenantId + '/status', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
            });
            const json = await res.json();
            if (json.success) {
              showToast('Store status updated to ' + newStatus, 'success');
              loadDashboard();
            } else {
              showToast('Error: ' + (json.error?.message || 'Update failed'), 'error');
            }
          } catch (err) {
            showToast('Action failed: ' + err.message, 'error');
          }
        }
      );
    }

    async function loadDashboard() {
      const container = document.getElementById('pageContainer');
      try {
        const [tenantRes, dashRes] = await Promise.all([
          fetch('/api/v1/admin/tenants/' + tenantId),
          fetch('/api/v1/admin/tenants/' + tenantId + '/dashboard')
        ]);

        const tJson = await tenantRes.json();
        const dJson = await dashRes.json();

        if (!tJson.success || !tJson.data) {
          container.innerHTML = \`
            <div class="card" style="text-align: center; padding: 3rem;">
              <h2 style="color: #dc2626; margin-bottom: 1rem;">Tenant Not Found</h2>
              <p style="color: #64748b; margin-bottom: 1.5rem;">Could not find tenant with ID: <code>\${tenantId}</code></p>
              <a href="/admin" class="btn btn-primary">← Return to Tenants Directory</a>
            </div>
          \`;
          return;
        }

        const t = tJson.data;
        const d = dJson.success && dJson.data ? dJson.data : {
          todaySales: 0,
          todayEarnings: 0,
          thisMonthSales: 0,
          thisMonthEarnings: 0,
          totalSales: 0,
          totalEarnings: 0,
          totalSyncEvents: 0,
          totalInvoicesCount: 0,
          totalPaymentsCount: 0,
          eventsByType: {},
          dailyBreakdown: [],
          monthlyBreakdown: []
        };

        const isJewel = t.storeType === 'jewellery';
        document.title = t.name + ' - Store Dashboard - vyapaarKhata';

        // Daily rows
        let dailyRowsHtml = (d.dailyBreakdown && d.dailyBreakdown.length > 0) ? d.dailyBreakdown.map(row => \`
          <tr>
            <td style="font-weight: 600; font-family: monospace;">\${row.date}</td>
            <td><span class="badge" style="background:#f1f5f9; color:#475569;">\${row.invoicesCount} invoices</span></td>
            <td style="color: #047857; font-weight: 700; text-align: right;">₹ \${Number(row.sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td><span class="badge" style="background:#faf5ff; color:#7e22ce;">\${row.paymentsCount} receipts</span></td>
            <td style="color: #7e22ce; font-weight: 700; text-align: right;">₹ \${Number(row.earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        \`).join('') : '<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: #94a3b8;">No daily transactions recorded yet</td></tr>';

        // Monthly rows
        let monthlyRowsHtml = (d.monthlyBreakdown && d.monthlyBreakdown.length > 0) ? d.monthlyBreakdown.map(row => \`
          <tr>
            <td style="font-weight: 600; font-family: monospace;">\${row.month}</td>
            <td><span class="badge" style="background:#f1f5f9; color:#475569;">\${row.invoicesCount} invoices</span></td>
            <td style="color: #047857; font-weight: 700; text-align: right;">₹ \${Number(row.sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td><span class="badge" style="background:#faf5ff; color:#7e22ce;">\${row.paymentsCount} receipts</span></td>
            <td style="color: #7e22ce; font-weight: 700; text-align: right;">₹ \${Number(row.earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        \`).join('') : '<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: #94a3b8;">No monthly transactions recorded yet</td></tr>';

        // Events breakdown
        let eventsBreakdownHtml = Object.entries(d.eventsByType || {}).map(([evt, count]) => \`
          <span style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem; font-family: monospace;">
            <strong>\${evt}</strong>: <span style="color:#2563eb; font-weight:700;">\${count}</span>
          </span>
        \`).join(' ') || '<span style="color:#94a3b8; font-size: 0.85rem;">No sync events recorded yet</span>';

        // Terminals
        let instHtml = (t.installations && t.installations.length > 0) ? t.installations.map(i => \`
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #1e293b;">💻 \${i.deviceName} <span style="color: #64748b; font-weight: 400; font-size: 0.8rem;">(\${i.installationType})</span></div>
              <div style="font-size: 0.775rem; color: #64748b; margin-top: 2px;">
                HW Fingerprint: <code>\${i.hardwareFingerprint || 'Auto-Detected Device'}</code> • App Version: <strong>v\${i.appVersion || '0.1.0'}</strong>
              </div>
              <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
                Last Heartbeat: <strong>\${i.lastHeartbeatAt ? new Date(i.lastHeartbeatAt).toLocaleString() : 'Never'}</strong> • Last Synced Seq: #\${i.lastSequenceSynced || 0}
              </div>
            </div>
            <div>
              <span class="badge badge-\${i.status}">\${i.status}</span>
            </div>
          </div>
        \`).join('') : '<div style="color: #94a3b8; font-size: 0.875rem; padding: 1rem; text-align: center; background: #f8fafc; border-radius: 6px;">No local store terminals registered yet.</div>';

        container.innerHTML = \`
          <!-- Breadcrumb -->
          <div class="breadcrumb">
            <a href="/admin">🏢 Tenants Directory</a>
            <span>/</span>
            <span style="color: #0f172a; font-weight: 600;">\${t.name}</span>
          </div>

          <!-- Hero Store Header Card -->
          <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; background: #ffffff; border-left: 5px solid \${isJewel ? '#d97706' : '#2563eb'};">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <span style="font-size: 2.25rem;">\${isJewel ? '💍' : '🏗️'}</span>
              <div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a;">\${t.name}</h1>
                  <span class="badge badge-\${t.status}">\${t.status}</span>
                  <span class="badge badge-plan">\${t.plan}</span>
                </div>
                <div style="font-size: 0.825rem; color: #64748b; margin-top: 4px;">
                  \${t.legalName ? t.legalName + ' • ' : ''}GSTIN: <strong>\${t.gstin || 'Unregistered'}</strong> • Terminals: <strong>\${t.installations?.length || 0}</strong> / \${t.maxInstallations}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <button class="btn btn-secondary btn-sm" onclick="loadDashboard()">🔄 Refresh Live Data</button>
              \${t.status === 'active' ?
                '<button class="btn btn-danger btn-sm" onclick="toggleStatus(\\'suspended\\')">Suspend Store</button>' :
                '<button class="btn btn-success btn-sm" onclick="toggleStatus(\\'active\\')">Activate Store</button>'
              }
            </div>
          </div>

          <!-- Tenant License & Cloud Auth Credentials (Dark Card) -->
          <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 10px -2px rgba(0,0,0,0.15);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: center;">
              <div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">STORE LICENSE NUMBER</div>
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
                  <span style="font-family: monospace; font-size: 1.35rem; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(56,189,248,0.3);">
                    \${t.licenseNumber || 'UNASSIGNED'}
                  </span>
                  \${t.licenseNumber ? '<button class="btn btn-sm" style="background: rgba(255,255,255,0.2); color: white; border: none; font-size: 0.8rem;" onclick="copyToClipboard(\\'' + t.licenseNumber + '\\', \\'License Number\\')">📋 Copy License</button>' : ''}
                </div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">LIVE SECRET KEY (STORE AUTH TOKEN)</div>
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
                  <span style="font-family: monospace; font-size: 1.05rem; color: #facc15; background: rgba(250, 204, 21, 0.15); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(250,204,21,0.3);">
                    \${t.secretKey || 'NO SECRET KEY'}
                  </span>
                  \${t.secretKey ? '<button class="btn btn-sm" style="background: rgba(255,255,255,0.2); color: white; border: none; font-size: 0.8rem;" onclick="copyToClipboard(\\'' + t.secretKey + '\\', \\'Secret Key\\')">📋 Copy Key</button>' : ''}
                </div>
              </div>
            </div>
            <div style="margin-top: 1.25rem; font-size: 0.825rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
              <span>🔑 Token Validity: <strong style="color: #e2e8f0;">7 Days (HMAC-SHA256 JWT with Refresh)</strong></span>
              <span>🎨 Target POS UI Profile: <strong style="color: #38bdf8;">\${isJewel ? '💍 Jewellery & Bullion Specialized POS' : '🏗️ Building Materials & Hardware POS'}</strong></span>
              <span>⚡ Central Cloud Sync: <strong style="color: #4ade80;">Active (10-minute automated worker)</strong></span>
            </div>
          </div>

          <!-- Financial Performance Dashboard (Daily & Monthly Cards) -->
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
              <span>📈 Store Financial Performance (Daily & Monthly Telemetry)</span>
              <span style="font-size: 0.8rem; color: #64748b; font-weight: 400;">Computed directly from Central Sync Inbox</span>
            </div>

            <!-- 4 Grid Cards -->
            <div class="grid-4" style="margin-bottom: 1rem;">
              <!-- Today Sales -->
              <div style="background: #ffffff; border: 1px solid #a7f3d0; border-top: 4px solid #10b981; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size: 0.75rem; color: #065f46; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">📅 Today\\'s Sales</div>
                <div style="font-size: 1.85rem; font-weight: 800; color: #047857; margin-top: 6px;">
                  ₹ \${Number(d.todaySales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style="font-size: 0.775rem; color: #059669; margin-top: 4px;">\${d.todayInvoicesCount !== undefined ? d.todayInvoicesCount + ' Invoices posted • ' : ''}Daily net billed volume</div>
              </div>

              <!-- Today Earnings -->
              <div style="background: #ffffff; border: 1px solid #e9d5ff; border-top: 4px solid #8b5cf6; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size: 0.75rem; color: #6b21a8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">💵 Today\\'s Earnings</div>
                <div style="font-size: 1.85rem; font-weight: 800; color: #7e22ce; margin-top: 6px;">
                  ₹ \${Number(d.todayEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style="font-size: 0.775rem; color: #9333ea; margin-top: 4px;">Daily cash / UPI collections</div>
              </div>

              <!-- This Month Sales -->
              <div style="background: #ffffff; border: 1px solid #bfdbfe; border-top: 4px solid #3b82f6; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size: 0.75rem; color: #1e40af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">📆 This Month\\'s Sales</div>
                <div style="font-size: 1.85rem; font-weight: 800; color: #1d4ed8; margin-top: 6px;">
                  ₹ \${Number(d.thisMonthSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style="font-size: 0.775rem; color: #2563eb; margin-top: 4px;">\${d.thisMonthInvoicesCount !== undefined ? d.thisMonthInvoicesCount + ' Invoices posted • ' : ''}Monthly billing volume</div>
              </div>

              <!-- This Month Earnings -->
              <div style="background: #ffffff; border: 1px solid #fed7aa; border-top: 4px solid #f97316; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size: 0.75rem; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">💳 This Month\\'s Earnings</div>
                <div style="font-size: 1.85rem; font-weight: 800; color: #c2410c; margin-top: 6px;">
                  ₹ \${Number(d.thisMonthEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style="font-size: 0.775rem; color: #ea580c; margin-top: 4px;">Monthly net collections</div>
              </div>
            </div>

            <!-- All Time Totals Banner -->
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
              <div>
                <span style="font-size: 0.8rem; color: #64748b;">Cumulative Billed Sales:</span>
                <span style="font-size: 1.15rem; font-weight: 800; color: #047857; margin-left: 6px;">
                  ₹ \${Number(d.totalSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span style="font-size: 0.8rem; color: #64748b; margin-left: 4px;">(\${d.totalInvoicesCount} invoices)</span>
              </div>
              <div>
                <span style="font-size: 0.8rem; color: #64748b;">Cumulative Collections / Earnings:</span>
                <span style="font-size: 1.15rem; font-weight: 800; color: #7e22ce; margin-left: 6px;">
                  ₹ \${Number(d.totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span style="font-size: 0.8rem; color: #64748b; margin-left: 4px;">(\${d.totalPaymentsCount} receipts)</span>
              </div>
              <div style="font-size: 0.8rem; color: #64748b;">
                Net Balance Outstanding: <strong style="color: #e11d48;">₹ \${Math.max(0, Number(d.totalSales || 0) - Number(d.totalEarnings || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>

          <!-- Historical Ledger Performance (Daily & Monthly Tables) -->
          <div class="grid-2" style="margin-bottom: 1.5rem;">
            <!-- Daily Performance Table -->
            <div class="card" style="margin-bottom: 0;">
              <div class="card-title">
                <span>📅 Daily Performance Ledger</span>
                <span style="font-size: 0.75rem; font-weight: 400; color: #64748b;">Recent Days</span>
              </div>
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoices</th>
                      <th style="text-align: right;">Sales</th>
                      <th>Receipts</th>
                      <th style="text-align: right;">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${dailyRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Monthly Performance Table -->
            <div class="card" style="margin-bottom: 0;">
              <div class="card-title">
                <span>📆 Monthly Performance Ledger</span>
                <span style="font-size: 0.75rem; font-weight: 400; color: #64748b;">All Calendar Months</span>
              </div>
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Invoices</th>
                      <th style="text-align: right;">Sales</th>
                      <th>Receipts</th>
                      <th style="text-align: right;">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${monthlyRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Sync Telemetry Overview -->
          <div class="card">
            <div class="card-title">
              <span>⚡ Sync Volume & Data Transferred</span>
              <span style="font-size: 0.8rem; color: #64748b; font-weight: 400;">
                Last Cloud Sync: <strong>\${d.lastSyncedAt ? new Date(d.lastSyncedAt).toLocaleString() : 'Never'}</strong>
              </span>
            </div>
            <div style="font-size: 0.875rem; color: #475569; margin-bottom: 1rem;">
              Total Ingested Events: <strong style="color: #2563eb; font-size: 1.1rem;">\${d.totalSyncEvents}</strong> 
              (\${d.totalInvoicesCount} invoices, \${d.totalPaymentsCount} settlements)
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              \${eventsBreakdownHtml}
            </div>
          </div>

          <!-- Registered Terminals & Store Details Grid -->
          <div class="grid-2">
            <!-- Terminals -->
            <div class="card" style="margin-bottom: 0;">
              <div class="card-title">
                <span>💻 Registered Store Terminals</span>
                <span style="font-size: 0.8rem; color: #64748b;">\${t.installations?.length || 0} / \${t.maxInstallations} Active</span>
              </div>
              \${instHtml}
            </div>

            <!-- Organization Info -->
            <div class="card" style="margin-bottom: 0;">
              <div class="card-title">
                <span>🏢 Organization & Store Details</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
                <div>
                  <div style="font-size: 0.775rem; color: #64748b;">Tenant UUID</div>
                  <div style="font-family: monospace; font-size: 0.8rem; font-weight: 600;">\${t.id}</div>
                  
                  <div style="font-size: 0.775rem; color: #64748b; margin-top: 0.75rem;">Legal Entity Name</div>
                  <div style="font-weight: 600;">\${t.legalName || 'N/A'}</div>

                  <div style="font-size: 0.775rem; color: #64748b; margin-top: 0.75rem;">GSTIN</div>
                  <div style="font-weight: 600;">\${t.gstin || 'Unregistered'}</div>
                </div>

                <div>
                  <div style="font-size: 0.775rem; color: #64748b;">Subscription Plan</div>
                  <div style="font-weight: 600; text-transform: uppercase;">\${t.plan}</div>

                  <div style="font-size: 0.775rem; color: #64748b; margin-top: 0.75rem;">Contact Information</div>
                  <div>\${t.contactPhone || 'No phone'}</div>
                  <div style="color: #64748b; font-size: 0.8rem;">\${t.contactEmail || 'No email'}</div>

                  <div style="font-size: 0.775rem; color: #64748b; margin-top: 0.75rem;">Physical Address</div>
                  <div style="color: #334155;">\${t.address || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        \`;
      } catch (err) {
        container.innerHTML = '<div class="card" style="color: red; padding: 2rem; text-align: center;">Error loading dashboard: ' + err.message + '</div>';
      }
    }

    // Initial Load
    loadDashboard();
  </script>
</body>
</html>`;
}
