import { useEffect, useCallback } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useI18n } from '../i18n/index.js';

export interface UseProductTourOptions {
  tenantId: string;
  rentalEnabled?: boolean;
}

export function useProductTour({ tenantId, rentalEnabled = false }: UseProductTourOptions) {
  const { language } = useI18n();
  const isHi = language === 'hi';

  const startTour = useCallback(
    (force = false) => {
      if (!tenantId) return;
      const storageKey = `vk_tour_completed_${tenantId}`;
      if (!force && localStorage.getItem(storageKey) === 'true') {
        return;
      }

      // If on mobile screen and menu is collapsed, skip elements that might be hidden
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;

      const steps: any[] = [];

      // Step 1: Brand & Current Store Header
      steps.push({
        element: '#header-brand',
        popover: {
          title: isHi ? '👋 व्यापारखाता में आपका स्वागत है' : '👋 Welcome to vyapaarKhata',
          description: isHi
            ? 'यह आपका मुख्य स्टोर केंद्र है। आपका सक्रिय स्टोर और टर्मिनल लाइसेंस स्थिति यहाँ प्रदर्शित होती है।'
            : 'This is your primary store hub. Your active business profile and connected license status appear here.',
          side: 'bottom',
          align: 'start',
        },
      });

      // Step 2: Language Switcher
      steps.push({
        element: '#header-language-container',
        popover: {
          title: isHi ? '🌐 भाषा चुनें (Language)' : '🌐 Multi-Language Support',
          description: isHi
            ? 'यहाँ से आप 1 क्लिक में पूरी प्रणाली को हिंदी या अंग्रेज़ी में बदल सकते हैं।'
            : 'Seamlessly switch the entire application between English and Hindi (हिंदी) with a single click.',
          side: 'bottom',
          align: 'end',
        },
      });

      // Step 3: Fast POS Billing
      steps.push({
        element: '#nav-sales',
        popover: {
          title: isHi ? '⚡ तेज़ बिक्री और चालान (POS Billing)' : '⚡ Fast POS Sales & Billing',
          description: isHi
            ? 'बारकोड स्कैनर, नकद/उधारी बिल, जीएसटी इनवॉइस और 3-इंच थर्मल प्रिंटर से तुरंत पर्ची निकालें।'
            : 'Generate cash and credit (udhar) invoices with fast barcode scanner, GST rates, and 3-inch thermal printing.',
          side: isMobile ? 'bottom' : 'right',
          align: 'start',
        },
      });

      // Step 4: Rental & Centering Module (if enabled)
      if (rentalEnabled) {
        steps.push({
          element: '#nav-rentals',
          popover: {
            title: isHi ? '🏗️ सेंट्रिंग और सामग्री किराया (Rentals)' : '🏗️ Centring & Equipment Rentals',
            description: isHi
              ? 'बांस, बल्ली, सेंट्रिंग प्लेट्स और मशीनरी ग्राहकों को साइट पर जारी (Issue) करें और ऑटोमैटिक दैनिक किराया गिनें।'
              : 'Issue scaffolding, centering plates, and machinery to client sites with automatic daily rental billing upon return.',
            side: isMobile ? 'bottom' : 'right',
            align: 'start',
          },
        });
      }

      // Step 5: Products & Bulk Excel Import
      steps.push({
        element: '#nav-products',
        popover: {
          title: isHi ? '📦 सामग्री और Excel आयात (Products)' : '📦 Products & Bulk Excel Import',
          description: isHi
            ? 'सामग्री का स्टॉक, हिंदी नाम, cft/kg/bag यूनिट्स और Excel/CSV फ़ाइल से 1 क्लिक में पूरा कैटलॉग जोड़ें।'
            : 'Manage building materials, Hindi names, units (cft, kg, bag, pcs), and 1-click bulk import from Excel / CSV.',
          side: isMobile ? 'bottom' : 'right',
          align: 'start',
        },
      });

      // Step 6: Customer Parties & Udhar Ledger
      steps.push({
        element: '#nav-parties',
        popover: {
          title: isHi ? '👥 ग्राहक और उधारी बहीखाता (Khata Ledger)' : '👥 Parties & Udhar Ledger',
          description: isHi
            ? 'ग्राहकों और सप्लायर्स का पूरा बहीखाता, उधारी बैलेंस, क्रेडिट लिमिट और स्टेटमेंट यहाँ देखें।'
            : 'Track customer udhar ledgers, supplier balances, credit limits, and downloadable account statements.',
          side: isMobile ? 'bottom' : 'right',
          align: 'start',
        },
      });

      // Step 7: Cloud Sync & Offline Security
      steps.push({
        element: '#sync-status-badge',
        popover: {
          title: isHi ? '☁️ क्लाउड बैकअप और ऑफलाइन सुरक्षा' : '☁️ Cloud Sync & Offline Security',
          description: isHi
            ? 'इंटरनेट न होने पर भी सिस्टम 100% चलेगा। नेट कनेक्ट होते ही सभी बिल सुरक्षित सेंट्रल क्लाउड में बैकअप हो जाएंगे।'
            : 'Works 100% offline. Whenever connected, transactions are securely backed up to Central Cloud automatically.',
          side: 'top',
          align: 'start',
        },
      });

      // Filter out any steps where the target DOM element is not mounted
      const validSteps = steps.filter((s) => {
        if (!s.element) return true;
        return !!document.querySelector(s.element);
      });

      if (validSteps.length === 0) return;

      const driverInstance: Driver = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: 'rgba(15, 23, 42, 0.72)',
        nextBtnText: isHi ? 'आगे ➔' : 'Next ➔',
        prevBtnText: isHi ? '⬅ पीछे' : '⬅ Back',
        doneBtnText: isHi ? 'समझ गया ✓' : 'Get Started ✓',
        onDestroyStarted: () => {
          localStorage.setItem(storageKey, 'true');
          driverInstance.destroy();
        },
        steps: validSteps,
      });

      driverInstance.drive();
    },
    [tenantId, rentalEnabled, isHi]
  );

  // Auto-trigger on initial mount with a safe delay for DOM rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      startTour(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [startTour]);

  return {
    replayTour: () => startTour(true),
  };
}
