import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';
import { formatIndianNumber } from '../utils/currency.js';

interface ExpenseItem {
  id: string;
  categoryName?: string;
  expenseCategoryId: string;
  expenseNumber: string;
  expenseDate: string;
  amount: number;
  taxAmount: number;
  paymentMode: string;
  description?: string;
  createdAt: string;
}

interface ExpenseCategoryItem {
  id: string;
  name: string;
  code?: string;
}

export const ExpensesScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('500');
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');

  const loadData = () => {
    setLoading(true);
    // 1. Fetch expenses
    fetch('/api/v1/expenses', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setExpenses(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load expenses:', err));

    // 2. Fetch categories
    fetch('/api/v1/expenses/categories', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCategories(json.data);
          if (json.data.length > 0 && !categoryId) {
            setCategoryId(json.data[0].id);
          }
        }
      })
      .catch((err) => console.warn('Failed to load expense categories:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategory === 'all') return true;
    return e.expenseCategoryId === selectedCategory;
  });

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.warning('Please enter a valid expense amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const expId = crypto.randomUUID();
      const expNumber = `EXP-${Date.now().toString().slice(-6)}`;

      const res = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          id: expId,
          expenseCategoryId: categoryId || 'c0000000-0000-0000-0000-000000000001',
          expenseNumber: expNumber,
          expenseDate: new Date().toISOString().slice(0, 10),
          amount: parsedAmount,
          taxAmount: 0,
          paymentMode,
          description: description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to record expense');
      }

      toast.success(`Expense ${expNumber} for ₹ ${formatIndianNumber(parsedAmount, { decimals: 2 })} recorded!`);
      setShowAddModal(false);
      setAmount('500');
      setDescription('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            {t('expenses.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('expenses.subtitle')}
          </p>
        </div>
        <button
          id="btn-add-expense"
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
          }}
        >
          {t('expenses.addNew')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Store Expenses</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
            ₹ {formatIndianNumber(totalExpenseAmount, { decimals: 2 })}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Vouchers Logged</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {expenses.length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Expense Heads</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
            {categories.length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Audit Status</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669', marginTop: '6px' }}>
            100% Reconciled
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>Filter by Category:</span>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '13px',
            backgroundColor: '#ffffff',
            minWidth: '200px',
          }}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadData}
          style={{
            padding: '8px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151',
            marginLeft: 'auto',
          }}
        >
          {loading ? '...' : '↻ Refresh'}
        </button>
      </div>

      {/* Expenses Table */}
      <div className="vk-table-responsive">
        <table>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Voucher No</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Expense Head</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mode</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                  No expense records found.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                    {e.expenseNumber}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#374151' }}>
                    {e.categoryName || 'Operating Expense'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                    {e.description || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#f3f4f6',
                        color: '#4b5563',
                      }}
                    >
                      {e.paymentMode?.toUpperCase() || 'CASH'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                    ₹ {formatIndianNumber(e.amount || 0, { decimals: 2 })}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                    {e.expenseDate || (e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'Today')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modern Custom Modal: Add Expense */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('expenses.modalTitle')}
        subtitle="Log operational overheads, freight, utility bills, or staff refreshments."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('btn.cancel')}
            </button>
            <button
              type="submit"
              form="form-add-expense"
              disabled={isSubmitting}
              style={{
                padding: '8px 18px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Recording...' : t('btn.create')}
            </button>
          </>
        }
      >
        <form id="form-add-expense" onSubmit={handleRecordExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Expense Category / Head *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
              >
                <option value="cash">Cash Counter</option>
                <option value="upi">UPI / QR Code</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Unloading labor or power bill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
