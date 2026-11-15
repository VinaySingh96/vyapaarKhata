import React, { createContext, useContext, useState, useEffect } from 'react';

export type StoreType = 'jewellery' | 'building_materials';

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
  storeType: StoreType;
  licenseNumber: string | null;
  jwtToken: string | null;
  isLicenseLoggedIn: boolean;
  isLoading: boolean;
  updateStoreSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  refreshStoreSettings: () => Promise<void>;
  loginWithLicense: (licenseNumber: string, secretKey: string) => Promise<{ success: boolean; message?: string }>;
  logoutLicense: () => void;
  setExplicitStoreType: (type: StoreType) => void;
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
  storeType: 'building_materials',
  licenseNumber: null,
  jwtToken: null,
  isLicenseLoggedIn: false,
  isLoading: false,
  updateStoreSettings: async () => {},
  refreshStoreSettings: async () => {},
  loginWithLicense: async () => ({ success: false }),
  logoutLicense: () => {},
  setExplicitStoreType: () => {},
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

  const [jwtToken, setJwtToken] = useState<string | null>(() => {
    const token = localStorage.getItem('vk_jwt_token');
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('vk_jwt_token');
          localStorage.removeItem('vk_refresh_token');
          localStorage.removeItem('vk_license_number');
          return null;
        }
      }
    } catch {
      return null;
    }
    return token;
  });

  const [licenseNumber, setLicenseNumber] = useState<string | null>(() => {
    return localStorage.getItem('vk_license_number') || null;
  });

  const [storeType, setStoreType] = useState<StoreType>(() => {
    const cached = localStorage.getItem('vk_store_type');
    if (cached === 'jewellery' || cached === 'building_materials') {
      return cached;
    }
    if (typeof window !== 'undefined') {
      if (window.location.port === '3003' || window.location.port === '4003') return 'jewellery';
    }
    return 'building_materials';
  });

  const [isLoading, setIsLoading] = useState(false);

  const isLicenseLoggedIn = Boolean(jwtToken && licenseNumber);

  const loginWithLicense = async (lic: string, secret: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/license-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseNumber: lic.trim(), secretKey: secret.trim() }),
      });

      const raw = await res.text();
      let json: any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      if (!res.ok || !json) {
        const errorMsg =
          json?.error?.message ||
          (res.status >= 500
            ? `Store backend connection error (HTTP ${res.status}). Please check if local backend is running.`
            : `Authentication failed (HTTP ${res.status}): ${raw.slice(0, 150) || 'Unknown error'}`);
        return { success: false, message: errorMsg };
      }

      if (!json.success || !json.data) {
        return { success: false, message: json.error?.message || 'Authentication failed' };
      }

      const { accessToken, refreshToken, tenant } = json.data;
      localStorage.setItem('vk_jwt_token', accessToken);
      localStorage.setItem('vk_refresh_token', refreshToken);
      localStorage.setItem('vk_license_number', tenant.licenseNumber || lic);
      localStorage.setItem('vk_store_type', tenant.storeType || 'building_materials');

      setJwtToken(accessToken);
      setLicenseNumber(tenant.licenseNumber || lic);
      setStoreType(tenant.storeType || 'building_materials');

      const updatedSettings: StoreSettings = {
        ...storeSettings,
        storeName: tenant.name,
        legalName: tenant.legalName || storeSettings.legalName,
      };
      setStoreSettings(updatedSettings);
      localStorage.setItem('vk_store_settings', JSON.stringify(updatedSettings));

      return { success: true, message: json.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection error' };
    } finally {
      setIsLoading(false);
    }
  };

  const logoutLicense = () => {
    localStorage.removeItem('vk_jwt_token');
    localStorage.removeItem('vk_refresh_token');
    localStorage.removeItem('vk_license_number');
    setJwtToken(null);
    setLicenseNumber(null);
  };

  const setExplicitStoreType = (type: StoreType) => {
    setStoreType(type);
    localStorage.setItem('vk_store_type', type);
  };

  const refreshStoreSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/settings', {
        headers: {
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
      });
      const raw = await res.text();
      let json: any = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      if (json?.success && json?.data) {
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

        // Auto-detect store type from storeName if not logged in
        if (!localStorage.getItem('vk_jwt_token')) {
          const lower = (live.storeName || '').toLowerCase();
          if (lower.includes('jewel') || lower.includes('swarn') || lower.includes('kala')) {
            setStoreType('jewellery');
          }
        }
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
        storeType,
        licenseNumber,
        jwtToken,
        isLicenseLoggedIn,
        isLoading,
        updateStoreSettings,
        refreshStoreSettings,
        loginWithLicense,
        logoutLicense,
        setExplicitStoreType,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
