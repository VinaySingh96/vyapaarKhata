export function renderAdminLoginPage(options?: { errorMessage?: string; returnUrl?: string }): string {
  const returnUrl = options?.returnUrl || '/admin';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Sign In - vyapaarKhata Central Cloud</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --bg-main: #0f172a;
      --bg-card: #1e293b;
      --border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --success: #16a34a;
      --danger: #ef4444;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-family);
      background-color: var(--bg-main);
      color: var(--text-main);
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .auth-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      width: 100%;
      max-width: 440px;
      padding: 2.25rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }
    .brand-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 2rem;
    }
    .brand-icon {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.5rem;
      margin-bottom: 0.85rem;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }
    .brand-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .brand-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }
    .tab-nav {
      display: flex;
      background: #0f172a;
      border-radius: 8px;
      padding: 4px;
      margin-bottom: 1.5rem;
      border: 1px solid var(--border);
    }
    .tab-btn {
      flex: 1;
      padding: 8px 12px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.825rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
    }
    .tab-btn.active {
      background: #334155;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .form-group {
      margin-bottom: 1.15rem;
    }
    .form-label {
      display: block;
      font-size: 0.825rem;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 0.4rem;
    }
    .form-control {
      width: 100%;
      padding: 0.7rem 0.85rem;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: #ffffff;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
    }
    .password-wrapper {
      position: relative;
    }
    .toggle-pwd {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.8rem;
    }
    .remember-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      font-size: 0.825rem;
      color: var(--text-muted);
    }
    .remember-row label {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      cursor: pointer;
    }
    .btn-submit {
      width: 100%;
      padding: 0.75rem;
      background: var(--primary);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.925rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn-submit:hover {
      background: var(--primary-hover);
    }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .alert-box {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
      display: none;
      line-height: 1.4;
    }
    .alert-danger {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
    .alert-success {
      background: rgba(22, 163, 74, 0.15);
      border: 1px solid rgba(22, 163, 74, 0.3);
      color: #86efac;
    }
    .footer-note {
      text-align: center;
      margin-top: 1.75rem;
      font-size: 0.775rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="auth-card">
    <div class="brand-header">
      <div class="brand-icon">VK</div>
      <h1 class="brand-title">vyapaarKhata</h1>
      <p class="brand-subtitle">Central Cloud &middot; Admin Management Portal</p>
    </div>

    <!-- Alert Message Container -->
    <div id="alertBox" class="alert-box alert-danger"></div>

    <!-- Mode Selector Tabs -->
    <div class="tab-nav">
      <button type="button" class="tab-btn active" id="tabCredsBtn" onclick="switchTab('creds')">
        🔑 Admin Credentials
      </button>
      <button type="button" class="tab-btn" id="tabApiKeyBtn" onclick="switchTab('apikey')">
        🛡️ API Secret Key
      </button>
    </div>

    <!-- Credentials Form -->
    <form id="loginForm" onsubmit="handleLoginSubmit(event)">
      <div id="credsInputs">
        <div class="form-group">
          <label class="form-label" for="adminUsername">Admin Username</label>
          <input
            type="text"
            id="adminUsername"
            class="form-control"
            autocomplete="username"
            placeholder="e.g. admin"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="adminPassword">Admin Password</label>
          <div class="password-wrapper">
            <input
              type="password"
              id="adminPassword"
              class="form-control"
              autocomplete="current-password"
              placeholder="••••••••••••"
              required
            />
            <button type="button" class="toggle-pwd" onclick="togglePasswordVisibility()">👁️</button>
          </div>
        </div>
      </div>

      <!-- API Key Inputs (Hidden by default) -->
      <div id="apiKeyInputs" style="display: none;">
        <div class="form-group">
          <label class="form-label" for="adminApiKey">Central Admin Secret Key</label>
          <input
            type="password"
            id="adminApiKey"
            class="form-control"
            placeholder="central-admin-secret-key-..."
          />
        </div>
        <p style="font-size: 0.775rem; color: #94a3b8; margin-top: -0.5rem; margin-bottom: 1.25rem;">
          Use the master API key configured on this Central Cloud server for DevOps and automated access.
        </p>
      </div>

      <div class="remember-row">
        <label>
          <input type="checkbox" id="rememberMe" checked />
          <span>Keep me signed in for 7 days</span>
        </label>
      </div>

      <button type="submit" id="btnSubmit" class="btn-submit">
        <span id="btnText">Sign In to Admin Console</span>
        <span id="btnSpinner" style="display: none;">⏳ Authenticating...</span>
      </button>
    </form>

    <div class="footer-note">
      🔒 Protected Central Control Plane &middot; vyapaarKhata v0.1.0
    </div>
  </div>

  <script>
    let currentTab = 'creds';
    const returnUrl = ${JSON.stringify(returnUrl)};

    function switchTab(tab) {
      currentTab = tab;
      const tabCreds = document.getElementById('tabCredsBtn');
      const tabApiKey = document.getElementById('tabApiKeyBtn');
      const credsInputs = document.getElementById('credsInputs');
      const apiKeyInputs = document.getElementById('apiKeyInputs');
      const adminUsername = document.getElementById('adminUsername');
      const adminPassword = document.getElementById('adminPassword');
      const adminApiKey = document.getElementById('adminApiKey');

      hideAlert();

      if (tab === 'creds') {
        tabCreds.classList.add('active');
        tabApiKey.classList.remove('active');
        credsInputs.style.display = 'block';
        apiKeyInputs.style.display = 'none';
        adminUsername.required = true;
        adminPassword.required = true;
        adminApiKey.required = false;
      } else {
        tabCreds.classList.remove('active');
        tabApiKey.classList.add('active');
        credsInputs.style.display = 'none';
        apiKeyInputs.style.display = 'block';
        adminUsername.required = false;
        adminPassword.required = false;
        adminApiKey.required = true;
      }
    }

    function togglePasswordVisibility() {
      const pwd = document.getElementById('adminPassword');
      pwd.type = pwd.type === 'password' ? 'text' : 'password';
    }

    function showAlert(msg, isSuccess = false) {
      const box = document.getElementById('alertBox');
      box.textContent = msg;
      box.className = 'alert-box ' + (isSuccess ? 'alert-success' : 'alert-danger');
      box.style.display = 'block';
    }

    function hideAlert() {
      const box = document.getElementById('alertBox');
      box.style.display = 'none';
    }

    async function handleLoginSubmit(e) {
      e.preventDefault();
      hideAlert();

      const btn = document.getElementById('btnSubmit');
      const btnText = document.getElementById('btnText');
      const btnSpinner = document.getElementById('btnSpinner');

      btn.disabled = true;
      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline';

      try {
        let payload = {};
        if (currentTab === 'creds') {
          payload = {
            username: document.getElementById('adminUsername').value.trim(),
            password: document.getElementById('adminPassword').value,
          };
        } else {
          payload = {
            apiKey: document.getElementById('adminApiKey').value.trim(),
          };
        }

        const res = await fetch('/api/v1/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showAlert('Authentication successful. Redirecting...', true);
          if (data.token) {
            try {
              sessionStorage.setItem('vk_admin_jwt', data.token);
            } catch {}
          }
          setTimeout(() => {
            window.location.href = returnUrl || '/admin';
          }, 400);
        } else {
          const errMsg = data.error?.message || 'Invalid administrator credentials. Please check and try again.';
          showAlert('⚠️ ' + errMsg);
          btn.disabled = false;
          btnText.style.display = 'inline';
          btnSpinner.style.display = 'none';
        }
      } catch (err) {
        showAlert('⚠️ Network error connecting to Central Cloud. Please verify server status.');
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
      }
    }
  </script>
</body>
</html>`;
}
