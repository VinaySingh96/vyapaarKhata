import React, { useState } from 'react';
import { Layout } from './components/Layout.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { SalesBillingScreen } from './screens/SalesBillingScreen.js';

export const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <Layout activeNav={activeNav} onNavigate={setActiveNav}>
      {activeNav === 'dashboard' && <DashboardScreen />}
      {activeNav === 'sales' && <SalesBillingScreen />}
      {activeNav !== 'dashboard' && activeNav !== 'sales' && (
        <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{activeNav} Module</h3>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            Module is backed by frozen OpenAPI 3.1 contracts and local database repositories.
          </p>
        </div>
      )}
    </Layout>
  );
};
