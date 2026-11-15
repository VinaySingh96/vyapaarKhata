import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../i18n/index.js';
import { useToast } from '../components/Toast.js';
import { Modal } from '../components/Modal.js';
import { useStore } from '../context/StoreContext.js';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect.js';

export interface BillingLine {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  nameHi?: string;
  sku: string;
  unit: string;
  unitId: string;
  quantity: number;
  price: number;
  taxRate: number;
  availableStock: number;
  reorderLevel: number;
}

interface ProductItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  nameHi?: string;
  sku: string;
  sellingPrice: number;
  totalStock: number;
  baseUnitSymbol: string;
  baseUnitId: string;
  reorderLevel: number;
  taxRate?: number;
}

interface CustomerParty {
  id: string;
  displayName: string;
  phone?: string;
  billingAddress?: string;
  currentBalance?: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  status: 'draft' | 'posted' | 'cancelled';
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid?: number;
  adjustmentAmount?: number;
  balanceDue?: number;
  paymentStatus?: 'paid' | 'partial' | 'unpaid' | 'cancelled';
  paymentMode?: string;
  postedAt?: string;
  cancelledAt?: string;
  lines?: any[];
  payments?: any[];
}

export const SalesBillingScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();
  const { storeSettings } = useStore();
  const isJewelleryShop =
    storeSettings.storeName?.toLowerCase().includes('jewel') ||
    storeSettings.tradeName?.toLowerCase().includes('jewel') ||
    (typeof window !== 'undefined' && (window.location.port === '3003' || window.location.port === '4003'));

  const [activeTab, setActiveTab] = useState<'billing' | 'history'>('billing');

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [customers, setCustomers] = useState<CustomerParty[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  // Customer selection & creation state
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('90000000-0000-0000-0000-000000000001');
  const [customCustomerName, setCustomCustomerName] = useState<string>('Acme Construction Pvt Ltd');
  const [customerPhone, setCustomerPhone] = useState<string>('+91 98765 43210');
  const [selectedVillage, setSelectedVillage] = useState<string>('MIDC Industrial Area, Pune');
  const [customVillageText, setCustomVillageText] = useState<string>('');
  const [isAddingNewVillage, setIsAddingNewVillage] = useState<boolean>(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const [villagesList, setVillagesList] = useState<string[]>([
    'MIDC Industrial Area, Pune',
    'Bavdhan',
    'Khadki',
    'Wakad',
    'Hinjewadi',
    'Chakan',
    'Pimpri',
    'Hadapsar',
    'Talegaon',
  ]);

  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank' | 'credit'>('cash');
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');

  const [lines, setLines] = useState<BillingLine[]>([]);

  // Print/Download Modal State
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Cancellation Modal State
  const [invoiceToCancel, setInvoiceToCancel] = useState<InvoiceRecord | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('Customer returned goods');
  const [isCancelling, setIsCancelling] = useState(false);

  // Payment Receipt & Adjustment Modal State
  const [invoiceForPayment, setInvoiceForPayment] = useState<InvoiceRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payAdjustmentAmount, setPayAdjustmentAmount] = useState<string>('0');
  const [payAdjustmentType, setPayAdjustmentType] = useState<string>('round_off');
  const [payPaymentMode, setPayPaymentMode] = useState<string>('cash');
  const [payReference, setPayReference] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Load products, customers and invoices
  const loadData = () => {
    // 1. Fetch products
    fetch('/api/v1/products', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: ProductItem[] = [];
          json.data.forEach((p: any) => {
            if (p.variants && p.variants.length > 0) {
              p.variants.forEach((v: any) => {
                mapped.push({
                  id: v.id,
                  productId: p.id,
                  variantId: v.id,
                  name: v.variantName || `${p.name} (${v.sku})`,
                  nameHi: v.variantNameHi || p.nameHi,
                  sku: v.sku || p.sku || 'SKU',
                  sellingPrice: v.sellingPrice !== undefined ? v.sellingPrice : (p.sellingPrice || 0),
                  totalStock: v.stockOnHand !== undefined ? v.stockOnHand : 0,
                  baseUnitSymbol: p.baseUnitSymbol || 'pcs',
                  baseUnitId: p.baseUnitId || '10000000-0000-0000-0000-000000000001',
                  reorderLevel: v.reorderLevel || p.reorderLevel || 10,
                  taxRate: p.taxRate || 18,
                });
              });
            } else {
              mapped.push({
                id: p.defaultVariantId || p.id,
                productId: p.id,
                variantId: p.defaultVariantId || p.id,
                name: p.name,
                nameHi: p.nameHi,
                sku: p.sku || 'SKU',
                sellingPrice: p.sellingPrice || 0,
                totalStock: p.totalStock !== undefined ? p.totalStock : 0,
                baseUnitSymbol: p.baseUnitSymbol || 'pcs',
                baseUnitId: p.baseUnitId || '10000000-0000-0000-0000-000000000001',
                reorderLevel: p.reorderLevel || 10,
                taxRate: p.taxRate || 18,
              });
            }
          });
          setProducts(mapped);

          // Populate initial lines if empty
          setLines((prev) => {
            if (prev.length > 0) return prev;
            const first = mapped.find((m) => m.totalStock > 0) || mapped[0];
            if (!first) return [];
            return [
              {
                id: `line-${Date.now()}-1`,
                productId: first.productId,
                variantId: first.variantId,
                name: first.name,
                nameHi: first.nameHi,
                sku: first.sku,
                unit: first.baseUnitSymbol,
                unitId: first.baseUnitId,
                quantity: first.totalStock > 0 ? 1 : 0,
                price: first.sellingPrice,
                taxRate: first.taxRate || 18,
                availableStock: first.totalStock,
                reorderLevel: first.reorderLevel,
              },
            ];
          });
        }
      })
      .catch((err) => console.warn('Could not load products:', err));

    // 2. Fetch customer parties
    fetch('/api/v1/parties', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const custs = json.data.filter((p: any) => p.partyType === 'customer' || p.partyType === 'both');
          setCustomers(custs);

          // Extract unique villages
          const villagesFromCusts = custs
            .map((c: any) => c.billingAddress)
            .filter((a: any) => Boolean(a && a.trim()));
          if (villagesFromCusts.length > 0) {
            setVillagesList((prev) => Array.from(new Set([...prev, ...villagesFromCusts])));
          }

          if (custs.length > 0 && selectedCustomerId === '90000000-0000-0000-0000-000000000001') {
            const initial = custs[0];
            setSelectedCustomerId(initial.id);
            setCustomCustomerName(initial.displayName);
            if (initial.phone) setCustomerPhone(initial.phone);
            if (initial.billingAddress) setSelectedVillage(initial.billingAddress);
          }
        }
      })
      .catch((err) => console.warn('Could not load parties:', err));

    // 3. Fetch past invoices
    fetch('/api/v1/sales/invoices?limit=50', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setInvoices(json.data);
        }
      })
      .catch((err) => console.warn('Could not load invoices:', err));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle switching customer from dropdown
  const handleSelectCustomer = (customerId: string) => {
    if (customerId === '__new__') {
      setCustomerMode('new');
      setSelectedCustomerId('');
      setCustomCustomerName('');
      setCustomerPhone('');
      setSelectedVillage(villagesList[0] || '');
      setIsAddingNewVillage(false);
      return;
    }

    setCustomerMode('existing');
    setSelectedCustomerId(customerId);
    const target = customers.find((c) => c.id === customerId);
    if (target) {
      setCustomCustomerName(target.displayName);
      setCustomerPhone(target.phone || '');
      if (target.billingAddress) {
        setSelectedVillage(target.billingAddress);
      }
    }
  };

  // Explicitly Add / Save Customer button
  const handleAddNewCustomer = async () => {
    if (!customCustomerName.trim()) {
      toast.warning('Please enter customer name');
      return;
    }

    const finalVillage = isAddingNewVillage ? customVillageText.trim() : selectedVillage.trim();
    setIsSavingCustomer(true);

    try {
      const newCustId = crypto.randomUUID();
      const res = await fetch('/api/v1/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          id: newCustId,
          displayName: customCustomerName.trim(),
          partyType: 'customer',
          billingAddress: finalVillage || undefined,
          phone: customerPhone.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to add customer');
      }

      const newParty: CustomerParty = {
        id: newCustId,
        displayName: customCustomerName.trim(),
        billingAddress: finalVillage || undefined,
        phone: customerPhone.trim() || undefined,
      };

      setCustomers((prev) => [newParty, ...prev]);
      setSelectedCustomerId(newCustId);
      setCustomerMode('existing');

      if (finalVillage && !villagesList.includes(finalVillage)) {
        setVillagesList((prev) => [...prev, finalVillage]);
        setSelectedVillage(finalVillage);
      }
      setIsAddingNewVillage(false);
      setCustomVillageText('');

      toast.success(`Customer "${newParty.displayName}" added successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Could not add customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Add Item handler
  const handleAddItem = (itemId?: string) => {
    setInvoiceError(null);
    const targetProduct = products.find((p) => p.id === itemId) || products.find((p) => p.totalStock > 0) || products[0];
    if (!targetProduct) return;

    // Check if variant is already in bill
    const existingIndex = lines.findIndex((l) => l.variantId === targetProduct.variantId);
    if (existingIndex >= 0) {
      const updated = [...lines];
      if (updated[existingIndex].quantity < targetProduct.totalStock) {
        updated[existingIndex].quantity += 1;
        setLines(updated);
      } else {
        toast.warning(`Cannot add more. Available stock for "${targetProduct.name}" is ${targetProduct.totalStock} ${targetProduct.baseUnitSymbol}`);
      }
    } else {
      const newLine: BillingLine = {
        id: `line-${Date.now()}-${lines.length + 1}`,
        productId: targetProduct.productId,
        variantId: targetProduct.variantId,
        name: targetProduct.name,
        nameHi: targetProduct.nameHi,
        sku: targetProduct.sku,
        unit: targetProduct.baseUnitSymbol,
        unitId: targetProduct.baseUnitId,
        quantity: targetProduct.totalStock > 0 ? 1 : 0,
        price: targetProduct.sellingPrice,
        taxRate: targetProduct.taxRate || 18,
        availableStock: targetProduct.totalStock,
        reorderLevel: targetProduct.reorderLevel,
      };
      setLines([...lines, newLine]);
    }
  };

  // Remove Item handler
  const handleRemoveLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  // Change product in an existing line
  const handleLineProductChange = (lineId: string, newItemId: string) => {
    const targetProduct = products.find((p) => p.id === newItemId);
    if (!targetProduct) return;

    setLines(
      lines.map((l) =>
        l.id === lineId
          ? {
              ...l,
              productId: targetProduct.productId,
              variantId: targetProduct.variantId,
              name: targetProduct.name,
              nameHi: targetProduct.nameHi,
              sku: targetProduct.sku,
              unit: targetProduct.baseUnitSymbol,
              unitId: targetProduct.baseUnitId,
              price: targetProduct.sellingPrice,
              taxRate: targetProduct.taxRate || 18,
              availableStock: targetProduct.totalStock,
              reorderLevel: targetProduct.reorderLevel,
              quantity: targetProduct.totalStock > 0 ? Math.min(l.quantity || 1, targetProduct.totalStock) : 0,
            }
          : l
      )
    );
  };

  // Quantity and Price change
  const handleUpdateLine = (id: string, field: 'quantity' | 'price', value: number) => {
    setLines(
      lines.map((l) => {
        if (l.id !== id) return l;
        if (field === 'quantity') {
          const val = Math.max(0, value);
          if (l.availableStock > 0 && val > l.availableStock) {
            toast.warning(`Quantity cannot exceed available stock (${l.availableStock} ${l.unit})`);
          }
          return {
            ...l,
            quantity: val,
          };
        }
        return {
          ...l,
          [field]: Math.max(0, value),
        };
      })
    );
  };

  // Check if any line has stock or quantity errors
  const hasStockError = useMemo(() => {
    return lines.some((l) => l.availableStock <= 0 || l.quantity > l.availableStock || l.quantity <= 0);
  }, [lines]);

  // Options for searchable product select
  const productOptions = useMemo<SelectOption[]>(() => {
    return products.map((p) => {
      const isLow = p.totalStock <= p.reorderLevel;
      const isOutOfStock = p.totalStock <= 0;
      return {
        value: p.id,
        label: p.name,
        sublabel: p.nameHi ? `${p.nameHi} • ${p.sku}` : p.sku,
        price: p.sellingPrice,
        unit: p.baseUnitSymbol,
        badge: isOutOfStock ? '0 stock' : `${p.totalStock} ${p.baseUnitSymbol}`,
        badgeType: isOutOfStock ? 'danger' : isLow ? 'warning' : 'success',
      };
    });
  }, [products]);

  // Options for searchable customer select
  const customerOptions = useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = [
      {
        value: '__new__',
        label: `+ ${t('sales.newCustomer')}`,
        badge: 'New',
        badgeType: 'neutral',
      },
    ];
    customers.forEach((c) => {
      list.push({
        value: c.id,
        label: c.displayName,
        sublabel: c.billingAddress || c.phone || undefined,
        badge: c.currentBalance ? `₹${c.currentBalance.toLocaleString()}` : undefined,
        badgeType: 'neutral',
      });
    });
    return list;
  }, [customers, t]);

  // Cart financial summary
  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  }, [lines]);

  const gst = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.quantity * l.price * ((l.taxRate || 18) / 100), 0);
  }, [lines]);

  const grandTotal = useMemo(() => {
    return subtotal + gst;
  }, [subtotal, gst]);

  // Post invoice & open PDF/Print Modal
  const handleGenerateInvoice = async () => {
    setInvoiceError(null);
    setInvoiceSuccess(null);

    if (lines.length === 0) {
      const msg = 'Please add at least one item to generate a sale bill.';
      setInvoiceError(msg);
      toast.warning(msg);
      return;
    }

    for (const line of lines) {
      if (line.quantity <= 0) {
        const msg = `Quantity for "${line.name}" must be greater than 0.`;
        setInvoiceError(msg);
        toast.warning(msg);
        return;
      }
      if (line.quantity > line.availableStock) {
        const msg = t('sales.outOfStock', { avail: line.availableStock, req: line.quantity }) + ` (${line.name})`;
        setInvoiceError(msg);
        toast.error(msg);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let finalCustomerId = selectedCustomerId;
      const finalVillage = isAddingNewVillage ? customVillageText.trim() : selectedVillage.trim();

      // If customer is new or not in database, create party dynamically first
      if (customerMode === 'new' || !finalCustomerId || finalCustomerId === '__new__') {
        const generatedPartyId = crypto.randomUUID();
        const partyName = customCustomerName.trim() || 'Counter Customer';

        const partyRes = await fetch('/api/v1/parties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          },
          body: JSON.stringify({
            id: generatedPartyId,
            displayName: partyName,
            partyType: 'customer',
            billingAddress: finalVillage || undefined,
            phone: customerPhone.trim() || undefined,
          }),
        });

        const partyJson = await partyRes.json();
        if (!partyJson.success) {
          throw new Error(partyJson.error?.message || 'Failed to auto-create customer');
        }

        finalCustomerId = generatedPartyId;
        const newParty: CustomerParty = {
          id: generatedPartyId,
          displayName: partyName,
          billingAddress: finalVillage || undefined,
          phone: customerPhone.trim() || undefined,
        };
        setCustomers((prev) => [newParty, ...prev]);
        setSelectedCustomerId(generatedPartyId);
        setCustomerMode('existing');

        if (finalVillage && !villagesList.includes(finalVillage)) {
          setVillagesList((prev) => [...prev, finalVillage]);
        }
      }

      const invoiceId = crypto.randomUUID();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create draft invoice
      const createRes = await fetch('/api/v1/sales/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          id: invoiceId,
          businessLocationId: '60000000-0000-0000-0000-000000000001',
          invoiceNumber,
          customerId: finalCustomerId,
          subtotal,
          taxTotal: gst,
          grandTotal,
          lines: lines.map((l) => ({
            id: crypto.randomUUID(),
            productId: l.productId,
            variantId: l.variantId,
            locationId: '70000000-0000-0000-0000-000000000001',
            quantity: l.quantity,
            unitId: l.unitId,
            unitPrice: l.price,
            taxAmount: l.quantity * l.price * ((l.taxRate || 18) / 100),
            lineTotal: l.quantity * l.price * (1 + (l.taxRate || 18) / 100),
          })),
        }),
      });

      const createJson = await createRes.json();
      if (!createJson.success) {
        throw new Error(createJson.error?.message || 'Failed to create sales invoice');
      }

      // 2. Post invoice atomically
      const postRes = await fetch(`/api/v1/sales/invoices/${invoiceId}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({}),
      });

      const postJson = await postRes.json();
      if (!postJson.success) {
        throw new Error(postJson.error?.message || 'Failed to post sales invoice');
      }

      // Build printable invoice object
      const printableInvoice = {
        id: invoiceId,
        invoiceNumber,
        postedAt: new Date().toISOString(),
        paymentMode,
        status: 'posted',
        customerId: finalCustomerId,
        customerName: customCustomerName || 'Counter Customer',
        customerAddress: finalVillage || 'Local',
        customerPhone: customerPhone || '-',
        subtotal,
        taxTotal: gst,
        grandTotal,
        lines: lines.map((l, idx) => ({
          sno: idx + 1,
          name: l.name,
          nameHi: l.nameHi,
          sku: l.sku,
          unit: l.unit,
          quantity: l.quantity,
          price: l.price,
          taxRate: l.taxRate || 18,
          taxAmount: l.quantity * l.price * ((l.taxRate || 18) / 100),
          lineTotal: l.quantity * l.price * (1 + (l.taxRate || 18) / 100),
        })),
      };

      const successMsg = `${t('sales.invoiceSuccess', { no: invoiceNumber })} | ₹ ${grandTotal.toLocaleString()}`;
      setInvoiceSuccess(successMsg);
      toast.success(successMsg);

      // Open Print / PDF Modal immediately
      setSelectedInvoiceForModal(printableInvoice);
      setIsPrintModalOpen(true);

      // Reset cart and reload live data
      setLines([]);
      loadData();
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred while posting invoice';
      setInvoiceError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open existing invoice in Print Modal
  const handleViewInvoiceModal = async (inv: InvoiceRecord) => {
    try {
      const res = await fetch(`/api/v1/sales/invoices/${inv.id}`, {
        headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedInvoiceForModal({
          ...json.data,
          paymentMode: inv.paymentMode || 'Cash',
          lines: (json.data.lines || []).map((l: any, idx: number) => ({
            sno: idx + 1,
            name: l.productName || 'Catalog Item',
            sku: l.sku || 'SKU',
            unit: l.unitSymbol || 'pcs',
            quantity: l.quantity,
            price: l.unitPrice,
            taxRate: 18,
            taxAmount: l.taxAmount,
            lineTotal: l.lineTotal,
          })),
        });
        setIsPrintModalOpen(true);
      } else {
        setSelectedInvoiceForModal(inv);
        setIsPrintModalOpen(true);
      }
    } catch (err) {
      setSelectedInvoiceForModal(inv);
      setIsPrintModalOpen(true);
    }
  };

  // Handle invoice cancellation (soft delete + inventory restoral)
  const handleConfirmCancelInvoice = async () => {
    if (!invoiceToCancel) return;
    setIsCancelling(true);

    try {
      const res = await fetch(`/api/v1/sales/invoices/${invoiceToCancel.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to cancel invoice');
      }

      toast.success(t('sales.cancelledSuccess'));
      setIsCancelModalOpen(false);
      setInvoiceToCancel(null);

      // Refresh invoice list and inventory balances
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel invoice');
    } finally {
      setIsCancelling(false);
    }
  };

  // Open Receive Payment & Adjustment Modal
  const handleOpenPaymentModal = (inv: InvoiceRecord) => {
    const balDue =
      inv.balanceDue !== undefined
        ? inv.balanceDue
        : Math.max(0, inv.grandTotal - ((inv.amountPaid || 0) + (inv.adjustmentAmount || 0)));
    setInvoiceForPayment(inv);
    setPayAmount(balDue > 0 ? balDue.toFixed(2) : '0');
    setPayAdjustmentAmount('0');
    setPayAdjustmentType('round_off');
    setPayPaymentMode('cash');
    setPayReference('');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  // Helper: auto-calculate Kasar / Round-off difference
  const handleSetQuickKasar = () => {
    if (!invoiceForPayment) return;
    const balDue =
      invoiceForPayment.balanceDue !== undefined
        ? invoiceForPayment.balanceDue
        : Math.max(
            0,
            invoiceForPayment.grandTotal -
              ((invoiceForPayment.amountPaid || 0) + (invoiceForPayment.adjustmentAmount || 0))
          );
    const enteredPay = parseFloat(payAmount) || 0;
    if (enteredPay < balDue) {
      const remainingDiff = Math.max(0, balDue - enteredPay);
      setPayAdjustmentAmount(remainingDiff.toFixed(2));
    }
  };

  // Submit Receive Payment & Adjustment
  const handleConfirmReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForPayment) return;

    const amt = parseFloat(payAmount) || 0;
    const adj = parseFloat(payAdjustmentAmount) || 0;

    if (amt <= 0 && adj <= 0) {
      toast.warning('Please enter a payment amount or adjustment greater than 0');
      return;
    }

    const balDue =
      invoiceForPayment.balanceDue !== undefined
        ? invoiceForPayment.balanceDue
        : Math.max(
            0,
            invoiceForPayment.grandTotal -
              ((invoiceForPayment.amountPaid || 0) + (invoiceForPayment.adjustmentAmount || 0))
          );

    if (amt + adj > balDue + 0.05) {
      toast.warning(
        `Total settlement (₹${(amt + adj).toFixed(2)}) cannot exceed balance due (₹${balDue.toFixed(2)})`
      );
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch(`/api/v1/sales/invoices/${invoiceForPayment.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          amount: amt,
          adjustmentAmount: adj,
          adjustmentType: adj > 0 ? payAdjustmentType : undefined,
          paymentMode: payPaymentMode,
          referenceNumber: payReference.trim() || undefined,
          notes: payNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to record payment');
      }

      toast.success(
        `Payment of ₹${amt.toLocaleString()} ${
          adj > 0 ? `(+ ₹${adj.toLocaleString()} adjustment)` : ''
        } recorded successfully!`
      );
      setIsPaymentModalOpen(false);
      setInvoiceForPayment(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error recording payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Print invoice handler
  const handlePrint = () => {
    const printContent = document.getElementById('printable-invoice-content');
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=850,height=950');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tax Invoice - ${selectedInvoiceForModal?.invoiceNumber || 'Document'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #d1d5db; padding: 8px 12px; font-size: 13px; }
            th { background-color: #f3f4f6; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 300);
    } else {
      window.print();
    }
  };

  // Download invoice as standalone printable HTML
  const handleDownloadInvoice = () => {
    const printContent = document.getElementById('printable-invoice-content');
    if (!printContent) return;

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${selectedInvoiceForModal?.invoiceNumber || 'Document'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #111827; max-width: 820px; margin: auto; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; font-size: 13px; }
    th { background-color: #f9fafb; font-weight: 600; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
  </style>
</head>
<body>
  ${printContent.innerHTML}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${selectedInvoiceForModal?.invoiceNumber || 'receipt'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Invoice ${selectedInvoiceForModal?.invoiceNumber} downloaded!`);
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Top Header & Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            {t('sales.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('sales.subtitle')}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', backgroundColor: '#e5e7eb', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('billing')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'billing' ? '#ffffff' : 'transparent',
              color: activeTab === 'billing' ? '#1d4ed8' : '#4b5563',
              boxShadow: activeTab === 'billing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t('sales.tabNewBill')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#1d4ed8' : '#4b5563',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t('sales.tabHistory')} ({invoices.length})
          </button>
        </div>
      </div>

      {invoiceSuccess && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            color: '#065f46',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>✓ {invoiceSuccess}</span>
          {selectedInvoiceForModal && (
            <button
              onClick={() => setIsPrintModalOpen(true)}
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12.5px',
              }}
            >
              🖨️ View & Print Invoice
            </button>
          )}
        </div>
      )}

      {invoiceError && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          ✕ {invoiceError}
        </div>
      )}

      {/* TAB 1: POS BILLING SCREEN */}
      {activeTab === 'billing' && (
        <div className="vk-pos-layout">
          {/* Left Column: Cart & Item Line drafting */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '20px',
            }}
          >
            {/* Customer Details Box */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                  👤 {t('sales.customer')}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('existing');
                      if (customers.length > 0) {
                        setSelectedCustomerId(customers[0].id);
                        setCustomCustomerName(customers[0].displayName);
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: customerMode === 'existing' ? '#2563eb' : '#ffffff',
                      color: customerMode === 'existing' ? '#ffffff' : '#475569',
                    }}
                  >
                    {t('sales.selectExisting')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('new');
                      setSelectedCustomerId('');
                      setCustomCustomerName('');
                      setCustomerPhone('');
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: customerMode === 'new' ? '#2563eb' : '#ffffff',
                      color: customerMode === 'new' ? '#ffffff' : '#475569',
                    }}
                  >
                    {t('sales.newCustomer')}
                  </button>
                </div>
              </div>

              {customerMode === 'existing' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      {t('sales.customer')}
                    </label>
                    <SearchableSelect
                      options={customerOptions}
                      value={selectedCustomerId}
                      onChange={handleSelectCustomer}
                      placeholder={t('sales.customer')}
                      searchPlaceholder="Search customer by name, phone..."
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      {t('sales.village')}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedVillage || 'Local / MIDC'}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* New Customer Mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        {t('sales.customerName')} *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Patil / Kisan Traders"
                        value={customCustomerName}
                        onChange={(e) => setCustomCustomerName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        {t('sales.customerPhone')}
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98765 00000"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        {t('sales.village')} (Dropdown & Custom)
                      </label>
                      {!isAddingNewVillage ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={selectedVillage}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                setIsAddingNewVillage(true);
                              } else {
                                setSelectedVillage(e.target.value);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            {villagesList.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                            <option value="__add_new__">{t('sales.newVillage')}</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsAddingNewVillage(true)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              backgroundColor: '#f1f5f9',
                            }}
                          >
                            + New Village
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder={t('sales.enterNewVillage')}
                            value={customVillageText}
                            onChange={(e) => setCustomVillageText(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #2563eb',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setIsAddingNewVillage(false)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              cursor: 'pointer',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddNewCustomer}
                      disabled={isSavingCustomer || !customCustomerName.trim()}
                      style={{
                        padding: '9px 16px',
                        backgroundColor: isSavingCustomer || !customCustomerName.trim() ? '#94a3b8' : '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isSavingCustomer || !customCustomerName.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSavingCustomer ? 'Saving...' : t('sales.btnAddCustomer')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items Table - Dedicated Scrollable Box */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#f8fafc',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
                      <th style={{ padding: '10px 12px' }}>{t('sales.itemDesc')}</th>
                      <th style={{ padding: '10px 12px', width: '100px' }}>{t('sales.available')}</th>
                      <th style={{ padding: '10px 12px', width: '130px', textAlign: 'center' }}>
                        {isJewelleryShop ? 'Qty / Wt (g/pcs)' : t('sales.qty')}
                      </th>
                      <th style={{ padding: '10px 12px', width: '110px', textAlign: 'right' }}>{t('sales.rate')}</th>
                      <th style={{ padding: '10px 12px', width: '110px', textAlign: 'right' }}>{t('sales.total')}</th>
                      <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                          No materials added to this invoice yet. Select items below to add directly.
                        </td>
                      </tr>
                    ) : (
                      lines.map((line) => {
                        const isOutOfStock = line.availableStock <= 0;
                        const isExceedingStock = line.quantity > line.availableStock;
                        const hasRowError = isOutOfStock || isExceedingStock || line.quantity <= 0;

                        return (
                          <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', minWidth: '260px' }}>
                              <SearchableSelect
                                options={productOptions}
                                value={line.variantId || line.productId}
                                onChange={(val) => handleLineProductChange(line.id, val)}
                                placeholder="Select item..."
                                searchPlaceholder="Search product or SKU..."
                                isInvalid={isOutOfStock}
                                errorMessage={isOutOfStock ? 'Item is out of stock in godown' : undefined}
                              />
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                color: line.availableStock <= line.reorderLevel ? '#dc2626' : '#16a34a',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {line.unit === 'g' || line.unit === 'kg' ? Number(line.availableStock).toFixed(3) : line.availableStock} {line.unit}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step={line.unit === 'g' || line.unit === 'kg' || line.unit === 'ratti' || line.unit === 'ct' ? '0.001' : '1'}
                                    max={line.availableStock}
                                    value={line.quantity}
                                    onChange={(e) => handleUpdateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    style={{
                                      width: '85px',
                                      padding: '6px 8px',
                                      borderRadius: '4px',
                                      border: hasRowError ? '1.5px solid #dc2626' : '1px solid #d1d5db',
                                      backgroundColor: hasRowError ? '#fef2f2' : '#ffffff',
                                      textAlign: 'center',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                    }}
                                  />
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{line.unit}</span>
                                </div>
                                {isOutOfStock ? (
                                  <span style={{ color: '#dc2626', fontSize: '10.5px', fontWeight: 600, marginTop: '3px', whiteSpace: 'nowrap' }}>
                                    ❌ Out of stock
                                  </span>
                                ) : isExceedingStock ? (
                                  <span style={{ color: '#dc2626', fontSize: '10.5px', fontWeight: 600, marginTop: '3px', whiteSpace: 'nowrap' }}>
                                    ⚠️ Max: {line.availableStock}
                                  </span>
                                ) : line.quantity <= 0 ? (
                                  <span style={{ color: '#dc2626', fontSize: '10.5px', fontWeight: 600, marginTop: '3px', whiteSpace: 'nowrap' }}>
                                    ⚠️ Min: {line.unit === 'g' ? '0.001' : '1'}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={line.price}
                                onChange={(e) => handleUpdateLine(line.id, 'price', parseFloat(e.target.value) || 0)}
                                style={{
                                  width: '85px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #d1d5db',
                                  textAlign: 'right',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ₹ {(line.quantity * line.price).toLocaleString()}
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(line.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                  padding: '2px 6px',
                                }}
                                title="Remove item"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Direct Material Search & Add Bar - Direct Selection Without Button Click */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚡</span>
                  <span>Add Material Directly to Invoice:</span>
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Selecting an item adds it instantly (no button click needed)
                </span>
              </div>

              <SearchableSelect
                options={productOptions}
                value=""
                onChange={(val) => {
                  if (val) {
                    handleAddItem(val);
                  }
                }}
                placeholder="🔍 Click or type to search material (Cement, TMT Steel, Sand, Gitti, Bricks, Wire...)"
                searchPlaceholder="Search material name, grade, size, or SKU..."
              />
            </div>
          </div>

          {/* Right Column: Checkout & Bill Summary */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'sticky',
              top: '20px',
              alignSelf: 'start',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                🧾 Summary & Checkout
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>{t('sales.subtotal')}</span>
                  <span>₹ {subtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>{t('sales.gst')} (18% Avg)</span>
                  <span>₹ {gst.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#111827',
                    paddingTop: '12px',
                    borderTop: '2px solid #e5e7eb',
                  }}
                >
                  <span>{t('sales.grandTotal')}</span>
                  <span style={{ color: '#2563eb' }}>₹ {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '8px' }}>
                  {t('sales.paymentMode')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['cash', 'upi', 'bank', 'credit'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '6px',
                        border: paymentMode === mode ? '2px solid #2563eb' : '1px solid #d1d5db',
                        backgroundColor: paymentMode === mode ? '#eff6ff' : '#ffffff',
                        color: paymentMode === mode ? '#1d4ed8' : '#374151',
                        fontWeight: 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {mode === 'cash' && t('sales.modeCash')}
                      {mode === 'upi' && t('sales.modeUpi')}
                      {mode === 'bank' && t('sales.modeBank')}
                      {mode === 'credit' && t('sales.modeCredit')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hasStockError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#991b1b',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⚠️ Cannot post invoice: One or more items exceed available godown stock or are out of stock.</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={isSubmitting || lines.length === 0 || hasStockError}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: isSubmitting || lines.length === 0 || hasStockError ? '#9ca3af' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: isSubmitting || lines.length === 0 || hasStockError ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {isSubmitting ? 'Posting...' : t('sales.postBill')}
              </button>

              <button
                type="button"
                onClick={() => setLines([])}
                disabled={lines.length === 0}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: 'none',
                  fontSize: '12.5px',
                  cursor: lines.length === 0 ? 'default' : 'pointer',
                }}
              >
                {t('sales.clearCart')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES & HISTORY */}
      {activeTab === 'history' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              📋 {t('sales.tabHistory')} ({invoices.length})
            </h3>
            <button
              onClick={() => setActiveTab('billing')}
              style={{
                padding: '6px 14px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              + Create New Bill
            </button>
          </div>

          {/* History KPI Cards */}
          {(() => {
            const validInvs = invoices.filter((i) => i.status !== 'cancelled');
            const totalInvoiced = validInvs.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
            const totalPaid = validInvs.reduce((acc, i) => acc + (i.amountPaid || 0), 0);
            const totalAdjusted = validInvs.reduce((acc, i) => acc + (i.adjustmentAmount || 0), 0);
            const totalDue = validInvs.reduce((acc, i) => {
              const due =
                i.balanceDue !== undefined
                  ? i.balanceDue
                  : Math.max(0, (i.grandTotal || 0) - ((i.amountPaid || 0) + (i.adjustmentAmount || 0)));
              return acc + due;
            }, 0);

            return (
              <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Total Invoiced</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    ₹ {totalInvoiced.toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: 500 }}>Cash/Bank Received</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                    ₹ {totalPaid.toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: '#eef2ff', padding: '14px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                  <div style={{ fontSize: '12px', color: '#3730a3', fontWeight: 500 }}>Kasar / Adjustments</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#4338ca', marginTop: '4px' }}>
                    ₹ {totalAdjusted.toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff1f2', padding: '14px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: '12px', color: '#9f1239', fontWeight: 500 }}>Net Outstanding Due</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#e11d48', marginTop: '4px' }}>
                    ₹ {totalDue.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="vk-table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280' }}>
                  <th style={{ padding: '10px 12px' }}>{t('sales.invoiceNo')}</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>{t('sales.customerNameAddress')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Bill</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('sales.paidAndAdjusted')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('sales.balanceDue')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('sales.paymentStatus')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('sales.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                      No sales invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const paid = inv.amountPaid || 0;
                    const adj = inv.adjustmentAmount || 0;
                    const totalSettled = paid + adj;
                    const balDue =
                      inv.balanceDue !== undefined
                        ? inv.balanceDue
                        : Math.max(0, (inv.grandTotal || 0) - totalSettled);

                    const payStatus =
                      inv.status === 'cancelled'
                        ? 'cancelled'
                        : inv.paymentStatus ||
                          (balDue <= 0.001 ? 'paid' : totalSettled > 0 ? 'partial' : 'unpaid');

                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#111827' }}>
                          <div>{inv.invoiceNumber}</div>
                          {inv.status === 'cancelled' && (
                            <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700 }}>CANCELLED</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', color: '#4b5563', fontSize: '12px' }}>
                          {inv.postedAt ? new Date(inv.postedAt).toLocaleString() : 'Just now'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{inv.customerName || 'Counter Customer'}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            📍 {inv.customerAddress || 'Local'} {inv.customerPhone ? `• ${inv.customerPhone}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                          ₹ {(inv.grandTotal ?? 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#059669' }}>₹ {paid.toLocaleString()}</div>
                          {adj > 0 && (
                            <div style={{ fontSize: '11px', color: '#4338ca', fontWeight: 600 }}>
                              + ₹ {adj.toLocaleString()} (Kasar)
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontWeight: 800,
                            color: balDue <= 0.001 ? '#059669' : '#dc2626',
                          }}
                        >
                          ₹ {balDue.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {payStatus === 'paid' && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              ✓ PAID
                            </span>
                          )}
                          {payStatus === 'partial' && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                              }}
                            >
                              ⏳ PARTIAL
                            </span>
                          )}
                          {payStatus === 'unpaid' && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                              }}
                            >
                              ⚠️ UNPAID
                            </span>
                          )}
                          {payStatus === 'cancelled' && (
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                              }}
                            >
                              VOID
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleViewInvoiceModal(inv)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: '#2563eb',
                              }}
                              title="View and Print Invoice"
                            >
                              👁️ View
                            </button>

                            {inv.status === 'posted' && balDue > 0.001 && (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(inv)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  border: '1px solid #a7f3d0',
                                  backgroundColor: '#ecfdf5',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  color: '#065f46',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Receive Payment & Adjustment"
                              >
                                💳 Pay
                              </button>
                            )}

                            {inv.status === 'posted' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInvoiceToCancel(inv);
                                  setIsCancelModalOpen(true);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#fef2f2',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  color: '#dc2626',
                                }}
                                title="Cancel / Void Invoice"
                              >
                                🗑️ Void
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRINT & DOWNLOAD INVOICE MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={t('sales.invoicePreview')}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Status: {selectedInvoiceForModal?.status?.toUpperCase()}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('sales.printInvoice')}
              </button>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('sales.downloadInvoice')}
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('btn.close')}
              </button>
            </div>
          </div>
        }
      >
        {selectedInvoiceForModal && (
          <div
            id="printable-invoice-content"
            style={{
              padding: '16px',
              backgroundColor: '#ffffff',
              color: '#111827',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {/* Store & Tax Invoice Header */}
            <div style={{ borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e3a8a' }}>
                    {storeSettings?.storeName || 'vyapaarKhata Wholesale Depot'}
                  </h1>
                  <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                    {storeSettings?.address || 'MIDC Industrial Area, Pune, Maharashtra'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563' }}>
                    Phone: {storeSettings?.phone || '+91 98765 43210'} | GSTIN: {storeSettings?.gstin || '27AABCA1234F1Z8'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: selectedInvoiceForModal.status === 'cancelled' ? '#fee2e2' : '#dbeafe',
                      color: selectedInvoiceForModal.status === 'cancelled' ? '#991b1b' : '#1e40af',
                      fontWeight: 800,
                      fontSize: '13px',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    TAX INVOICE {selectedInvoiceForModal.status === 'cancelled' ? '(CANCELLED)' : ''}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>
                    #{selectedInvoiceForModal.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6b7280' }}>
                    Date: {new Date(selectedInvoiceForModal.postedAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To Customer Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '16px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Billed To / Customer Details:
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedInvoiceForModal.customerName || 'Counter Customer'}
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Village / Area: {selectedInvoiceForModal.customerAddress || 'Local Area'}
                </div>
                {selectedInvoiceForModal.customerPhone && (
                  <div style={{ fontSize: '12px', color: '#475569' }}>Phone: {selectedInvoiceForModal.customerPhone}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Invoice Details:
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                  Payment Mode: <strong>{(selectedInvoiceForModal.paymentMode || 'Cash').toUpperCase()}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Status: <strong>{selectedInvoiceForModal.status.toUpperCase()}</strong>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px', textAlign: 'center', width: '35px' }}>#</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Unit</th>
                  <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right', width: '80px' }}>Rate (₹)</th>
                  <th style={{ padding: '8px', textAlign: 'right', width: '65px' }}>GST</th>
                  <th style={{ padding: '8px', textAlign: 'right', width: '90px' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoiceForModal.lines || []).map((line: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>
                      <div>{line.name}</div>
                      {line.nameHi && (
                        <div style={{ fontSize: '11px', color: '#4338ca', fontWeight: 500 }}>{line.nameHi}</div>
                      )}
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>SKU: {line.sku}</div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{line.unit}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>
                      {line.unit === 'g' || line.unit === 'kg' || (Number(line.quantity) % 1 !== 0)
                        ? Number(line.quantity).toFixed(3)
                        : line.quantity}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>₹{line.price?.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                      {line.taxRate !== undefined ? `${line.taxRate}%` : isJewelleryShop ? '3%' : '18%'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                      ₹{(line.lineTotal || line.quantity * line.price * (1 + (line.taxRate || (isJewelleryShop ? 3 : 18)) / 100)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Breakdown */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Taxable Subtotal:</span>
                  <span>₹ {selectedInvoiceForModal.subtotal?.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>CGST (9%):</span>
                  <span>₹ {(selectedInvoiceForModal.taxTotal / 2).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>SGST (9%):</span>
                  <span>₹ {(selectedInvoiceForModal.taxTotal / 2).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '16px',
                    color: '#0f172a',
                    paddingTop: '8px',
                    borderTop: '2px solid #0f172a',
                  }}
                >
                  <span>Grand Total:</span>
                  <span style={{ color: '#1e3a8a' }}>₹ {selectedInvoiceForModal.grandTotal?.toFixed(2)}</span>
                </div>

                {((selectedInvoiceForModal.amountPaid || 0) > 0 || (selectedInvoiceForModal.adjustmentAmount || 0) > 0) && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}>
                      <span>Amount Received:</span>
                      <span>₹ {(selectedInvoiceForModal.amountPaid || 0).toFixed(2)}</span>
                    </div>
                    {(selectedInvoiceForModal.adjustmentAmount || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4338ca', fontWeight: 600 }}>
                        <span>Kasar / Adjustment:</span>
                        <span>₹ {(selectedInvoiceForModal.adjustmentAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                        color: (selectedInvoiceForModal.balanceDue || 0) <= 0.01 ? '#059669' : '#dc2626',
                        borderTop: '1px dashed #cbd5e1',
                        paddingTop: '4px',
                      }}
                    >
                      <span>Balance Due:</span>
                      <span>₹ {(selectedInvoiceForModal.balanceDue || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer / Signatory */}
            <div style={{ marginTop: '30px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Thank you for your business! Goods once sold will not be returned without bill.
              </div>
              <div style={{ textAlign: 'center', width: '180px' }}>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontSize: '11px', fontWeight: 600 }}>
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM CANCELLATION MODAL */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={t('sales.cancelConfirmTitle')}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancelling}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              {t('btn.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmCancelInvoice}
              disabled={isCancelling}
              style={{
                backgroundColor: isCancelling ? '#fca5a5' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isCancelling ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              {isCancelling ? 'Cancelling...' : t('sales.confirmCancelBtn')}
            </button>
          </div>
        }
      >
        <div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
            {t('sales.cancelConfirmMsg')}
          </p>

          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
            <div>Invoice: <strong>{invoiceToCancel?.invoiceNumber}</strong></div>
            <div>Customer: <strong>{invoiceToCancel?.customerName}</strong></div>
            <div>Amount: <strong>₹ {(invoiceToCancel?.grandTotal ?? 0).toLocaleString()}</strong></div>
          </div>

          <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
            Reason for Cancellation:
          </label>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer returned items / billing correction"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </Modal>

      {/* RECEIVE PAYMENT & ADJUSTMENT MODAL */}
      {(() => {
        const payCurBal = invoiceForPayment
          ? invoiceForPayment.balanceDue !== undefined
            ? invoiceForPayment.balanceDue
            : Math.max(
                0,
                (invoiceForPayment.grandTotal || 0) -
                  ((invoiceForPayment.amountPaid || 0) + (invoiceForPayment.adjustmentAmount || 0))
              )
          : 0;
        const payEnteredPay = parseFloat(payAmount) || 0;
        const payEnteredAdj = parseFloat(payAdjustmentAmount) || 0;
        const payTotalSettling = payEnteredPay + payEnteredAdj;
        const payRemainingBal = Math.max(0, payCurBal - payTotalSettling);
        const payIsOver = invoiceForPayment ? payTotalSettling > payCurBal + 0.01 : false;
        const isPayBtnDisabled = isSubmittingPayment || payIsOver || payTotalSettling <= 0;

        return (
          <Modal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            title={t('sales.receivePaymentModalTitle')}
            subtitle={
              invoiceForPayment
                ? `Receive settlement for Invoice ${invoiceForPayment.invoiceNumber} • Party: ${invoiceForPayment.customerName || 'Customer'}`
                : undefined
            }
            size="md"
            footer={
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  disabled={isSubmittingPayment}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {t('btn.cancel')}
                </button>
                <button
                  type="submit"
                  form="form-receive-payment"
                  disabled={isPayBtnDisabled}
                  style={{
                    backgroundColor: isPayBtnDisabled ? '#9ca3af' : '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    cursor: isPayBtnDisabled ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isPayBtnDisabled ? 0.7 : 1,
                    boxShadow: isPayBtnDisabled ? 'none' : '0 1px 2px rgba(5,150,105,0.2)',
                  }}
                >
                  {isSubmittingPayment ? 'Recording...' : '💳 Record & Post Payment'}
                </button>
              </div>
            }
          >
        {invoiceForPayment && (
          <form id="form-receive-payment" onSubmit={handleConfirmReceivePayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Invoice Summary Box */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Customer:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{invoiceForPayment.customerName || 'Customer'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Bill Total</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>₹ {(invoiceForPayment.grandTotal || 0).toLocaleString()}</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Paid & Adjusted</div>
                  <div style={{ fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                    ₹ {((invoiceForPayment.amountPaid || 0) + (invoiceForPayment.adjustmentAmount || 0)).toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', color: '#991b1b' }}>Balance Due</div>
                  <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '14px' }}>
                    ₹ {(invoiceForPayment.balanceDue !== undefined ? invoiceForPayment.balanceDue : (invoiceForPayment.grandTotal - (invoiceForPayment.amountPaid || 0) - (invoiceForPayment.adjustmentAmount || 0))).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs: Amount Paid and Kasar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 700, color: '#059669', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                    Adjustment / Kasar (₹)
                  </label>
                  <button
                    type="button"
                    onClick={handleSetQuickKasar}
                    style={{
                      fontSize: '11px',
                      color: '#2563eb',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                    title="Calculate remaining round-off automatically"
                  >
                    ⚡ Auto Kasar
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={payAdjustmentAmount}
                  onChange={(e) => setPayAdjustmentAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 700, color: '#4338ca', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Adjustment Type & Payment Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Adjustment Reason / Type
                </label>
                <select
                  value={payAdjustmentType}
                  onChange={(e) => setPayAdjustmentType(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="round_off">Round-off / Kasar (कसर)</option>
                  <option value="cash_discount">Cash Discount (नकद छूट)</option>
                  <option value="damage_allowance">Damaged Goods Allowance (खराबी भत्ता)</option>
                  <option value="short_settlement">Short Payment Write-off (बट्टा खाता)</option>
                  <option value="other">Other Concession (अन्य)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Payment Mode
                </label>
                <select
                  value={payPaymentMode}
                  onChange={(e) => setPayPaymentMode(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="cash">💵 Cash (रोकड़)</option>
                  <option value="upi">📱 UPI / QR (PhonePe / GPay)</option>
                  <option value="bank">🏦 Bank Transfer (NEFT / RTGS)</option>
                  <option value="cheque">📝 Cheque (चेक)</option>
                </select>
              </div>
            </div>

            {/* Reference & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Ref / UTR / Cheque No. (Optional)
                </label>
                <input
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="e.g. UTR12345678"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Settled in full with kasar"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Dynamic Information Banners: Red if amount left, Green if settled against invoice */}
            {payIsOver ? (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '13.5px' }}>
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  <span>Settlement exceeds invoice #{invoiceForPayment.invoiceNumber} balance due!</span>
                </div>
                <div style={{ fontSize: '12px', color: '#b91c1c', marginLeft: '24px' }}>
                  Total settlement of ₹ {payTotalSettling.toFixed(2)} exceeds balance due of ₹ {payCurBal.toFixed(2)} by ₹ {(payTotalSettling - payCurBal).toFixed(2)}. Please reduce payment amount or kasar.
                </div>
              </div>
            ) : payRemainingBal > 0.01 ? (
              /* RED INFORMATION BANNER */
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '14px' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <span>Amount ₹ {payRemainingBal.toFixed(2)} is still left on invoice #{invoiceForPayment.invoiceNumber}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#b91c1c', marginLeft: '26px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <span>Total Bill: <strong>₹ {invoiceForPayment.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                  <span>•</span>
                  <span>Balance Due: <strong>₹ {payCurBal.toFixed(2)}</strong></span>
                  <span>•</span>
                  <span>Paying Now: <strong>₹ {payEnteredPay.toFixed(2)}</strong></span>
                  {payEnteredAdj > 0 && (
                    <>
                      <span>•</span>
                      <span>Kasar: <strong>₹ {payEnteredAdj.toFixed(2)}</strong></span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* GREEN INFORMATION BANNER */
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700, fontSize: '14px' }}>
                  <span style={{ fontSize: '18px' }}>✓</span>
                  <span>Settled against invoice #{invoiceForPayment.invoiceNumber} of ₹ {invoiceForPayment.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} amount</span>
                </div>
                <div style={{ fontSize: '12px', color: '#047857', marginLeft: '26px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <span>
                    Full Settlement: <strong>₹ {payEnteredPay.toFixed(2)}</strong> received
                    {payEnteredAdj > 0 && (
                      <> + <strong>₹ {payEnteredAdj.toFixed(2)}</strong> Kasar</>
                    )}
                  </span>
                  <span>•</span>
                  <span>Remaining Balance: <strong>₹ 0.00 (Fully Settled)</strong></span>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>
    );
  })()}
</div>
);
};
