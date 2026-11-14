import React, { useState } from 'react';
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

export const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <Layout activeNav={activeNav} onNavigate={setActiveNav}>
      {activeNav === 'dashboard' && <DashboardScreen />}
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
