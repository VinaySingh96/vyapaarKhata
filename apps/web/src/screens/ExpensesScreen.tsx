import React, { useState } from 'react';
import { Expense } from '@vyapaarkhata/domain';

export const ExpensesScreen: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: 'exp-1',
      tenantId: 't1',
      expenseCategoryId: 'ec-1',
      categoryName: 'Electricity & Utilities',
      expenseNumber: 'EXP-2024-001',
      expenseDate: '2024-11-14',
      amount: 4500,
      taxAmount: 0,
      paymentMode: 'UPI',
      payee: 'Maharashtra State Electricity Board',
      description: 'Monthly Godown electricity bill',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp-2',
      tenantId: 't1',
      expenseCategoryId: 'ec-2',
      categoryName: 'Tea & Refreshments',
      expenseNumber: 'EXP-2024-002',
      expenseDate: '2024-11-14',
      amount: 450,
      taxAmount: 0,
      paymentMode: 'Cash',
      payee: 'Raju Tea Stall',
      description: 'Daily counter tea & refreshments for staff',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp-3',
      tenantId: 't1',
      expenseCategoryId: 'ec-3',
      categoryName: 'Freight & Cartage',
      expenseNumber: 'EXP-2024-003',
      expenseDate: '2024-11-13',
      amount: 2200,
      taxAmount: 0,
      paymentMode: 'Cash',
      payee: 'Tempo Transport Services',
      description: 'Cement unloading labor charges',
      createdAt: new Date().toISOString(),
    },
  ]);

  // Form State
  const [categoryName, setCategoryName] = useState('Electricity & Utilities');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  const categories = ['all', 'Electricity & Utilities', 'Tea & Refreshments', 'Freight & Cartage', 'Shop Rent', 'Stationery'];

  const filteredExpenses = selectedCategory === 'all'
    ? expenses
    : expenses.filter((e) => e.categoryName === selectedCategory);

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      tenantId: 't1',
      expenseCategoryId: `ec-${Date.now()}`,
      categoryName,
      expenseNumber: `EXP-${Date.now().toString().slice(-4)}`,
      expenseDate: new Date().toISOString().slice(0, 10),
      amount: amt,
      taxAmount: 0,
      paymentMode,
      payee: payee || undefined,
      description: description || undefined,
      createdAt: new Date().toISOString(),
    };

    setExpenses([newExp, ...expenses]);
    setShowAddModal(false);
    setAmount('');
    setPayee('');
    setDescription('');
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            💸 Daily Store Expenses
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            Track day-to-day retail expenses: utilities, tea, local cartage, labor, and petty cash.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          + Record Expense
        </button>
      </div>

      {/* Summary KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>TOTAL EXPENSES THIS MONTH</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
            ₹{totalExpenseAmount.toLocaleString()}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>TOTAL EXPENSE ENTRIES</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {expenses.length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>TOP EXPENSE CATEGORY</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#4b5563', marginTop: '6px' }}>
            Electricity & Utilities
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              border: '1px solid',
              borderColor: selectedCategory === cat ? '#2563eb' : '#d1d5db',
              backgroundColor: selectedCategory === cat ? '#eff6ff' : '#ffffff',
              color: selectedCategory === cat ? '#1d4ed8' : '#4b5563',
              fontSize: '12px',
              fontWeight: selectedCategory === cat ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {cat === 'all' ? 'All Expenses' : cat}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Expense #</th>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>Payee / Vendor</th>
              <th style={{ padding: '12px 16px' }}>Description / Note</th>
              <th style={{ padding: '12px 16px' }}>Mode</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((exp) => (
              <tr key={exp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1d4ed8' }}>{exp.expenseNumber}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{exp.expenseDate}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#f3f4f6', color: '#374151' }}>
                    {exp.categoryName}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{exp.payee || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#4b5563' }}>{exp.description || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{exp.paymentMode}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>
                  ₹{exp.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', width: '450px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Record Expense</h3>
            <form onSubmit={handleAddExpense}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Category</label>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                >
                  {categories.filter((c) => c !== 'all').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank">Bank Account</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Paid To (Payee)</label>
                <input
                  type="text"
                  placeholder="e.g. Raju Chaiwala / MSEB"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Unloading labor for truck"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
