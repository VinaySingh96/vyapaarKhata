import { FastifyPluginAsync } from 'fastify';
import { renderTenantDashboardPage } from './tenant-dashboard-html.js';
import { renderAdminLoginPage } from './admin-login-html.js';
import { CentralConfig } from '../config.js';
import { isAuthorizedAdmin } from '../utils/admin-auth.js';

export interface UiRoutesOptions {
  config: CentralConfig;
}

export const uiRoutes: FastifyPluginAsync<UiRoutesOptions> = async (app, opts) => {
  const config = opts.config;

  // Redirect root to /admin
  app.get('/', async (req, reply) => {
    return reply.redirect('/admin');
  });

  // GET /admin/login
  app.get<{ Querystring: { returnUrl?: string } }>('/admin/login', async (req, reply) => {
    const auth = isAuthorizedAdmin(req, config);
    if (auth.authorized) {
      return reply.redirect(req.query.returnUrl || '/admin');
    }
    const html = renderAdminLoginPage({ returnUrl: req.query.returnUrl });
    return reply.type('text/html').send(html);
  });

  // GET /admin
  app.get('/admin', async (req, reply) => {
    const auth = isAuthorizedAdmin(req, config);
    if (!auth.authorized) {
      return reply.redirect('/admin/login?returnUrl=' + encodeURIComponent(req.url));
    }
    const adminUsername = auth.user?.username || config.ADMIN_USERNAME;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>vyapaarKhata Central Cloud - Tenant & Sync Management</title>
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
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #334155;
    }
    .brand { display: flex; align-items: center; gap: 0.75rem; }
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
    .brand-title { font-size: 1.25rem; font-weight: 700; }
    .brand-badge {
      font-size: 0.75rem;
      background: #38bdf8;
      color: #0f172a;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      margin-left: 0.5rem;
    }
    .server-status {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
      box-shadow: 0 0 8px #22c55e;
    }
    .container {
      max-width: 1280px;
      margin: 1.5rem auto;
      padding: 0 1.5rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .metric-card {
      background: var(--bg-card);
      padding: 1.25rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .metric-title { font-size: 0.825rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .metric-value { font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem; }
    .metric-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; }
    
    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid var(--border);
      margin-bottom: 1.5rem;
    }
    .nav-tab {
      padding: 0.65rem 1.25rem;
      background: none;
      border: none;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }
    .nav-tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      background: #eff6ff;
      border-radius: 6px 6px 0 0;
    }
    
    .card {
      background: var(--bg-card);
      border-radius: 10px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    .card-header {
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: #fafafa;
    }
    .card-title { font-size: 1.1rem; font-weight: 700; }
    
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
    }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
    .btn-secondary:hover { background: #e2e8f0; }
    .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.775rem; }
    .btn-danger { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
    .btn-danger:hover { background: #fecaca; }
    .btn-success { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .btn-success:hover { background: #bbf7d0; }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      font-size: 0.75rem;
    }
    td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    tr:hover td { background-color: #f8fafc; }
    
    .badge {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-active { background: #dcfce7; color: #15803d; }
    .badge-suspended { background: #fee2e2; color: #b91c1c; }
    .badge-trial { background: #fef9c3; color: #854d0e; }
    .badge-plan { background: #e0e7ff; color: #4338ca; }
    
    .search-bar {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      background: #fff;
      border-bottom: 1px solid var(--border);
    }
    .search-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.875rem;
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
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }
    .modal-header {
      padding: 1.25rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
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
    .form-group { margin-bottom: 1rem; }
    .form-label { display: block; font-size: 0.8rem; font-weight: 600; color: #334155; margin-bottom: 0.25rem; }
    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.875rem;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

    pre {
      background: #0f172a;
      color: #38bdf8;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      overflow-x: auto;
      max-height: 250px;
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
    <div class="brand">
      <div class="brand-icon">☁️</div>
      <div>
        <span class="brand-title">vyapaarKhata Central Cloud</span>
        <span class="brand-badge">Control Plane</span>
      </div>
    </div>
    <div class="server-status">
      <div><span class="status-dot"></span> Online</div>
      <div>DB: <strong>vyapaarkhata_central</strong></div>
      <div id="currentTime"></div>
      <div style="display: flex; align-items: center; gap: 8px; margin-left: 0.5rem; border-left: 1px solid #334155; padding-left: 0.75rem;">
        <span style="background: #1e293b; border: 1px solid #334155; padding: 3px 8px; border-radius: 6px; color: #cbd5e1; font-size: 0.8rem;">
          🛡️ \${adminUsername}
        </span>
        <button type="button" onclick="handleAdminSignOut()" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
          🚪 Sign Out
        </button>
      </div>
    </div>
  </header>

  <div class="container">
    <!-- Platform Metrics -->
    <div class="metrics-grid" id="metricsContainer">
      <div class="metric-card">
        <div class="metric-title">Total Tenants</div>
        <div class="metric-value" id="metricTotalTenants">-</div>
        <div class="metric-sub" id="metricActiveTenants">- active</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Registered Terminals</div>
        <div class="metric-value" id="metricTotalInstallations">-</div>
        <div class="metric-sub" id="metricActiveInstallations">- active devices</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Synced Events</div>
        <div class="metric-value" id="metricTotalSyncEvents">-</div>
        <div class="metric-sub" id="metricSyncEventsToday">- ingested today</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Last Cloud Sync</div>
        <div class="metric-value" style="font-size: 1.1rem; padding-top: 0.5rem;" id="metricLastSync">-</div>
        <div class="metric-sub">Across all local stores</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Total Sales</div>
        <div class="metric-value" style="color: #4338ca;" id="metricTotalSales">-</div>
        <div class="metric-sub" id="metricTotalInvoices">- invoices • all stores, all time</div>
      </div>
      <div class="metric-card">
        <div class="metric-title" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
          <span>Monthly Sales</span>
          <select id="metricMonthPicker" onchange="loadMetrics(this.value)" style="padding: 2px 6px; border-radius: 6px; border: 1px solid var(--border); font-size: 0.75rem; text-transform: none;"></select>
        </div>
        <div class="metric-value" style="color: #1d4ed8;" id="metricMonthSales">-</div>
        <div class="metric-sub" id="metricMonthInvoices">- invoices • all stores</div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="switchTab('tenants')">🏢 Tenants Directory</button>
      <button class="nav-tab" onclick="switchTab('sync')">⚡ Live Sync Stream</button>
      <button class="nav-tab" onclick="switchTab('devices')">💻 Registered Terminals</button>
    </div>

    <!-- TAB 1: Tenants -->
    <div id="tab-tenants">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Tenant Organizations</div>
          <button class="btn btn-primary" onclick="openCreateTenantModal()">+ Add New Tenant</button>
        </div>
        <div class="search-bar">
          <input type="text" class="search-input" id="tenantSearchInput" placeholder="Search by name, slug, phone, GSTIN..." oninput="loadTenants()">
          <select class="form-control" style="width: 180px;" id="statusFilter" onchange="loadTenants()">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Business Name & Store Type</th>
              <th>License Number</th>
              <th>Plan</th>
              <th>Terminals</th>
              <th>Synced Events</th>
              <th>Last Synced</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tenantsTableBody">
            <tr><td colspan="8" style="text-align:center; padding: 2rem;">Loading tenants...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: Sync Stream -->
    <div id="tab-sync" style="display:none;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Real-time Sync Ingestion Stream</div>
          <button class="btn btn-secondary btn-sm" onclick="loadSyncLogs()">🔄 Refresh Stream</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Received At</th>
              <th>Tenant</th>
              <th>Terminal</th>
              <th>Event Type</th>
              <th>Seq #</th>
              <th>Status</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody id="syncLogsTableBody">
            <tr><td colspan="7" style="text-align:center; padding: 2rem;">Loading sync events...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: Terminals -->
    <div id="tab-devices" style="display:none;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Registered Store Terminals (Installations)</div>
          <button class="btn btn-secondary btn-sm" onclick="loadDevices()">🔄 Refresh Devices</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Terminal Device Name</th>
              <th>Tenant Name</th>
              <th>Type</th>
              <th>App Version</th>
              <th>Last Heartbeat</th>
              <th>Last Synced Seq</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="devicesTableBody">
            <tr><td colspan="7" style="text-align:center; padding: 2rem;">Loading terminals...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- Create Tenant Modal -->
  <div class="modal-overlay" id="createTenantModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 style="font-size: 1.15rem; font-weight: 700;">Add New Tenant Organization</h3>
        <button class="btn btn-secondary btn-sm" onclick="closeCreateTenantModal()">✕</button>
      </div>
      <form id="createTenantForm" onsubmit="handleCreateTenant(event)">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Business / Trade Name *</label>
              <input type="text" class="form-control" name="name" required placeholder="e.g. Janardan Swarn Kala">
            </div>
            <div class="form-group">
              <label class="form-label">Store / Business Industry Type *</label>
              <select class="form-control" name="storeType" required>
                <option value="building_materials">🏗️ Building Materials & Hardware</option>
                <option value="jewellery">💍 Jewellery & Bullion Showroom</option>
                <option value="rental">🔁 Rental Store (Centring, Scaffolding, Equipment)</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Legal Entity Name</label>
              <input type="text" class="form-control" name="legalName" placeholder="e.g. Balaji Trade Links LLP">
            </div>
            <div class="form-group">
              <label class="form-label">GSTIN (Optional)</label>
              <input type="text" class="form-control" name="gstin" placeholder="27XXXXX1234X1ZX">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input type="text" class="form-control" name="contactPhone" placeholder="+91 98765 43210">
            </div>
            <div class="form-group">
              <label class="form-label">Contact Email</label>
              <input type="email" class="form-control" name="contactEmail" placeholder="admin@balaji.in">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Subscription Plan</label>
              <select class="form-control" name="plan">
                <option value="starter">Starter (1 terminal)</option>
                <option value="standard" selected>Standard (3 terminals)</option>
                <option value="enterprise">Enterprise (10 terminals)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Max Terminals Quota</label>
              <input type="number" class="form-control" name="maxInstallations" value="3" min="1" max="50">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Store / Warehouse Address</label>
            <input type="text" class="form-control" name="address" placeholder="e.g. Station Road, Satara, Maharashtra">
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 12px; font-size: 0.8rem; color: #166534; line-height: 1.4;">
            <strong>🔐 Enterprise Automated Licensing:</strong><br>
            Generates sequential fixed-length 17-char license number (<code>LIC-[TYPE]-[YEAR]-[00001]</code>) and 24-char activation key (<code>VK[YY]-[TYPE][TIER]-[SEQ]-[ENTR]-[CHK4]</code>) with year verification and cryptographic checksum.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeCreateTenantModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Tenant</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Tenant Modal (type store name to confirm) -->
  <div class="modal-overlay" id="deleteTenantModal">
    <div class="modal-content" style="max-width: 480px; border-radius: 12px; overflow: hidden;">
      <div class="modal-header" style="background: #fef2f2; border-bottom: 1px solid #fecaca;">
        <div style="font-weight: 700; font-size: 1.05rem; color: #b91c1c;">🗑 Delete Store Tenant Permanently?</div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeDeleteTenantModal()" style="border:none; background:none; font-size:1.1rem; cursor:pointer; color: #64748b;">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.5rem; font-size: 0.9rem; color: #475569; line-height: 1.6;">
        <p style="margin: 0 0 0.75rem;">
          This removes <strong id="deleteTenantName" style="color:#0f172a;"></strong>
          (<code id="deleteTenantLicense"></code>) from Central Cloud: its license, registered terminals,
          subscription and all synced data. <strong>This cannot be undone.</strong>
        </p>
        <p style="margin: 0 0 0.75rem;">
          Data on the store's own server is not touched. To remove it there too run
          <code>pnpm tenant:delete <span id="deleteTenantIdHint"></span> --yes</code>.
        </p>
        <label class="form-label" for="deleteTenantConfirmInput">Type the store name to confirm</label>
        <input type="text" class="form-control" id="deleteTenantConfirmInput" autocomplete="off" oninput="syncDeleteTenantBtn()">
      </div>
      <div class="modal-footer" style="padding: 0.85rem 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.6rem;">
        <button type="button" class="btn btn-secondary" onclick="closeDeleteTenantModal()">Cancel</button>
        <button type="button" class="btn btn-danger" id="deleteTenantBtn" disabled onclick="executeDeleteTenant()">Delete Permanently</button>
      </div>
    </div>
  </div>

  <!-- Reusable Custom Confirmation Modal -->
  <div class="modal-overlay" id="customConfirmModal">
    <div class="modal-content" style="max-width: 460px; border-radius: 12px; overflow: hidden;">
      <div class="modal-header" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a; display: flex; align-items: center; gap: 8px;" id="confirmModalTitle">
          Confirm Action
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeConfirmModal()" style="border:none; background:none; font-size:1.1rem; cursor:pointer; color: #64748b;">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.5rem;">
        <p id="confirmModalMessage" style="font-size: 0.925rem; color: #475569; line-height: 1.6; margin: 0;"></p>
      </div>
      <div class="modal-footer" style="padding: 0.85rem 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.6rem;">
        <button type="button" class="btn btn-secondary" onclick="closeConfirmModal()">Cancel</button>
        <button type="button" class="btn btn-primary" id="confirmModalActionBtn" onclick="executeConfirmModal()">Confirm</button>
      </div>
    </div>
  </div>

  <!-- Dedicated Tenant Onboarded Modal -->
  <div class="modal-overlay" id="tenantCreatedModal">
    <div class="modal-content" style="max-width: 520px; border-radius: 14px; overflow: hidden; border-top: 5px solid #10b981;">
      <div class="modal-header" style="background: #f0fdf4; border-bottom: 1px solid #bbf7d0;">
        <div style="font-weight: 800; font-size: 1.15rem; color: #166534; display: flex; align-items: center; gap: 8px;">
          <span>🎉</span> Store Tenant Onboarded Successfully
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeTenantCreatedModal()" style="border:none; background:none; font-size:1.1rem; cursor:pointer; color: #15803d;">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.5rem;">
        <p style="font-size: 0.875rem; color: #475569; margin-bottom: 1.25rem;">
          The store has been provisioned on the Central Cloud. Use these credentials to authenticate and unlock the store terminal POS:
        </p>

        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 0.85rem;">
          <div style="font-size: 0.725rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
            Store Organization
          </div>
          <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a;" id="createdTenantName">-</div>
          <div style="font-size: 0.8rem; color: #2563eb; font-weight: 600; margin-top: 3px;" id="createdTenantType">-</div>
        </div>

        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.725rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Store License Number</span>
            <button type="button" class="btn btn-secondary btn-sm" id="btnCopyCreatedLic" style="padding: 3px 8px; font-size: 0.75rem;">📋 Copy</button>
          </div>
          <div style="font-family: monospace; font-size: 1.15rem; font-weight: 800; color: #0f172a;" id="createdTenantLicense">-</div>
        </div>

        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.725rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Store Secret Key</span>
            <button type="button" class="btn btn-secondary btn-sm" id="btnCopyCreatedKey" style="padding: 3px 8px; font-size: 0.75rem;">📋 Copy</button>
          </div>
          <div style="font-family: monospace; font-size: 0.975rem; font-weight: 700; color: #b45309; word-break: break-all;" id="createdTenantSecret">-</div>
        </div>
      </div>
      <div class="modal-footer" style="padding: 1rem 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
        <a id="createdTenantDashLink" href="#" class="btn btn-primary" style="text-decoration: none;">📊 Open Store Dashboard</a>
        <button type="button" class="btn btn-secondary" onclick="closeTenantCreatedModal()">Done</button>
      </div>
    </div>
  </div>

  <!-- Global Floating Toast Notification Container -->
  <div id="toastContainer" class="toast-container"></div>

  <script>
    // Clock
    setInterval(() => {
      document.getElementById('currentTime').textContent = new Date().toLocaleTimeString();
    }, 1000);
    document.getElementById('currentTime').textContent = new Date().toLocaleTimeString();

    // Tab Switching
    function switchTab(tab) {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-tenants').style.display = tab === 'tenants' ? 'block' : 'none';
      document.getElementById('tab-sync').style.display = tab === 'sync' ? 'block' : 'none';
      document.getElementById('tab-devices').style.display = tab === 'devices' ? 'block' : 'none';

      if (tab === 'sync') loadSyncLogs();
      if (tab === 'devices') loadDevices();
      if (tab === 'tenants') loadTenants();
    }

    // Load Metrics
    function formatInr(n) {
      return '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatMonth(ym) {
      return new Date(ym + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }

    async function loadMetrics(month) {
      const picker = document.getElementById('metricMonthPicker');
      const selected = month || (picker && picker.value) || '';
      try {
        const res = await fetch('/api/v1/admin/metrics' + (selected ? '?month=' + encodeURIComponent(selected) : ''));
        const json = await res.json();
        if (json.success) {
          const m = json.data;
          document.getElementById('metricTotalTenants').textContent = m.totalTenants;
          document.getElementById('metricActiveTenants').textContent = m.activeTenants + ' active';
          document.getElementById('metricTotalInstallations').textContent = m.totalInstallations;
          document.getElementById('metricActiveInstallations').textContent = m.activeInstallations + ' active devices';
          document.getElementById('metricTotalSyncEvents').textContent = m.totalSyncEvents;
          document.getElementById('metricSyncEventsToday').textContent = m.syncEventsToday + ' ingested today';
          document.getElementById('metricLastSync').textContent = m.lastSyncTimestamp ? new Date(m.lastSyncTimestamp).toLocaleString() : 'No sync events yet';

          document.getElementById('metricTotalSales').textContent = formatInr(m.totalSales);
          document.getElementById('metricTotalInvoices').textContent = (m.totalInvoicesCount || 0) + ' invoices • all stores, all time';
          document.getElementById('metricMonthSales').textContent = formatInr(m.monthSales);
          document.getElementById('metricMonthInvoices').textContent = (m.monthInvoicesCount || 0) + ' invoices • all stores';

          const months = Array.from(new Set([
            new Date().toLocaleDateString('en-CA').slice(0, 7),
            m.selectedMonth,
            ...(m.salesByMonth || []).map(s => s.month)
          ])).sort((a, b) => b.localeCompare(a));
          picker.innerHTML = months.map(ym =>
            '<option value="' + ym + '"' + (ym === m.selectedMonth ? ' selected' : '') + '>' + formatMonth(ym) + '</option>'
          ).join('');
        }
      } catch (err) {
        console.error('Failed to load metrics', err);
      }
    }

    // Load Tenants
    let tenantCache = [];
    async function loadTenants() {
      const search = document.getElementById('tenantSearchInput').value;
      const status = document.getElementById('statusFilter').value;
      let url = '/api/v1/admin/tenants?';
      if (search) url += 'search=' + encodeURIComponent(search) + '&';
      if (status) url += 'status=' + encodeURIComponent(status);

      try {
        const res = await fetch(url);
        const json = await res.json();
        const tbody = document.getElementById('tenantsTableBody');
        if (!json.success || json.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">No tenants found.</td></tr>';
          return;
        }

        tenantCache = json.data;
        tbody.innerHTML = json.data.map(t => {
          const profile = storeProfile(t.storeType);
          return \`
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1rem;">\${profile.icon}</span>
                <div>
                  <div style="font-weight: 700; color: #1e293b;">\${t.name}</div>
                  <div style="font-size: 0.775rem; color: #64748b;">
                    \${t.legalName ? t.legalName + ' • ' : ''}\${t.contactPhone || 'No phone'}
                  </div>
                </div>
              </div>
              <div style="margin-top: 4px;">
                <span class="badge" style="background: \${profile.bg}; color: \${profile.fg}; font-size: 0.7rem;">
                  \${profile.icon} \${profile.label}
                </span>
              </div>
            </td>
            <td>
              <code style="font-size: 0.825rem; font-weight: 700; color: #0284c7; background: #f0f9ff; padding: 3px 6px; border-radius: 4px; border: 1px solid #bae6fd;">
                \${t.licenseNumber || 'UNASSIGNED'}
              </code>
            </td>
            <td><span class="badge badge-plan">\${t.plan}</span></td>
            <td><strong>\${t.activeInstallationCount}</strong> / \${t.maxInstallations}</td>
            <td><strong>\${t.syncEventsCount}</strong> events</td>
            <td style="font-size: 0.8rem; color: #64748b;">
              \${t.lastSyncedAt ? new Date(t.lastSyncedAt).toLocaleString() : 'Never'}
            </td>
            <td>
              <span class="badge badge-\${t.status}">\${t.status}</span>
            </td>
            <td>
              <a href="/admin/tenants/\${t.id}" class="btn btn-primary btn-sm" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">📊 View Dashboard</a>
              \${t.status === 'active' ? 
                \`<button class="btn btn-danger btn-sm" style="margin-left: 4px;" onclick="toggleTenantStatus('\${t.id}', 'suspended')">Suspend</button>\` :
                \`<button class="btn btn-success btn-sm" style="margin-left: 4px;" onclick="toggleTenantStatus('\${t.id}', 'active')">Activate</button>\`
              }
              <button class="btn btn-danger btn-sm" style="margin-left: 4px;" title="Delete tenant permanently" onclick="openDeleteTenantModal('\${t.id}')">🗑 Delete</button>
            </td>
          </tr>
        \`;
        }).join('');
      } catch (err) {
        console.error('Failed to load tenants', err);
      }
    }

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

    // Toggle Tenant Status (With Custom Confirmation Modal & Toast)
    function toggleTenantStatus(id, newStatus) {
      const isSuspended = newStatus === 'suspended';
      openConfirmModal(
        isSuspended ? '⚠️ Suspend Store Tenant?' : '✅ Activate Store Tenant?',
        isSuspended
          ? 'Are you sure you want to suspend this store tenant? Terminals associated with this store will not be able to authenticate or sync until reactivated.'
          : 'Are you sure you want to activate this store tenant? Terminals will immediately be able to authenticate and push sync events.',
        isSuspended ? 'Yes, Suspend Tenant' : 'Yes, Activate Tenant',
        isSuspended ? 'btn-danger' : 'btn-success',
        async () => {
          try {
            const res = await fetch(\`/api/v1/admin/tenants/\${id}/status\`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
            });
            const json = await res.json();
            if (json.success) {
              showToast(\`Store tenant status updated to \${newStatus}\`, 'success');
              loadTenants();
              loadMetrics();
            } else {
              showToast('Error: ' + (json.error?.message || 'Update failed'), 'error');
            }
          } catch (err) {
            showToast('Action failed: ' + err.message, 'error');
          }
        }
      );
    }

    // Delete Tenant (type-to-confirm)
    let deleteTenantTarget = null;
    function openDeleteTenantModal(id) {
      deleteTenantTarget = tenantCache.find(t => t.id === id);
      if (!deleteTenantTarget) return;
      document.getElementById('deleteTenantName').textContent = deleteTenantTarget.name;
      document.getElementById('deleteTenantLicense').textContent = deleteTenantTarget.licenseNumber || 'no license';
      document.getElementById('deleteTenantIdHint').textContent = deleteTenantTarget.id;
      const input = document.getElementById('deleteTenantConfirmInput');
      input.value = '';
      input.placeholder = deleteTenantTarget.name;
      syncDeleteTenantBtn();
      document.getElementById('deleteTenantModal').style.display = 'flex';
      input.focus();
    }
    function closeDeleteTenantModal() {
      document.getElementById('deleteTenantModal').style.display = 'none';
      deleteTenantTarget = null;
    }
    function syncDeleteTenantBtn() {
      const typed = document.getElementById('deleteTenantConfirmInput').value.trim();
      document.getElementById('deleteTenantBtn').disabled = !deleteTenantTarget || typed !== deleteTenantTarget.name.trim();
    }
    async function executeDeleteTenant() {
      if (!deleteTenantTarget) return;
      const btn = document.getElementById('deleteTenantBtn');
      btn.disabled = true;
      btn.textContent = 'Deleting...';
      try {
        const res = await fetch(\`/api/v1/admin/tenants/\${deleteTenantTarget.id}\`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmName: document.getElementById('deleteTenantConfirmInput').value.trim() })
        });
        const json = await res.json();
        if (json.success) {
          showToast(json.message || 'Tenant deleted', 'success');
          closeDeleteTenantModal();
          loadTenants();
          loadMetrics();
        } else {
          showToast('Error: ' + (json.error?.message || 'Delete failed'), 'error');
        }
      } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
      } finally {
        btn.textContent = 'Delete Permanently';
        syncDeleteTenantBtn();
      }
    }

    // Modal Helpers
    function openCreateTenantModal() { document.getElementById('createTenantModal').style.display = 'flex'; }
    function storeProfile(type) {
      if (type === 'jewellery') return { icon: '💍', label: 'Jewellery & Bullion', bg: '#fef3c7', fg: '#92400e' };
      if (type === 'rental') return { icon: '🔁', label: 'Rental Store', bg: '#dcfce7', fg: '#166534' };
      return { icon: '🏗️', label: 'Building Materials & Hardware', bg: '#e0e7ff', fg: '#3730a3' };
    }

    function closeCreateTenantModal() { document.getElementById('createTenantModal').style.display = 'none'; }

    function openTenantCreatedModal(tenant) {
      document.getElementById('createdTenantName').textContent = tenant.name + (tenant.legalName ? \` (\${tenant.legalName})\` : '');
      const createdProfile = storeProfile(tenant.storeType);
      document.getElementById('createdTenantType').textContent = createdProfile.icon + ' ' + createdProfile.label + ' POS Profile';
      document.getElementById('createdTenantLicense').textContent = tenant.licenseNumber;
      document.getElementById('createdTenantSecret').textContent = tenant.secretKey;
      document.getElementById('createdTenantDashLink').href = '/admin/tenants/' + tenant.id;

      document.getElementById('btnCopyCreatedLic').onclick = () => copyToClipboard(tenant.licenseNumber, 'Store License Number');
      document.getElementById('btnCopyCreatedKey').onclick = () => copyToClipboard(tenant.secretKey, 'Store Secret Key');

      document.getElementById('tenantCreatedModal').style.display = 'flex';
    }
    function closeTenantCreatedModal() {
      document.getElementById('tenantCreatedModal').style.display = 'none';
    }

    async function handleCreateTenant(e) {
      e.preventDefault();
      const form = e.target;
      const data = {
        name: form.name.value,
        storeType: form.storeType.value,
        legalName: form.legalName.value,
        gstin: form.gstin.value,
        contactPhone: form.contactPhone.value,
        contactEmail: form.contactEmail.value,
        plan: form.plan.value,
        maxInstallations: parseInt(form.maxInstallations.value, 10),
        address: form.address.value
      };

      try {
        const res = await fetch('/api/v1/admin/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
          closeCreateTenantModal();
          form.reset();
          loadTenants();
          loadMetrics();
          showToast('Store tenant onboarded successfully!', 'success');
          openTenantCreatedModal(json.data);
        } else {
          showToast('Failed to create tenant: ' + (json.error?.message || 'Server error'), 'error');
        }
      } catch (err) {
        showToast('Error creating tenant: ' + err.message, 'error');
      }
    }

    function copyToClipboard(text, label) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(label + ' copied to clipboard! 📋', 'success');
      }).catch(() => {
        showToast('Failed to copy to clipboard', 'error');
      });
    }

    // View Tenant Details & Dashboard (Navigate to dedicated page)
    function viewTenantDetails(id) {
      window.location.href = '/admin/tenants/' + id;
    }

    // Load Sync Stream
    async function loadSyncLogs() {
      const tbody = document.getElementById('syncLogsTableBody');
      try {
        const res = await fetch('/api/v1/admin/sync-logs?limit=30');
        const json = await res.json();
        if (!json.success || json.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">No sync events recorded yet.</td></tr>';
          return;
        }

        tbody.innerHTML = json.data.map(e => \`
          <tr>
            <td style="font-size: 0.8rem; white-space: nowrap;">\${new Date(e.receivedAt).toLocaleTimeString()}</td>
            <td><strong>\${e.tenantName || e.tenantId}</strong></td>
            <td>\${e.deviceName || 'Local Store Terminal'}</td>
            <td><code>\${e.eventType}</code></td>
            <td>#\${e.sequenceNumber || 1}</td>
            <td><span class="badge badge-active">\${e.status}</span></td>
            <td>
              <details>
                <summary style="cursor: pointer; color: #2563eb; font-size: 0.8rem;">View Payload</summary>
                <pre>\${JSON.stringify(e.payload, null, 2)}</pre>
              </details>
            </td>
          </tr>
        \`).join('');
      } catch (err) {
        console.error('Failed to load sync logs', err);
      }
    }

    // Load Terminals/Devices
    async function loadDevices() {
      const tbody = document.getElementById('devicesTableBody');
      try {
        const res = await fetch('/api/v1/admin/tenants');
        const json = await res.json();
        if (!json.success) return;

        let allDevices = [];
        for (const t of json.data) {
          const detRes = await fetch(\`/api/v1/admin/tenants/\${t.id}\`);
          const detJson = await detRes.json();
          if (detJson.success && detJson.data.installations) {
            detJson.data.installations.forEach(i => {
              allDevices.push({ ...i, tenantName: t.name });
            });
          }
        }

        if (allDevices.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">No terminals registered.</td></tr>';
          return;
        }

        tbody.innerHTML = allDevices.map(d => \`
          <tr>
            <td><strong>\${d.deviceName}</strong></td>
            <td>\${d.tenantName}</td>
            <td>\${d.installationType}</td>
            <td>v\${d.appVersion || '0.1.0'}</td>
            <td style="font-size: 0.8rem;">\${d.lastHeartbeatAt ? new Date(d.lastHeartbeatAt).toLocaleString() : 'Never'}</td>
            <td>#\${d.lastSequenceSynced || 0}</td>
            <td><span class="badge badge-\${d.status}">\${d.status}</span></td>
          </tr>
        \`).join('');
      } catch (err) {
        console.error('Failed to load devices', err);
      }
    }

    async function handleAdminSignOut() {
      try {
        await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
      } catch (err) {}
      try {
        sessionStorage.removeItem('vk_admin_jwt');
      } catch (err) {}
      window.location.href = '/admin/login';
    }

    // Intercept 401 Unauthorized responses to redirect to login
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const res = await originalFetch(...args);
      if (res.status === 401) {
        window.location.href = '/admin/login?returnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
      }
      return res;
    };

    // Initial Load
    loadMetrics();
    loadTenants();
  </script>
</body>
</html>`;

    return reply.type('text/html').send(html);
  });

  // GET /admin/tenants/:id (Dedicated Full Page Store Dashboard)
  app.get<{ Params: { id: string } }>('/admin/tenants/:id', async (req, reply) => {
    const auth = isAuthorizedAdmin(req, config);
    if (!auth.authorized) {
      return reply.redirect('/admin/login?returnUrl=' + encodeURIComponent(req.url));
    }
    const html = renderTenantDashboardPage(req.params.id);
    return reply.type('text/html').send(html);
  });
};
