import React, { useState, useEffect, useCallback } from 'react';
import { I18nProvider } from './i18n/index.js';
import { ToastProvider } from './components/Toast.js';
import { StoreProvider, useStore } from './context/StoreContext.js';
import { Layout } from './components/Layout.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { SalesBillingScreen } from './screens/SalesBillingScreen.js';
import { ProductsScreen } from './screens/ProductsScreen.js';
import { InventoryScreen } from './screens/InventoryScreen.js';
import { PurchasingScreen } from './screens/PurchasingScreen.js';
import { PartiesScreen } from './screens/PartiesScreen.js';
import { PaymentsScreen } from './screens/PaymentsScreen.js';
import { ExpensesScreen } from './screens/ExpensesScreen.js';
import { ReportsScreen } from './screens/ReportsScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { RentalsScreen } from './screens/RentalsScreen.js';
import { LicenseLoginScreen } from './screens/LicenseLoginScreen.js';
import { LicenseStatusScreen } from './screens/LicenseStatusScreen.js';

const VALID_ROUTES = [
  'dashboard',
  'sales',
  'rentals',
  'products',
  'inventory',
  'purchasing',
  'parties',
  'payments',
  'expenses',
  'reports',
  'settings',
] as const;

type RouteId = (typeof VALID_ROUTES)[number];

function getRouteFromLocation(): RouteId {
  // Check hash first (e.g. #/sales or #sales)
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (VALID_ROUTES.includes(hash as RouteId)) {
    return hash as RouteId;
  }

  // Check pathname (e.g. /sales or /sales/)
  const path = window.location.pathname.replace(/^\/|\/$/g, '').trim().toLowerCase();
  if (VALID_ROUTES.includes(path as RouteId)) {
    return path as RouteId;
  }

  return 'dashboard';
}

const AppContent: React.FC = () => {
  const [activeNav, setActiveNav] = useState<RouteId>(() => getRouteFromLocation());
  const { storeSettings, isLicenseLoggedIn, tenantStatus, checkLicenseStatus, rentalEnabled } = useStore();

  // Listen to popstate (back/forward browser buttons) and hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const currentRoute = getRouteFromLocation();
      setActiveNav(currentRoute);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleNavigate = useCallback((nav: string) => {
    const targetRoute = (VALID_ROUTES.includes(nav as RouteId) ? nav : 'dashboard') as RouteId;
    setActiveNav(targetRoute);

    const targetPath = targetRoute === 'dashboard' ? '/' : `/${targetRoute}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ route: targetRoute }, '', targetPath);
    }
  }, []);

  // Restrict any UI before valid store license login
  if (!isLicenseLoggedIn) {
    return <LicenseLoginScreen />;
  }

  // Restrict and display dedicated screen when tenant status is suspended, expired, cancelled, etc.
  if (tenantStatus && tenantStatus !== 'active' && tenantStatus !== 'trial') {
    return <LicenseStatusScreen status={tenantStatus} onRecheck={checkLicenseStatus} />;
  }

  return (
    <Layout activeNav={activeNav} onNavigate={handleNavigate} storeName={storeSettings.storeName}>
      {activeNav === 'dashboard' && <DashboardScreen onNavigate={handleNavigate} />}
      {activeNav === 'sales' && <SalesBillingScreen />}
      {activeNav === 'rentals' && (rentalEnabled ? <RentalsScreen /> : <SettingsScreen />)}
      {activeNav === 'products' && <ProductsScreen />}
      {activeNav === 'inventory' && <InventoryScreen />}
      {activeNav === 'purchasing' && <PurchasingScreen />}
      {activeNav === 'parties' && <PartiesScreen />}
      {activeNav === 'payments' && <PaymentsScreen />}
      {activeNav === 'expenses' && <ExpensesScreen />}
      {activeNav === 'reports' && <ReportsScreen />}
      {activeNav === 'settings' && <SettingsScreen />}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <ToastProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </ToastProvider>
    </I18nProvider>
  );
};
