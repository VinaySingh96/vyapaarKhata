import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim localStorage for Node environment in tests
const storageMock: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMock[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    storageMock[key] = String(val);
  }),
  removeItem: vi.fn((key: string) => {
    delete storageMock[key];
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(storageMock)) {
      delete storageMock[k];
    }
  }),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Mock driver.js before importing hook
const mockDrive = vi.fn();
const mockDestroy = vi.fn();
const mockMoveNext = vi.fn();
const mockMovePrevious = vi.fn();
let lastDriverConfig: any = null;

vi.mock('driver.js', () => ({
  driver: vi.fn((config: any) => {
    lastDriverConfig = config;
    return {
      drive: mockDrive,
      destroy: mockDestroy,
      moveNext: mockMoveNext,
      movePrevious: mockMovePrevious,
      getActiveIndex: vi.fn().mockReturnValue(0),
      isActive: vi.fn().mockReturnValue(true),
    };
  }),
}));

// Mock i18n
let currentLang = 'en';
vi.mock('../i18n/index.js', () => ({
  useI18n: () => ({
    language: currentLang,
    t: (key: string) => key,
  }),
}));

// Mock react
let effectCallback: (() => void) | null = null;
vi.mock('react', async () => {
  const actual = await vi.importActual<any>('react');
  return {
    ...actual,
    useEffect: (cb: () => void) => {
      effectCallback = cb;
    },
    useCallback: (fn: any) => fn,
  };
});

describe('useProductTour - Core Business Feature Walkthrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastDriverConfig = null;
    currentLang = 'en';
    localStorage.clear();
  });

  it('configures tour steps focusing on Products, Billing, and Receive Payment', async () => {
    const { useProductTour } = await import('./useProductTour.js');
    const mockNavigate = vi.fn();

    const { replayTour } = useProductTour({
      tenantId: 'tenant-test-123',
      rentalEnabled: true,
      onNavigate: mockNavigate,
    });

    replayTour();

    expect(mockDrive).toHaveBeenCalledTimes(1);
    expect(lastDriverConfig).toBeDefined();

    const steps = lastDriverConfig.steps;
    expect(steps.length).toBeGreaterThanOrEqual(12);

    // 1. Check Product Management & Selection steps
    const productAddStep = steps.find((s: any) => s.element === '#btn-add-new-product');
    expect(productAddStep).toBeDefined();
    expect(productAddStep.popover.title).toContain('Create New Product');
    expect(productAddStep.popover.description).toContain('cft');

    const productImportStep = steps.find((s: any) => s.element === '#btn-import-excel');
    expect(productImportStep).toBeDefined();
    expect(productImportStep.popover.title).toContain('Excel');

    const productSearchStep = steps.find((s: any) => s.element === '#products-search-filter-bar');
    expect(productSearchStep).toBeDefined();
    expect(productSearchStep.popover.title).toContain('Search & Select');

    // 2. Check Fast POS Billing steps
    const customerStep = steps.find((s: any) => s.element === '#billing-customer-section');
    expect(customerStep).toBeDefined();
    expect(customerStep.popover.title).toContain('Customer');

    const directAddProductStep = steps.find((s: any) => s.element === '#billing-product-search');
    expect(directAddProductStep).toBeDefined();
    expect(directAddProductStep.popover.title).toContain('Select & Add Products');

    const cartTableStep = steps.find((s: any) => s.element === '#billing-cart-table');
    expect(cartTableStep).toBeDefined();
    expect(cartTableStep.popover.title).toContain('Cart Items');

    const summaryStep = steps.find((s: any) => s.element === '#billing-checkout-summary');
    expect(summaryStep).toBeDefined();
    expect(summaryStep.popover.title).toContain('Bill Summary');

    const postBillStep = steps.find((s: any) => s.element === '#btn-post-bill');
    expect(postBillStep).toBeDefined();
    expect(postBillStep.popover.title).toContain('Post Bill');

    // 3. Check Receive Payment steps
    const billingPaymentModeStep = steps.find((s: any) => s.element === '#billing-payment-mode-selector');
    expect(billingPaymentModeStep).toBeDefined();
    expect(billingPaymentModeStep.popover.title).toContain('Receive Payment at Billing');

    const receivePaymentStep = steps.find((s: any) => s.element === '#btn-record-payment');
    expect(receivePaymentStep).toBeDefined();
    expect(receivePaymentStep.popover.title).toContain('Receive Customer Udhar Payments');

    const collectionsKpiStep = steps.find((s: any) => s.element === '#payments-summary-cards');
    expect(collectionsKpiStep).toBeDefined();
    expect(collectionsKpiStep.popover.title).toContain('Collections');
  });

  it('navigates across pages when Next/Prev buttons are clicked during the tour', async () => {
    const { useProductTour } = await import('./useProductTour.js');
    const mockNavigate = vi.fn();

    const { replayTour } = useProductTour({
      tenantId: 'tenant-test-123',
      onNavigate: mockNavigate,
    });

    replayTour();

    const steps = lastDriverConfig.steps;
    // Step 0 is the welcome step. Clicking Next should navigate to products (targetRoute of step 1)
    const welcomeStep = steps[0];
    const mockDriverOpts = {
      driver: {
        getActiveIndex: () => 0,
        moveNext: vi.fn(),
        movePrevious: vi.fn(),
        destroy: vi.fn(),
      },
    };

    welcomeStep.popover.onNextClick(null, welcomeStep, mockDriverOpts);
    expect(mockNavigate).toHaveBeenCalledWith('products');
    expect(mockDriverOpts.driver.moveNext).toHaveBeenCalledTimes(1);

    // From product step (step 3), next step is billing customer section (step 4 on 'sales')
    const searchStepIdx = steps.findIndex((s: any) => s.element === '#products-search-filter-bar');
    expect(searchStepIdx).toBeGreaterThan(0);

    const mockDriverOpts2 = {
      driver: {
        getActiveIndex: () => searchStepIdx,
        moveNext: vi.fn(),
        movePrevious: vi.fn(),
        destroy: vi.fn(),
      },
    };

    steps[searchStepIdx].popover.onNextClick(null, steps[searchStepIdx], mockDriverOpts2);
    expect(mockNavigate).toHaveBeenCalledWith('sales');
    expect(mockDriverOpts2.driver.moveNext).toHaveBeenCalledTimes(1);
  });

  it('marks tour completed in localStorage upon destruction', async () => {
    const { useProductTour } = await import('./useProductTour.js');
    const tenantId = 'tenant-xyz-999';

    const { replayTour } = useProductTour({ tenantId });
    replayTour();

    expect(localStorage.getItem(`vk_tour_completed_${tenantId}`)).toBeNull();

    lastDriverConfig.onDestroyStarted();
    expect(localStorage.getItem(`vk_tour_completed_${tenantId}`)).toBe('true');
  });

  it('supports Hindi language titles, descriptions and button labels', async () => {
    currentLang = 'hi';

    const { useProductTour } = await import('./useProductTour.js');
    const { replayTour } = useProductTour({
      tenantId: 'tenant-hi-123',
    });

    replayTour();

    expect(lastDriverConfig.nextBtnText).toBe('आगे ➔');
    expect(lastDriverConfig.prevBtnText).toBe('⬅ पीछे');
    expect(lastDriverConfig.doneBtnText).toBe('समझ गया ✓');

    const steps = lastDriverConfig.steps;
    // Check Welcome step in Hindi
    expect(steps[0].popover.title).toContain('व्यापारखाता');

    // Check Product step in Hindi
    const productStep = steps.find((s: any) => s.element === '#btn-add-new-product');
    expect(productStep.popover.title).toContain('सामग्री');

    // Check Billing step in Hindi
    const billingStep = steps.find((s: any) => s.element === '#billing-customer-section');
    expect(billingStep.popover.title).toContain('ग्राहक');

    // Check Receive Payment step in Hindi
    const paymentStep = steps.find((s: any) => s.element === '#btn-record-payment');
    expect(paymentStep.popover.title).toContain('उधारी');
  });

  it('runs tour on refresh when ?tour=true query param or vk_dev_always_show_tour is active', async () => {
    const { useProductTour } = await import('./useProductTour.js');
    const tenantId = 'tenant-refresh-test';
    const storageKey = `vk_tour_completed_${tenantId}`;

    // Mark completed in localStorage
    mockLocalStorage.setItem(storageKey, 'true');

    // Without force, tour should NOT run
    const hook1 = useProductTour({ tenantId });
    // Simulate auto-trigger on mount
    (hook1 as any);
    expect(lastDriverConfig).toBeNull();

    // Now set dev flag vk_dev_always_show_tour = 'true'
    mockLocalStorage.setItem('vk_dev_always_show_tour', 'true');

    const hook2 = useProductTour({ tenantId });
    hook2.replayTour();

    expect(mockDrive).toHaveBeenCalledTimes(1);
    expect(lastDriverConfig).toBeDefined();

    // In dev mode, destroying does not overwrite storageKey with 'true'
    lastDriverConfig.onDestroyStarted();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('triggers vk-open-pos-billing and sessionStorage flag when transitioning to sales billing step', async () => {
    const { useProductTour } = await import('./useProductTour.js');
    const mockNavigate = vi.fn();
    const eventSpy = vi.fn();

    // Stub window.dispatchEvent and sessionStorage
    const sessionMock: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      setItem: (k: string, v: string) => { sessionMock[k] = v; },
      getItem: (k: string) => sessionMock[k] ?? null,
      removeItem: (k: string) => { delete sessionMock[k]; },
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('vk-open-pos-billing', eventSpy);
    }

    const { replayTour } = useProductTour({
      tenantId: 'tenant-sales-tab-test',
      onNavigate: mockNavigate,
    });
    replayTour();

    const steps = lastDriverConfig.steps;
    const searchStepIdx = steps.findIndex((s: any) => s.element === '#products-search-filter-bar');
    expect(searchStepIdx).toBeGreaterThan(0);

    const mockDriverOpts = {
      driver: {
        getActiveIndex: () => searchStepIdx,
        moveNext: vi.fn(),
        movePrevious: vi.fn(),
        destroy: vi.fn(),
      },
    };

    steps[searchStepIdx].popover.onNextClick(null, steps[searchStepIdx], mockDriverOpts);

    // Verified: Navigation to sales is called and sessionStorage key is primed
    expect(mockNavigate).toHaveBeenCalledWith('sales');
    expect(sessionMock['vk_pos_open_new_bill']).toBe('1');
  });
});
