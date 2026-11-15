import React, { useState } from 'react';
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

const AppContent: React.FC = () => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const { storeSettings } = useStore();

  return (
    <Layout activeNav={activeNav} onNavigate={setActiveNav} storeName={storeSettings.storeName}>
      {activeNav === 'dashboard' && <DashboardScreen onNavigate={setActiveNav} />}
      {activeNav === 'sales' && <SalesBillingScreen />}
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
