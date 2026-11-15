import React, { createContext, useContext, useState, useEffect } from 'react';

export interface StoreSettings {
  storeName: string;
  tradeName?: string;
  legalName?: string;
  gstin?: string;
  phone?: string;
  address?: string;
  currency?: string;
  locale?: string;
  updatedAt?: string;
}

interface StoreContextType {
  storeSettings: StoreSettings;
  isLoading: boolean;
  updateStoreSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  refreshStoreSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'vyapaarKhata Wholesale & Retail Depot',
  tradeName: 'vyapaarKhata Wholesale & Retail Depot',
  gstin: '27AABCA1234F1Z8',
  phone: '+91 98765 43210',
  address: 'Plot No. 42, MIDC Industrial Area, Pune, Maharashtra 411018',
  currency: 'INR',
  locale: 'en-IN',
};

const StoreContext = createContext<StoreContextType>({
  storeSettings: DEFAULT_SETTINGS,
  isLoading: false,
  updateStoreSettings: async () => {},
  refreshStoreSettings: async () => {},
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const cached = localStorage.getItem('vk_store_settings');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState(false);

  const refreshStoreSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/settings', {
        headers: {
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const live: StoreSettings = {
          storeName: json.data.storeName || json.data.tradeName || DEFAULT_SETTINGS.storeName,
          tradeName: json.data.tradeName,
          legalName: json.data.legalName,
          gstin: json.data.gstin || DEFAULT_SETTINGS.gstin,
          phone: json.data.phone || DEFAULT_SETTINGS.phone,
          address: json.data.address || DEFAULT_SETTINGS.address,
          currency: json.data.currency || DEFAULT_SETTINGS.currency,
          locale: json.data.locale || DEFAULT_SETTINGS.locale,
          updatedAt: json.data.updatedAt,
        };
        setStoreSettings(live);
        localStorage.setItem('vk_store_settings', JSON.stringify(live));
      }
    } catch (err) {
      console.warn('Could not fetch live store settings, using cached:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStoreSettings();
  }, []);

  const updateStoreSettings = async (newSettings: Partial<StoreSettings>) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify(newSettings),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to update store settings');
      }

      const updated: StoreSettings = {
        storeName: json.data.storeName || newSettings.storeName || storeSettings.storeName,
        tradeName: json.data.tradeName,
        legalName: json.data.legalName,
        gstin: json.data.gstin,
        phone: json.data.phone,
        address: json.data.address,
        currency: json.data.currency,
        locale: json.data.locale,
        updatedAt: json.data.updatedAt,
      };

      setStoreSettings(updated);
      localStorage.setItem('vk_store_settings', JSON.stringify(updated));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        storeSettings,
        isLoading,
        updateStoreSettings,
        refreshStoreSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
