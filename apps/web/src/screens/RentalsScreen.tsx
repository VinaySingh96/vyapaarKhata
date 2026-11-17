import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { SearchableSelect, SelectOption } from '../components/SearchableSelect.js';
import { useToast } from '../components/Toast.js';
import { useStore } from '../context/StoreContext.js';
import { formatIndianNumber } from '../utils/currency.js';
import { apiFetch } from '../utils/api.js';

type IssueStatus = 'open' | 'partially_returned' | 'completed' | 'cancelled';

interface IssueLine {
  id: string;
  variantId: string;
  unitId: string;
  description?: string;
  unitSymbol?: string;
  qtyIssued: number;
  qtyReturned: number;
  qtyLost: number;
  dailyRate: number;
  replacementRate: number;
}

interface ReturnLine {
  id: string;
  issueLineId: string;
  qtyReturned: number;
  qtyLost: number;
  days: number;
  dailyRate: number;
  rentAmount: number;
  lossRate: number;
  lossAmount: number;
  description?: string;
}

interface RentalReturnRecord {
  id: string;
  returnNumber: string;
  returnDate: string;
  isFinal: boolean;
  status: 'posted' | 'cancelled';
  salesInvoiceId?: string;
  invoiceNumber?: string;
  gstRate: number;
  rentAmount: number;
  lossAmount: number;
  taxAmount: number;
  totalAmount: number;
  lines: ReturnLine[];
}

interface RentalIssueRecord {
  id: string;
  issueNumber: string;
  issueDate: string;
  partyId: string;
  partyName?: string;
  partyPhone?: string;
  siteAddress?: string;
  status: IssueStatus;
  depositAmount: number;
  notes?: string;
  lines: IssueLine[];
  returns?: RentalReturnRecord[];
}

interface RentalSummary {
  openIssues: number;
  totalQtyOnRent: number;
  dailyRentValue: number;
  byCustomer: Array<{ partyId: string; partyName?: string; qtyOnRent: number; dailyValue: number }>;
}

interface RentableItem {
  variantId: string;
  name: string;
  sku?: string;
  unitId: string;
  unitSymbol: string;
  stock: number;
  dailyRate: number;
  replacementRate: number;
}

interface CustomerItem {
  id: string;
  displayName: string;
  phone?: string;
  billingAddress?: string;
}

interface DraftIssueLine {
  key: string;
  variantId: string;
  name: string;
  unitId: string;
  unitSymbol: string;
  stock: number;
  quantity: string;
  dailyRate: string;
  replacementRate: string;
}

interface DraftReturnLine {
  qtyReturned: string;
  qtyLost: string;
  days: string; // '' = use suggested days
  lossRate: string;
}

interface ReturnPreview {
  suggestedDays: number;
  gstRate: number;
  lines: ReturnLine[];
  rentAmount: number;
  lossAmount: number;
  taxAmount: number;
  totalAmount: number;
  isFinal: boolean;
}

// Local (browser) date, not UTC
const today = () => new Date().toLocaleDateString('en-CA');
const outstanding = (l: IssueLine) => Math.round((l.qtyIssued - l.qtyReturned - l.qtyLost) * 10000) / 10000;
const money = (n: number) => `₹ ${formatIndianNumber(n || 0, { decimals: 2 })}`;

const STATUS_STYLE: Record<IssueStatus, { bg: string; fg: string; border: string }> = {
  open: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
  partially_returned: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
  completed: { bg: '#f0fdf4', fg: '#15803d', border: '#bbf7d0' },
  cancelled: { bg: '#f3f4f6', fg: '#6b7280', border: '#e5e7eb' },
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '13.5px',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#374151',
  display: 'block',
  marginBottom: '4px',
};
const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 12px' };
const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  color: '#374151',
};
const smallBtn = (color: string, bg: string, border: string): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: '4px',
  border: `1px solid ${border}`,
  backgroundColor: bg,
  color,
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

async function apiJson(url: string, init?: RequestInit): Promise<any> {
  const res = await apiFetch(url, init);
  const json = await res.json().catch(() => null);
  if (!json?.success) {
    throw new Error(json?.error?.message || `Request failed (HTTP ${res.status})`);
  }
  return json.data;
}

export const RentalsScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();
  const { tenantId, storeSettings } = useStore();

  const [issues, setIssues] = useState<RentalIssueRecord[]>([]);
  const [summary, setSummary] = useState<RentalSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | IssueStatus | 'all'>('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<RentableItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [defaultGstRate, setDefaultGstRate] = useState(18);

  // New issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueCustomerId, setIssueCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(today());
  const [siteAddress, setSiteAddress] = useState('');
  const [deposit, setDeposit] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [draftLines, setDraftLines] = useState<DraftIssueLine[]>([]);
  const [itemToAdd, setItemToAdd] = useState('');
  const [isSavingIssue, setIsSavingIssue] = useState(false);

  // Return modal
  const [returnIssue, setReturnIssue] = useState<RentalIssueRecord | null>(null);
  const [returnDate, setReturnDate] = useState(today());
  const [gstRate, setGstRate] = useState('18');
  const [returnLines, setReturnLines] = useState<Record<string, DraftReturnLine>>({});
  const [preview, setPreview] = useState<ReturnPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSavingReturn, setIsSavingReturn] = useState(false);
  const previewSeq = useRef(0);

  // Detail modal
  const [detail, setDetail] = useState<RentalIssueRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadIssues = () => {
    setLoading(true);
    apiJson('/api/v1/rentals/issues?limit=500')
      .then((data) => setIssues(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    apiJson('/api/v1/rentals/summary')
      .then(setSummary)
      .catch(() => setSummary(null));
  };

  const loadMasters = () => {
    apiJson('/api/v1/rentals/settings')
      .then((s) => {
        setDefaultGstRate(s.defaultGstRate ?? 18);
        setGstRate(String(s.defaultGstRate ?? 18));
      })
      .catch(() => {});

    apiJson('/api/v1/products')
      .then((data: any[]) => {
        const mapped: RentableItem[] = [];
        (data || []).forEach((p: any) => {
          const variants = p.variants && p.variants.length > 0 ? p.variants : null;
          if (variants) {
            variants.forEach((v: any) =>
              mapped.push({
                variantId: v.id,
                name: v.variantName && !/^(standard|default)$/i.test(v.variantName) ? v.variantName : p.name,
                sku: v.sku,
                unitId: p.baseUnitId,
                unitSymbol: p.baseUnitSymbol || 'pcs',
                stock: v.stockOnHand ?? 0,
                dailyRate: v.sellingPrice ?? p.sellingPrice ?? 0,
                replacementRate: v.purchasePrice ?? p.purchasePrice ?? 0,
              })
            );
          } else if (p.defaultVariantId) {
            mapped.push({
              variantId: p.defaultVariantId,
              name: p.name,
              sku: p.sku,
              unitId: p.baseUnitId,
              unitSymbol: p.baseUnitSymbol || 'pcs',
              stock: p.totalStock ?? 0,
              dailyRate: p.sellingPrice ?? 0,
              replacementRate: p.purchasePrice ?? 0,
            });
          }
        });
        setItems(mapped);
      })
      .catch((err) => console.warn('Could not load products:', err));

    apiJson('/api/v1/parties')
      .then((data: any[]) =>
        setCustomers((data || []).filter((p) => p.partyType === 'customer' || p.partyType === 'both'))
      )
      .catch((err) => console.warn('Could not load parties:', err));
  };

  useEffect(() => {
    loadIssues();
    loadMasters();
  }, [tenantId]);

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (statusFilter === 'active' && !(i.status === 'open' || i.status === 'partially_returned')) return false;
      if (statusFilter !== 'active' && statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (!q) return true;
      return (
        i.issueNumber.toLowerCase().includes(q) ||
        (i.partyName || '').toLowerCase().includes(q) ||
        (i.siteAddress || '').toLowerCase().includes(q)
      );
    });
  }, [issues, statusFilter, search]);

  const statusLabel = (s: IssueStatus) => t(`rentals.status.${s}`);

  // ---------------------------------------------------------------------------
  // New Issue
  // ---------------------------------------------------------------------------

  const openIssueModal = () => {
    setIssueCustomerId(customers[0]?.id || '');
    setIssueDate(today());
    setSiteAddress('');
    setDeposit('');
    setIssueNotes('');
    setDraftLines([]);
    setItemToAdd('');
    setShowIssueModal(true);
  };

  const addDraftLine = (variantId: string) => {
    const item = items.find((i) => i.variantId === variantId);
    if (!item) return;
    if (draftLines.some((l) => l.variantId === variantId)) {
      toast.warning(t('rentals.itemAlreadyAdded'));
      return;
    }
    setDraftLines((prev) => [
      ...prev,
      {
        key: `${variantId}-${Date.now()}`,
        variantId,
        name: item.name,
        unitId: item.unitId,
        unitSymbol: item.unitSymbol,
        stock: item.stock,
        quantity: item.stock > 0 ? '1' : '0',
        dailyRate: String(item.dailyRate || 0),
        replacementRate: String(item.replacementRate || 0),
      },
    ]);
    setItemToAdd('');
  };

  const updateDraftLine = (key: string, patch: Partial<DraftIssueLine>) =>
    setDraftLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const draftDailyTotal = draftLines.reduce(
    (s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.dailyRate) || 0),
    0
  );

  const handleSaveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueCustomerId) {
      toast.warning(t('rentals.selectCustomer'));
      return;
    }
    if (draftLines.length === 0) {
      toast.warning(t('rentals.addAtLeastOne'));
      return;
    }
    for (const l of draftLines) {
      const qty = parseFloat(l.quantity);
      if (!(qty > 0)) {
        toast.warning(`${l.name}: ${t('rentals.qtyMustBePositive')}`);
        return;
      }
      if (qty > l.stock) {
        toast.warning(`${l.name}: ${t('rentals.notEnoughStock', { stock: l.stock })}`);
        return;
      }
    }

    setIsSavingIssue(true);
    try {
      const issue: RentalIssueRecord = await apiJson('/api/v1/rentals/issues', {
        method: 'POST',
        body: JSON.stringify({
          partyId: issueCustomerId,
          issueDate,
          siteAddress: siteAddress.trim() || undefined,
          depositAmount: parseFloat(deposit) || 0,
          notes: issueNotes.trim() || undefined,
          lines: draftLines.map((l) => ({
            variantId: l.variantId,
            unitId: l.unitId,
            quantity: parseFloat(l.quantity),
            dailyRate: parseFloat(l.dailyRate) || 0,
            replacementRate: parseFloat(l.replacementRate) || 0,
            description: l.name,
          })),
        }),
      });
      toast.success(t('rentals.issueSaved', { number: issue.issueNumber }));
      setShowIssueModal(false);
      loadIssues();
      loadMasters();
      printChallan({ ...issue, partyName: customers.find((c) => c.id === issueCustomerId)?.displayName });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingIssue(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Return / Complete
  // ---------------------------------------------------------------------------

  const openReturnModal = (issue: RentalIssueRecord) => {
    const draft: Record<string, DraftReturnLine> = {};
    issue.lines.forEach((l) => {
      draft[l.id] = { qtyReturned: '0', qtyLost: '0', days: '', lossRate: String(l.replacementRate || 0) };
    });
    setReturnIssue(issue);
    setReturnDate(today() < issue.issueDate ? issue.issueDate : today());
    setGstRate(String(defaultGstRate));
    setReturnLines(draft);
    setPreview(null);
    setPreviewError(null);
  };

  const fillReturnAll = () => {
    if (!returnIssue) return;
    setReturnLines((prev) => {
      const next = { ...prev };
      returnIssue.lines.forEach((l) => {
        next[l.id] = { ...next[l.id], qtyReturned: String(outstanding(l)), qtyLost: '0' };
      });
      return next;
    });
  };

  const buildReturnPayload = () => {
    if (!returnIssue) return null;
    const lines = returnIssue.lines
      .map((l) => {
        const d = returnLines[l.id];
        if (!d) return null;
        const qtyReturned = parseFloat(d.qtyReturned) || 0;
        const qtyLost = parseFloat(d.qtyLost) || 0;
        if (qtyReturned <= 0 && qtyLost <= 0) return null;
        return {
          issueLineId: l.id,
          qtyReturned,
          qtyLost,
          days: d.days.trim() === '' ? undefined : parseInt(d.days, 10),
          lossRate: qtyLost > 0 ? parseFloat(d.lossRate) || 0 : undefined,
        };
      })
      .filter(Boolean);
    return { returnDate, gstRate: parseFloat(gstRate) || 0, lines };
  };

  // Live, server-calculated preview (debounced) so the bill shown equals the bill posted
  useEffect(() => {
    if (!returnIssue) return;
    const payload = buildReturnPayload();
    if (!payload || payload.lines.length === 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const seq = ++previewSeq.current;
    const timer = setTimeout(() => {
      apiJson(`/api/v1/rentals/issues/${returnIssue.id}/returns/preview`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
        .then((data) => {
          if (seq !== previewSeq.current) return;
          setPreview(data);
          setPreviewError(null);
        })
        .catch((err) => {
          if (seq !== previewSeq.current) return;
          setPreview(null);
          setPreviewError(err.message);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [returnIssue, returnDate, gstRate, returnLines]);

  const suggestedDaysFor = (issueLineId: string) =>
    preview?.lines.find((l) => l.issueLineId === issueLineId)?.days ?? preview?.suggestedDays;

  const handleSaveReturn = async () => {
    if (!returnIssue) return;
    const payload = buildReturnPayload();
    if (!payload || payload.lines.length === 0) {
      toast.warning(t('rentals.enterReturnQty'));
      return;
    }
    setIsSavingReturn(true);
    try {
      const ret: RentalReturnRecord = await apiJson(`/api/v1/rentals/issues/${returnIssue.id}/returns`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success(
        ret.invoiceNumber
          ? t('rentals.returnSavedWithBill', { number: ret.returnNumber, invoice: ret.invoiceNumber, amount: money(ret.totalAmount) })
          : t('rentals.returnSaved', { number: ret.returnNumber })
      );
      setReturnIssue(null);
      loadIssues();
      loadMasters();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingReturn(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Detail / cancellations
  // ---------------------------------------------------------------------------

  const openDetail = async (issueId: string) => {
    try {
      setDetail(await apiJson(`/api/v1/rentals/issues/${issueId}`));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const cancelReturn = async (ret: RentalReturnRecord) => {
    if (!detail) return;
    setBusyId(ret.id);
    try {
      await apiJson(`/api/v1/rentals/returns/${ret.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled from Rentals screen' }),
      });
      toast.success(t('rentals.returnCancelled', { number: ret.returnNumber }));
      await openDetail(detail.id);
      loadIssues();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const cancelIssue = async (issue: RentalIssueRecord) => {
    setBusyId(issue.id);
    try {
      await apiJson(`/api/v1/rentals/issues/${issue.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled from Rentals screen' }),
      });
      toast.success(t('rentals.issueCancelled', { number: issue.issueNumber }));
      setDetail(null);
      loadIssues();
      loadMasters();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const printChallan = (issue: RentalIssueRecord) => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    const esc = (s: any) =>
      String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    const rows = issue.lines
      .map(
        (l, i) =>
          `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td style="text-align:right">${l.qtyIssued} ${esc(
            l.unitSymbol || ''
          )}</td><td style="text-align:right">₹${l.dailyRate}/day</td></tr>`
      )
      .join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(issue.issueNumber)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px}th{background:#f3f4f6;text-align:left}
      .muted{color:#555;font-size:12px}.sig{margin-top:60px;display:flex;justify-content:space-between}</style></head><body>
      <h2 style="margin:0">${esc(storeSettings.storeName)}</h2>
      <div class="muted">${esc(storeSettings.address || '')} ${storeSettings.gstin ? '· GSTIN ' + esc(storeSettings.gstin) : ''}</div>
      <h3>RENTAL DELIVERY CHALLAN (किराया चालान) — Not a Tax Invoice</h3>
      <div><b>Challan No:</b> ${esc(issue.issueNumber)} &nbsp; <b>Date:</b> ${esc(issue.issueDate)}</div>
      <div><b>Customer:</b> ${esc(issue.partyName || '')}</div>
      ${issue.siteAddress ? `<div><b>Site:</b> ${esc(issue.siteAddress)}</div>` : ''}
      ${issue.depositAmount ? `<div><b>Security Deposit:</b> ₹${issue.depositAmount}</div>` : ''}
      <table><thead><tr><th>#</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="muted">Rent is charged per item from the issue date until return. Lost or damaged items are charged at replacement cost.</p>
      <div class="sig"><div>Receiver's Signature</div><div>For ${esc(storeSettings.storeName)}</div></div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const itemOptions: SelectOption[] = items.map((i) => ({
    value: i.variantId,
    label: i.name,
    sublabel: i.sku,
    badge: `${i.stock} ${i.unitSymbol}`,
    badgeType: i.stock > 0 ? 'success' : 'danger',
    price: i.dailyRate,
    unit: 'day',
    disabled: i.stock <= 0,
  }));
  const customerOptions: SelectOption[] = customers.map((c) => ({
    value: c.id,
    label: c.displayName,
    sublabel: [c.phone, c.billingAddress].filter(Boolean).join(' · ') || undefined,
  }));

  const filterTabs: Array<{ id: typeof statusFilter; label: string }> = [
    { id: 'active', label: t('rentals.filter.active') },
    { id: 'completed', label: statusLabel('completed') },
    { id: 'cancelled', label: statusLabel('cancelled') },
    { id: 'all', label: t('rentals.filter.all') },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>{t('rentals.title')}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>{t('rentals.subtitle')}</p>
        </div>
        <button id="btn-new-rental-issue" onClick={openIssueModal} style={{ ...primaryBtn, padding: '10px 18px', fontSize: '13.5px' }}>
          {t('rentals.newIssue')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
        {[
          { label: t('rentals.kpi.open'), value: String(summary?.openIssues ?? 0), color: '#2563eb' },
          { label: t('rentals.kpi.qtyOnRent'), value: formatIndianNumber(summary?.totalQtyOnRent ?? 0), color: '#111827' },
          { label: t('rentals.kpi.dailyValue'), value: money(summary?.dailyRentValue ?? 0), color: '#059669' },
          { label: t('rentals.kpi.customers'), value: String(summary?.byCustomer.length ?? 0), color: '#7c3aed' },
        ].map((k) => (
          <div key={k.label} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: k.color, marginTop: '4px' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
          alignItems: 'center',
        }}
      >
        {filterTabs.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: `1px solid ${statusFilter === f.id ? '#2563eb' : '#e5e7eb'}`,
              backgroundColor: statusFilter === f.id ? '#eff6ff' : '#ffffff',
              color: statusFilter === f.id ? '#1d4ed8' : '#4b5563',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
        <input
          type="search"
          placeholder={t('rentals.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: '220px', marginLeft: 'auto', padding: '6px 10px', fontSize: '13px' }}
        />
        <button type="button" onClick={loadIssues} style={{ ...secondaryBtn, padding: '6px 12px' }}>
          {loading ? '...' : `↻ ${t('btn.refresh')}`}
        </button>
      </div>

      {/* Issues Table */}
      <div className="vk-table-responsive">
        <table>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
              <th style={thStyle}>{t('rentals.col.issueNo')}</th>
              <th style={thStyle}>{t('rentals.col.customer')}</th>
              <th style={thStyle}>{t('rentals.col.date')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.onRent')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.perDay')}</th>
              <th style={thStyle}>{t('btn.status')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{t('btn.action')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                  {t('rentals.empty')}
                </td>
              </tr>
            ) : (
              filteredIssues.map((i) => {
                const out = i.lines.reduce((s, l) => s + outstanding(l), 0);
                const issued = i.lines.reduce((s, l) => s + l.qtyIssued, 0);
                const perDay = i.lines.reduce((s, l) => s + outstanding(l) * l.dailyRate, 0);
                const st = STATUS_STYLE[i.status];
                const canReturn = i.status === 'open' || i.status === 'partially_returned';
                return (
                  <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#111827' }}>
                      <button
                        type="button"
                        onClick={() => openDetail(i.id)}
                        style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '13.5px' }}
                      >
                        {i.issueNumber}
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#374151' }}>{i.partyName || '—'}</div>
                      {i.siteAddress && <div style={{ fontSize: '12px', color: '#6b7280' }}>📍 {i.siteAddress}</div>}
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{i.issueDate}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {formatIndianNumber(out)} / {formatIndianNumber(issued)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#059669', fontWeight: 600 }}>{money(perDay)}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: st.bg,
                          color: st.fg,
                          border: `1px solid ${st.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {statusLabel(i.status)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {canReturn && (
                          <button type="button" onClick={() => openReturnModal(i)} style={smallBtn('#ffffff', '#16a34a', '#16a34a')}>
                            ↩ {t('rentals.returnBtn')}
                          </button>
                        )}
                        <button type="button" onClick={() => openDetail(i.id)} style={smallBtn('#2563eb', '#ffffff', '#cbd5e1')}>
                          {t('btn.view')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* New Issue Modal */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title={t('rentals.issueModalTitle')}
        subtitle={t('rentals.issueModalSubtitle')}
        size="xl"
        footer={
          <>
            <div style={{ marginRight: 'auto', fontSize: '13px', color: '#374151' }}>
              {t('rentals.dailyRentTotal')}: <b style={{ color: '#059669' }}>{money(draftDailyTotal)}</b>
            </div>
            <button type="button" onClick={() => setShowIssueModal(false)} style={secondaryBtn}>
              {t('btn.cancel')}
            </button>
            <button type="submit" form="form-rental-issue" disabled={isSavingIssue} style={{ ...primaryBtn, cursor: isSavingIssue ? 'not-allowed' : 'pointer' }}>
              {isSavingIssue ? '...' : t('rentals.saveAndPrint')}
            </button>
          </>
        }
      >
        <form
          id="form-rental-issue"
          onSubmit={handleSaveIssue}
          // Enter in the item search / qty fields must not submit the whole issue
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>{t('rentals.customer')} *</label>
              <SearchableSelect
                options={customerOptions}
                value={issueCustomerId}
                onChange={setIssueCustomerId}
                placeholder={t('rentals.selectCustomer')}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('rentals.issueDate')} *</label>
              <input type="date" required value={issueDate} max={today()} onChange={(e) => setIssueDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('rentals.deposit')}</label>
              <input type="number" min="0" step="any" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('rentals.siteAddress')}</label>
            <input type="text" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder={t('rentals.sitePlaceholder')} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>{t('rentals.addItem')}</label>
            <SearchableSelect
              options={itemOptions}
              value={itemToAdd}
              onChange={(v) => addDraftLine(v)}
              placeholder={t('rentals.searchItem')}
            />
          </div>

          <div className="vk-table-responsive">
            <table>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
                  <th style={thStyle}>{t('rentals.col.item')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.available')}</th>
                  <th style={{ ...thStyle, width: '110px' }}>{t('rentals.col.qty')}</th>
                  <th style={{ ...thStyle, width: '120px' }}>{t('rentals.col.ratePerDay')}</th>
                  <th style={{ ...thStyle, width: '130px' }}>{t('rentals.col.lossCharge')}</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {draftLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                      {t('rentals.noItemsYet')}
                    </td>
                  </tr>
                ) : (
                  draftLines.map((l) => {
                    const over = (parseFloat(l.quantity) || 0) > l.stock;
                    return (
                      <tr key={l.key} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{l.name}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#6b7280' }}>
                          {l.stock} {l.unitSymbol}
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.quantity}
                            onChange={(e) => updateDraftLine(l.key, { quantity: e.target.value })}
                            style={{ ...inputStyle, borderColor: over ? '#dc2626' : '#d1d5db', fontWeight: 700 }}
                          />
                        </td>
                        <td style={tdStyle}>
                          <input type="number" min="0" step="any" value={l.dailyRate} onChange={(e) => updateDraftLine(l.key, { dailyRate: e.target.value })} style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.replacementRate}
                            onChange={(e) => updateDraftLine(l.key, { replacementRate: e.target.value })}
                            style={inputStyle}
                            title={t('rentals.lossChargeHelp')}
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setDraftLines((prev) => prev.filter((x) => x.key !== l.key))}
                            style={smallBtn('#dc2626', '#fef2f2', '#fecaca')}
                            aria-label="Remove"
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

          <div>
            <label style={labelStyle}>{t('rentals.notes')}</label>
            <input type="text" value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} style={inputStyle} />
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Return / Complete Modal */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={Boolean(returnIssue)}
        onClose={() => setReturnIssue(null)}
        title={`${t('rentals.returnModalTitle')} — ${returnIssue?.issueNumber || ''}`}
        subtitle={returnIssue ? `${returnIssue.partyName || ''} · ${t('rentals.issuedOn')} ${returnIssue.issueDate}` : undefined}
        size="xl"
        footer={
          <>
            <button type="button" onClick={fillReturnAll} style={{ ...secondaryBtn, marginRight: 'auto' }}>
              {t('rentals.returnAll')}
            </button>
            <button type="button" onClick={() => setReturnIssue(null)} style={secondaryBtn}>
              {t('btn.cancel')}
            </button>
            <button
              type="button"
              id="btn-save-rental-return"
              onClick={handleSaveReturn}
              disabled={isSavingReturn || !preview}
              style={{
                ...primaryBtn,
                backgroundColor: preview?.isFinal ? '#16a34a' : '#2563eb',
                opacity: isSavingReturn || !preview ? 0.6 : 1,
                cursor: isSavingReturn || !preview ? 'not-allowed' : 'pointer',
              }}
            >
              {isSavingReturn ? '...' : preview?.isFinal ? t('rentals.completeRental') : t('rentals.savePartialReturn')}
            </button>
          </>
        }
      >
        {returnIssue && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={labelStyle}>{t('rentals.returnDate')} *</label>
                <input
                  type="date"
                  value={returnDate}
                  min={returnIssue.issueDate}
                  max={today()}
                  onChange={(e) => setReturnDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t('rentals.gstRate')}</label>
                <input type="number" min="0" max="100" step="any" value={gstRate} onChange={(e) => setGstRate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ alignSelf: 'end', fontSize: '13px', color: '#374151', paddingBottom: '8px' }}>
                {t('rentals.suggestedDays')}: <b>{preview?.suggestedDays ?? '—'}</b>
              </div>
            </div>

            <div className="vk-table-responsive">
              <table>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
                    <th style={thStyle}>{t('rentals.col.item')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.stillOut')}</th>
                    <th style={{ ...thStyle, width: '100px' }}>{t('rentals.col.returning')}</th>
                    <th style={{ ...thStyle, width: '90px' }}>{t('rentals.col.lost')}</th>
                    <th style={{ ...thStyle, width: '90px' }}>{t('rentals.col.days')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.rate')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.rent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {returnIssue.lines.map((l) => {
                    const d = returnLines[l.id] || { qtyReturned: '0', qtyLost: '0', days: '', lossRate: '0' };
                    const out = outstanding(l);
                    const pl = preview?.lines.find((x) => x.issueLineId === l.id);
                    const lost = parseFloat(d.qtyLost) || 0;
                    const setD = (patch: Partial<DraftReturnLine>) =>
                      setReturnLines((prev) => ({ ...prev, [l.id]: { ...d, ...patch } }));
                    return (
                      <React.Fragment key={l.id}>
                        <tr style={{ borderBottom: lost > 0 ? 'none' : '1px solid #f3f4f6', fontSize: '13px', opacity: out <= 0 ? 0.5 : 1 }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{l.description}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {out} {l.unitSymbol || ''}
                          </td>
                          <td style={tdStyle}>
                            <input
                              type="number"
                              min="0"
                              max={out}
                              step="any"
                              disabled={out <= 0}
                              value={d.qtyReturned}
                              onChange={(e) => setD({ qtyReturned: e.target.value })}
                              style={{ ...inputStyle, fontWeight: 700 }}
                            />
                          </td>
                          <td style={tdStyle}>
                            <input
                              type="number"
                              min="0"
                              max={out}
                              step="any"
                              disabled={out <= 0}
                              value={d.qtyLost}
                              onChange={(e) => setD({ qtyLost: e.target.value })}
                              style={inputStyle}
                            />
                          </td>
                          <td style={tdStyle}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              disabled={out <= 0}
                              value={d.days}
                              placeholder={String(suggestedDaysFor(l.id) ?? '')}
                              onChange={(e) => setD({ days: e.target.value })}
                              style={inputStyle}
                              title={t('rentals.daysHelp')}
                            />
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#6b7280' }}>₹{l.dailyRate}/day</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{pl ? money(pl.rentAmount) : '—'}</td>
                        </tr>
                        {lost > 0 && (
                          <tr style={{ borderBottom: '1px solid #f3f4f6', fontSize: '12.5px', backgroundColor: '#fffbeb' }}>
                            <td style={{ ...tdStyle, color: '#b45309' }} colSpan={4}>
                              ⚠ {t('rentals.lossChargeFor', { qty: lost })}
                            </td>
                            <td style={tdStyle} colSpan={2}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={d.lossRate}
                                onChange={(e) => setD({ lossRate: e.target.value })}
                                style={inputStyle}
                                aria-label={t('rentals.col.lossCharge')}
                              />
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#b45309' }}>
                              {pl ? money(pl.lossAmount) : '—'}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {previewError && (
              <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px' }}>
                {previewError}
              </div>
            )}

            <div
              style={{
                alignSelf: 'flex-end',
                minWidth: '280px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                rowGap: '6px',
              }}
            >
              <span>{t('rentals.rent')}</span>
              <b style={{ textAlign: 'right' }}>{money(preview?.rentAmount ?? 0)}</b>
              <span>{t('rentals.lossCharges')}</span>
              <b style={{ textAlign: 'right' }}>{money(preview?.lossAmount ?? 0)}</b>
              <span>GST ({preview?.gstRate ?? gstRate}%)</span>
              <b style={{ textAlign: 'right' }}>{money(preview?.taxAmount ?? 0)}</b>
              <span style={{ fontWeight: 700, borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>{t('rentals.billTotal')}</span>
              <b style={{ textAlign: 'right', fontSize: '15px', color: '#111827', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                {money(preview?.totalAmount ?? 0)}
              </b>
            </div>
            {preview && (
              <div style={{ fontSize: '12.5px', color: preview.isFinal ? '#15803d' : '#b45309', textAlign: 'right' }}>
                {preview.isFinal ? t('rentals.willComplete') : t('rentals.willStayOpen')}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Detail / History Modal */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`${t('rentals.detailTitle')} — ${detail?.issueNumber || ''}`}
        subtitle={detail ? `${detail.partyName || ''}${detail.siteAddress ? ' · 📍 ' + detail.siteAddress : ''}` : undefined}
        size="xl"
        footer={
          detail ? (
            <>
              {detail.status === 'open' && (
                <button
                  type="button"
                  disabled={busyId === detail.id}
                  onClick={() => cancelIssue(detail)}
                  style={{ ...secondaryBtn, color: '#dc2626', borderColor: '#fecaca', marginRight: 'auto' }}
                >
                  {t('rentals.cancelIssue')}
                </button>
              )}
              <button type="button" onClick={() => printChallan(detail)} style={secondaryBtn}>
                🖨 {t('rentals.printChallan')}
              </button>
              {(detail.status === 'open' || detail.status === 'partially_returned') && (
                <button
                  type="button"
                  onClick={() => {
                    const d = detail;
                    setDetail(null);
                    openReturnModal(d);
                  }}
                  style={{ ...primaryBtn, backgroundColor: '#16a34a' }}
                >
                  ↩ {t('rentals.returnBtn')}
                </button>
              )}
            </>
          ) : undefined
        }
      >
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#374151' }}>
              <span>
                {t('rentals.issueDate')}: <b>{detail.issueDate}</b>
              </span>
              <span>
                {t('btn.status')}: <b>{statusLabel(detail.status)}</b>
              </span>
              {detail.depositAmount > 0 && (
                <span>
                  {t('rentals.deposit')}: <b>{money(detail.depositAmount)}</b>
                </span>
              )}
              {detail.partyPhone && <span>📞 {detail.partyPhone}</span>}
            </div>

            <div className="vk-table-responsive">
              <table>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
                    <th style={thStyle}>{t('rentals.col.item')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.issued')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.returned')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.lost')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.stillOut')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('rentals.col.rate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{l.description}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{l.qtyIssued}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#15803d' }}>{l.qtyReturned}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: l.qtyLost > 0 ? '#b45309' : undefined }}>{l.qtyLost}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                        {outstanding(l)} {l.unitSymbol || ''}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#6b7280' }}>₹{l.dailyRate}/day</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#111827' }}>{t('rentals.returnsHistory')}</h4>
              {!detail.returns || detail.returns.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>{t('rentals.noReturnsYet')}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detail.returns.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        backgroundColor: r.status === 'cancelled' ? '#f9fafb' : '#ffffff',
                        opacity: r.status === 'cancelled' ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                        <b>{r.returnNumber}</b>
                        <span style={{ color: '#6b7280' }}>{r.returnDate}</span>
                        {r.invoiceNumber && (
                          <span style={{ padding: '1px 8px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#4338ca', fontSize: '11.5px', fontWeight: 700 }}>
                            🧾 {r.invoiceNumber}
                          </span>
                        )}
                        {r.isFinal && <span style={{ color: '#15803d', fontSize: '12px', fontWeight: 600 }}>✓ {t('rentals.final')}</span>}
                        {r.status === 'cancelled' && <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>{statusLabel('cancelled')}</span>}
                        <b style={{ marginLeft: 'auto' }}>{money(r.totalAmount)}</b>
                        {r.status === 'posted' && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => cancelReturn(r)}
                            style={smallBtn('#dc2626', '#fef2f2', '#fecaca')}
                            title={t('rentals.cancelReturnHelp')}
                          >
                            {t('rentals.cancelReturn')}
                          </button>
                        )}
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '12.5px', color: '#4b5563' }}>
                        {r.lines.map((rl) => (
                          <div key={rl.id}>
                            {rl.description}: {rl.qtyReturned > 0 && `${rl.qtyReturned} ${t('rentals.returnedWord')}`}
                            {rl.qtyLost > 0 && ` · ${rl.qtyLost} ${t('rentals.lostWord')}`} · {rl.days} {t('rentals.daysWord')} × ₹{rl.dailyRate} ={' '}
                            {money(rl.rentAmount)}
                            {rl.lossAmount > 0 && ` + ${money(rl.lossAmount)}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
