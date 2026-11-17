import { useEffect, useCallback } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useI18n } from '../i18n/index.js';

export interface UseProductTourOptions {
  tenantId: string;
  rentalEnabled?: boolean;
  onNavigate?: (route: string) => void;
}

interface RawTourStep {
  element?: string;
  targetRoute?: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  };
}

export function useProductTour({ tenantId, rentalEnabled = false, onNavigate }: UseProductTourOptions) {
  const { language } = useI18n();
  const isHi = language === 'hi';

  const navigate = useCallback(
    (route: string) => {
      if (onNavigate) {
        onNavigate(route);
      } else if (typeof window !== 'undefined') {
        const targetPath = route === 'dashboard' ? '/' : `/${route}`;
        window.history.pushState({ route }, '', targetPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    },
    [onNavigate]
  );

  const startTour = useCallback(
    (force = false) => {
      if (!tenantId) return;
      const storageKey = `vk_tour_completed_${tenantId}`;

      const isBrowser = typeof window !== 'undefined';
      const searchParams = isBrowser ? new URLSearchParams(window.location.search) : null;
      const hasTourQueryParam = searchParams?.get('tour') === 'true' || searchParams?.get('tour') === '1';
      const isDevAlwaysShow = isBrowser && localStorage.getItem('vk_dev_always_show_tour') === 'true';

      const shouldForce = force || hasTourQueryParam || isDevAlwaysShow;
      if (!shouldForce && localStorage.getItem(storageKey) === 'true') {
        return;
      }

      const isMobile = isBrowser && window.innerWidth <= 1024;
      const rawSteps: RawTourStep[] = [];

      // ==========================================
      // STEP 1: Welcome & Core 3-Pillar Overview
      // ==========================================
      rawSteps.push({
        popover: {
          title: isHi ? '👋 व्यापारखाता में आपका स्वागत है!' : '👋 Welcome to vyapaarKhata!',
          description: isHi
            ? `<p style="margin:0 0 10px 0; font-size:13.5px; color:#334155;">व्यापारखाता विशेष रूप से भारतीय भवन निर्माण सामग्री (बिल्डिंग मटेरियल), हार्डवेयर और सप्लायर्स के लिए डिज़ाइन किया गया है।</p>
               <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 12px; border-radius:8px; margin-bottom:10px; font-size:12.5px; color:#1e293b; display:flex; flex-direction:column; gap:6px;">
                 <div>📦 <strong>1. सामग्री जोड़ना व चुनना</strong> — भारतीय यूनिट्स (cft, kg, bag, brass) और 1-क्लिक Excel आयात।</div>
                 <div>⚡ <strong>2. तेज़ पीओएस बिलिंग</strong> — डायरेक्ट प्रोडक्ट सर्च, ऑटो स्टॉक अलर्ट और थर्मल पर्ची।</div>
                 <div>💳 <strong>3. भुगतान व उधारी वसूली</strong> — काउंटर पर नकद/UPI या ग्राहक के खाते में उधारी जमा।</div>
               </div>
               <p style="margin:0; font-size:12px; color:#64748b;">आइए इन 3 मुख्य सुविधाओं का एक त्वरित टूर देखें!</p>`
            : `<p style="margin:0 0 10px 0; font-size:13.5px; color:#334155;">vyapaarKhata is tailor-made for Indian building material suppliers, hardware stores, and retail traders.</p>
               <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 12px; border-radius:8px; margin-bottom:10px; font-size:12.5px; color:#1e293b; display:flex; flex-direction:column; gap:6px;">
                 <div>📦 <strong>1. Create & Select Products</strong> — Indian units (cft, kg, bag, brass) & 1-click Excel import.</div>
                 <div>⚡ <strong>2. Fast POS Billing</strong> — Direct material selection, live stock alerts & thermal bills.</div>
                 <div>💳 <strong>3. Receive Payments & Khata</strong> — Cash, UPI, and Udhar customer ledger collections.</div>
               </div>
               <p style="margin:0; font-size:12px; color:#64748b;">Click <strong>Next ➔</strong> for a quick walkthrough of these main features!</p>`,
          align: 'center',
        },
      });

      // ==========================================
      // PILLAR 1: CREATE & SELECT PRODUCTS (/products)
      // ==========================================
      rawSteps.push({
        targetRoute: 'products',
        element: '#btn-add-new-product',
        popover: {
          title: isHi ? '📦 1. नई सामग्री / सामान जोड़ें' : '📦 1. Create New Product',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">यहाँ से <strong>हिंदी व अंग्रेज़ी नाम</strong> (उदा. <em>अल्ट्राटेक सीमेंट</em>, <em>10mm सरिया</em>), HSN कोड और खरीद/बिक्री दर के साथ नई सामग्री जोड़ें।</p>
               <div style="font-size:12px; color:#0369a1; background:#e0f2fe; padding:6px 8px; border-radius:6px;">
                 💡 भारतीय व्यापार यूनिट्स का पूर्ण समर्थन: <strong>cft, brass, bag, kg, t (टन), qtl (क्विंटल), pcs</strong>।
               </div>`
            : `<p style="margin:0 0 8px 0;">Click here to create materials with <strong>Hindi & English names</strong> (e.g. <em>UltraTech Cement</em>, <em>10mm TMT Sariya</em>), HSN/SAC codes, and rates.</p>
               <div style="font-size:12px; color:#0369a1; background:#e0f2fe; padding:6px 8px; border-radius:6px;">
                 💡 Full support for Indian trade units: <strong>cft, brass, bag, kg, t (tonne), qtl (quintal), pcs</strong>.
               </div>`,
          side: isMobile ? 'bottom' : 'bottom',
          align: 'end',
        },
      });

      rawSteps.push({
        targetRoute: 'products',
        element: '#btn-import-excel',
        popover: {
          title: isHi ? '📊 2. Excel / CSV से थोक आयात' : '📊 2. 1-Click Excel / CSV Import',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">क्या आपके पास पहले से सामग्री की रेट लिस्ट है? <strong>Excel (.xlsx) या CSV फ़ाइल</strong> अपलोड करके 1 क्लिक में पूरा कैटलॉग जोड़ें।</p>
               <div style="font-size:12px; color:#15803d; background:#dcfce7; padding:6px 8px; border-radius:6px;">
                 ✓ ओपनिंग स्टॉक, यूनिट्स, श्रेणियां और दाम बिना किसी मैन्युअल टाइपिंग के स्वतः जुड़ जाते हैं।
               </div>`
            : `<p style="margin:0 0 8px 0;">Already have an existing item list? Upload your <strong>Excel (.xlsx) or CSV file</strong> to import your entire building catalog in 1 click.</p>
               <div style="font-size:12px; color:#15803d; background:#dcfce7; padding:6px 8px; border-radius:6px;">
                 ✓ Automatically provisions opening stock, Indian units, categories, and selling prices instantly.
               </div>`,
          side: isMobile ? 'bottom' : 'bottom',
          align: 'end',
        },
      });

      rawSteps.push({
        targetRoute: 'products',
        element: '#products-search-filter-bar',
        popover: {
          title: isHi ? '🔍 3. सामग्री खोजें और स्टॉक जांचें' : '🔍 3. Search & Select Products',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">सामग्री नाम, हिंदी नाम या बारकोड से तुरंत कोई भी आइटम खोजें। बिल बनाने से पहले गोदाम का लाइव स्टॉक और री-ऑर्डर स्तर देखें।</p>`
            : `<p style="margin:0 0 8px 0;">Instantly find any item by English name, Hindi keyword, barcode, or category. Verify godown stock levels and low-stock alerts before billing.</p>`,
          side: 'bottom',
          align: 'start',
        },
      });

      // ==========================================
      // PILLAR 2: FAST POS BILLING (/sales)
      // ==========================================
      rawSteps.push({
        targetRoute: 'sales',
        element: '#billing-customer-section',
        popover: {
          title: isHi ? '👤 4. ग्राहक चुनें या नया जोड़ें' : '👤 4. Select or Add Customer',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">मौजूदा ग्राहक को चुनकर उनकी <strong>पुरानी उधारी (Khata Balance)</strong> देखें, या नए ग्राहक का नाम, मोबाइल नंबर और <strong>गाँव/क्षेत्र</strong> तुरंत दर्ज करें।</p>
               <div style="font-size:12px; color:#475569;">
                 नए ग्राहक को बिना बिलिंग स्क्रीन छोड़े सीधे 1 क्लिक में जोड़ा जा सकता है!
               </div>`
            : `<p style="margin:0 0 8px 0;">Pick an existing customer to see their <strong>current Khata udhar balance</strong>, or type a new customer's name, phone, and <strong>village / area (गाँव)</strong> on the fly.</p>
               <div style="font-size:12px; color:#475569;">
                 New customers are saved seamlessly right from the POS billing screen!
               </div>`,
          side: isMobile ? 'bottom' : 'bottom',
          align: 'start',
        },
      });

      rawSteps.push({
        targetRoute: 'sales',
        element: '#billing-product-search',
        popover: {
          title: isHi ? '⚡ 5. सामग्री चुनें और तुरंत बिल में जोड़ें' : '⚡ 5. Select & Add Products Directly',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">सुपरफास्ट बिलिंग: सीमेंट, सरिया, बालू, ईंट या तार सर्च करके चुनें।</p>
               <div style="font-size:12px; color:#1e40af; background:#dbeafe; padding:6px 8px; border-radius:6px;">
                 ⚡ <strong>डायरेक्ट चयन:</strong> सामग्री सेलेक्ट करते ही वह बिना किसी बटन के सीधे बिल कार्ट में जुड़ जाती है!
               </div>`
            : `<p style="margin:0 0 8px 0;">Lightning-fast billing: Type or select materials (Cement, TMT Steel, Sand, Bricks, Wire...).</p>
               <div style="font-size:12px; color:#1e40af; background:#dbeafe; padding:6px 8px; border-radius:6px;">
                 ⚡ <strong>Zero-click entry:</strong> Selecting an item adds it straight into the invoice table instantly!
               </div>`,
          side: 'top',
          align: 'start',
        },
      });

      rawSteps.push({
        targetRoute: 'sales',
        element: '#billing-cart-table',
        popover: {
          title: isHi ? '🛒 6. मात्रा, दर और गोदाम स्टॉक जाँच' : '🛒 6. Cart Items & Godown Stock Validation',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">मात्रा दर्ज करें (<strong>दशमलव यूनिट्स</strong> जैसे 1.250 टन, 45.5 cft मान्य) और दर तय करें।</p>
               <div style="font-size:12px; color:#991b1b; background:#fee2e2; padding:6px 8px; border-radius:6px;">
                 ⚠️ गोदाम में माल कम होने पर सिस्टम लाल चेतावनी देता है ताकि गलत बिल न बने।
               </div>`
            : `<p style="margin:0 0 8px 0;">Edit quantities (supports <strong>decimal units</strong> like 1.250 tonnes or 45.5 cft) and custom rates.</p>
               <div style="font-size:12px; color:#991b1b; background:#fee2e2; padding:6px 8px; border-radius:6px;">
                 ⚠️ Prevents billing mistakes by alerting in red if quantity exceeds available godown stock.
               </div>`,
          side: 'top',
          align: 'start',
        },
      });

      rawSteps.push({
        targetRoute: 'sales',
        element: '#billing-checkout-summary',
        popover: {
          title: isHi ? '🧾 7. कुल बिल और जीएसटी गणना' : '🧾 7. Bill Summary & Automatic GST',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">सबटोटल, सीजीएसटी/एसजीएसटी और कुल देय राशि की स्वचालित गणना। भारतीय जीएसटी टैक्स इनवॉइस नियमों के 100% अनुकूल।</p>`
            : `<p style="margin:0 0 8px 0;">Live breakdown of Subtotal, GST (CGST + SGST), and Grand Total with auto round-off. Fully compliant with Indian GST tax invoicing.</p>`,
          side: isMobile ? 'top' : 'left',
          align: 'start',
        },
      });

      // ==========================================
      // PILLAR 3: RECEIVE PAYMENT (/sales & /payments)
      // ==========================================
      rawSteps.push({
        targetRoute: 'sales',
        element: '#billing-payment-mode-selector',
        popover: {
          title: isHi ? '💳 8. बिल पर भुगतान का तरीका (Receive Payment)' : '💳 8. Receive Payment at Billing',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">काउंटर पर बिल बनाते समय भुगतान का माध्यम चुनें:</p>
               <div style="font-size:12.5px; display:flex; flex-direction:column; gap:4px; margin-bottom:4px;">
                 <div>💵 <strong>नकद (Cash):</strong> हाथो-हाथ नकद भुगतान प्राप्त करें।</div>
                 <div>📱 <strong>UPI:</strong> डिजिटल क्यूआर कोड भुगतान।</div>
                 <div>📒 <strong>उधारी (Credit):</strong> बकाया राशि स्वतः ग्राहक के बहीखाते में दर्ज हो जाएगी।</div>
               </div>`
            : `<p style="margin:0 0 8px 0;">Collect payment right at the counter during billing:</p>
               <div style="font-size:12.5px; display:flex; flex-direction:column; gap:4px; margin-bottom:4px;">
                 <div>💵 <strong>Cash:</strong> Cash received on the spot.</div>
                 <div>📱 <strong>UPI:</strong> Instant digital QR payment.</div>
                 <div>📒 <strong>Credit (Udhar):</strong> Automatically posts balance to customer's Khata ledger.</div>
               </div>`,
          side: isMobile ? 'top' : 'left',
          align: 'start',
        },
      });

      rawSteps.push({
        targetRoute: 'sales',
        element: '#btn-post-bill',
        popover: {
          title: isHi ? '⚡ 9. बिल बनाएं और पर्ची निकालें' : '⚡ 9. Post Bill & Print Thermal Slip',
          description: isHi
            ? `<p style="margin:0 0 8px 0;"><strong>Post Bill</strong> पर क्लिक करते ही पक्का बिल बन जाता है। तुरंत <strong>3-इंच थर्मल प्रिंटर</strong> से पर्ची निकालें या A4 इनवॉइस प्रिंट करें।</p>`
            : `<p style="margin:0 0 8px 0;">Click <strong>Post Bill</strong> to finalize the transaction. Instantly print a <strong>3-inch thermal POS receipt</strong> or standard A4 GST tax invoice.</p>`,
          side: isMobile ? 'top' : 'left',
          align: 'start',
        },
      });

      rawSteps.push({
        targetRoute: 'payments',
        element: '#btn-record-payment',
        popover: {
          title: isHi ? '💰 10. ग्राहक से उधारी भुगतान जमा करें' : '💰 10. Receive Customer Udhar Payments',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">जब ग्राहक अपनी पुरानी उधारी चुकाने आएँ, तो <strong>Record Payment</strong> दबाएँ।</p>
               <div style="font-size:12px; color:#065f46; background:#d1fae5; padding:6px 8px; border-radius:6px;">
                 ✓ ग्राहक चुनें, नकद या UPI दर्ज करें और निपटान छूट (कसर/बट्टा) 1 क्लिक में एडजस्ट करके रसीद दें।
               </div>`
            : `<p style="margin:0 0 8px 0;">When customers visit to settle their outstanding balance, click <strong>Record Payment</strong>.</p>
               <div style="font-size:12px; color:#065f46; background:#d1fae5; padding:6px 8px; border-radius:6px;">
                 ✓ Select customer, record Cash or UPI collection, and apply settlement discount (कसर/बट्टा) with 1 click!
               </div>`,
          side: isMobile ? 'bottom' : 'bottom',
          align: 'end',
        },
      });

      rawSteps.push({
        targetRoute: 'payments',
        element: '#payments-summary-cards',
        popover: {
          title: isHi ? '📈 11. दैनिक वसूली और कैश फ्लो' : '📈 11. Live Daily Collections & Cash Flow',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">आज की कुल <strong>ग्राहक वसूली (Inward)</strong>, सप्लायर भुगतान (Outward) और शुद्ध नकदी का सटीक हिसाब एक नज़र में देखें।</p>`
            : `<p style="margin:0 0 8px 0;">Monitor today's <strong>Customer Collections (Inward)</strong>, Supplier Settlements (Outward), and net cash balance in real time.</p>`,
          side: 'bottom',
          align: 'start',
        },
      });

      // ==========================================
      // CONDITIONAL: Centering & Rentals Module
      // ==========================================
      if (rentalEnabled) {
        rawSteps.push({
          targetRoute: 'rentals',
          element: '#nav-rentals',
          popover: {
            title: isHi ? '🏗️ सेंट्रिंग और सामग्री किराया (Rentals)' : '🏗️ Centring & Equipment Rentals',
            description: isHi
              ? `<p style="margin:0 0 8px 0;">बांस, बल्ली, सेंट्रिंग प्लेट्स और मशीनरी ग्राहकों को साइट पर जारी (Issue) करें और ऑटोमैटिक दैनिक किराया गिनें।</p>`
              : `<p style="margin:0 0 8px 0;">Issue scaffolding, centering plates, and machinery to client sites with automatic daily rental billing upon return.</p>`,
            side: isMobile ? 'bottom' : 'right',
            align: 'start',
          },
        });
      }

      // ==========================================
      // CONCLUSION: Offline Guarantee & Cloud Sync
      // ==========================================
      rawSteps.push({
        targetRoute: 'dashboard',
        element: '#sync-status-badge',
        popover: {
          title: isHi ? '☁️ 12. 100% ऑफलाइन और क्लाउड सुरक्षा' : '☁️ 12. 100% Offline & Auto Cloud Backup',
          description: isHi
            ? `<p style="margin:0 0 8px 0;">इंटरनेट बंद होने पर भी व्यापारखाता 100% काम करता है। इंटरनेट आते ही सभी बिल, उत्पाद और भुगतान क्लाउड में सुरक्षित सिंक हो जाते हैं।</p>
               <div style="font-size:12px; color:#2563eb; background:#eff6ff; padding:6px 8px; border-radius:6px;">
                 🎉 आप शुरुआत करने के लिए तैयार हैं! सेटिंग्स ⚙️ से आप इस टूर को कभी भी दोबारा देख सकते हैं।
               </div>`
            : `<p style="margin:0 0 8px 0;">No internet? vyapaarKhata runs 100% offline. All bills, products, and payments sync securely to the cloud when connected.</p>
               <div style="font-size:12px; color:#2563eb; background:#eff6ff; padding:6px 8px; border-radius:6px;">
                 🎉 You're ready to start! You can replay this tour anytime from <strong>Settings ⚙️</strong>.
               </div>`,
          side: 'top',
          align: 'start',
        },
      });

      // Helper to ensure target DOM element and tab/page are ready before advancing driver.js
      const ensureReadyAndAdvance = (
        targetStep: RawTourStep | undefined,
        advanceFn: () => void
      ) => {
        if (!targetStep) {
          advanceFn();
          return;
        }

        if (targetStep.targetRoute) {
          if (targetStep.targetRoute === 'sales') {
            try {
              sessionStorage.setItem('vk_pos_open_new_bill', '1');
            } catch {}
            if (isBrowser) {
              window.dispatchEvent(new CustomEvent('vk-open-pos-billing'));
              document.getElementById('tab-sales-billing')?.click();
            }
          }
          navigate(targetStep.targetRoute);
          if (targetStep.targetRoute === 'sales' && isBrowser) {
            window.dispatchEvent(new CustomEvent('vk-open-pos-billing'));
            document.getElementById('tab-sales-billing')?.click();
          }
        }

        if (!isBrowser || !targetStep.element || document.querySelector(targetStep.element)) {
          advanceFn();
          return;
        }

        let attempts = 0;
        const maxAttempts = 25; // 25 * 30ms = 750ms max
        const timer = setInterval(() => {
          attempts++;
          if (targetStep.targetRoute === 'sales') {
            window.dispatchEvent(new CustomEvent('vk-open-pos-billing'));
            document.getElementById('tab-sales-billing')?.click();
          }

          if ((targetStep.element && document.querySelector(targetStep.element)) || attempts >= maxAttempts) {
            clearInterval(timer);
            advanceFn();
          }
        }, 30);
      };

      // Build driver.js steps with seamless inter-page navigation
      const steps = rawSteps.map((step, idx) => {
        return {
          element: step.element,
          waitForElement: 1200,
          scrollIntoView: { block: 'center' as const, inline: 'center' as const },
          popover: {
            ...step.popover,
            onNextClick: (_el: any, _s: any, opts: any) => {
              const nextIdx = idx + 1;
              if (nextIdx < rawSteps.length) {
                const nextStep = rawSteps[nextIdx];
                ensureReadyAndAdvance(nextStep, () => {
                  opts.driver.moveNext();
                });
              } else {
                opts.driver.destroy();
              }
            },
            onPrevClick: (_el: any, _s: any, opts: any) => {
              const prevIdx = idx - 1;
              if (prevIdx >= 0) {
                const prevStep = rawSteps[prevIdx];
                ensureReadyAndAdvance(prevStep, () => {
                  opts.driver.movePrevious();
                });
              }
            },
          },
        };
      });

      // If initial step targets a specific route, navigate immediately
      if (rawSteps[0]?.targetRoute) {
        navigate(rawSteps[0].targetRoute);
      }

      const driverInstance: Driver = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        smoothScroll: true,
        overlayColor: 'rgba(15, 23, 42, 0.72)',
        nextBtnText: isHi ? 'आगे ➔' : 'Next ➔',
        prevBtnText: isHi ? '⬅ पीछे' : '⬅ Back',
        doneBtnText: isHi ? 'समझ गया ✓' : 'Get Started ✓',
        onDestroyStarted: () => {
          if (!hasTourQueryParam && !isDevAlwaysShow) {
            localStorage.setItem(storageKey, 'true');
          }
          driverInstance.destroy();
        },
        steps,
      });

      driverInstance.drive();
    },
    [tenantId, rentalEnabled, isHi, navigate]
  );

  // Expose global helper in browser window for quick testing in DevTools console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__replayProductTour = () => startTour(true);
    }
  }, [startTour]);

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
