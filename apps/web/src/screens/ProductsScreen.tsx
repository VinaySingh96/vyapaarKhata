import React, { useState } from 'react';
import { Product } from '@vyapaarkhata/domain';

export const ProductsScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [products, setProducts] = useState<Partial<Product>[]>([
    {
      id: 'p1',
      name: 'UltraTech Portland Pozzolana Cement',
      categoryName: 'Cement & Aggregates',
      sku: 'CEM-PP-50KG',
      barcode: '8901234567890',
      baseUnitSymbol: 'bag',
      purchasePrice: 310,
      sellingPrice: 380,
      reorderLevel: 10,
      totalStock: 35,
      isActive: true,
    },
    {
      id: 'p2',
      name: 'TMT Steel Fe550D Rebar 12mm',
      categoryName: 'Steel & Metals',
      sku: 'TMT-12MM-KG',
      barcode: '8901234567891',
      baseUnitSymbol: 'kg',
      purchasePrice: 56,
      sellingPrice: 65,
      reorderLevel: 25,
      totalStock: 18, // Low stock!
      isActive: true,
    },
    {
      id: 'p3',
      name: 'Asian Paints Apex Ultima White (20L)',
      categoryName: 'Paints & Finishes',
      sku: 'PNT-APX-20L',
      barcode: '8901234567892',
      baseUnitSymbol: 'bucket',
      purchasePrice: 3850,
      sellingPrice: 4400,
      reorderLevel: 5,
      totalStock: 8,
      isActive: true,
    },
    {
      id: 'p4',
      name: 'River Sand Fine Washed',
      categoryName: 'Cement & Aggregates',
      sku: 'SND-WSH-TON',
      baseUnitSymbol: 'ton',
      purchasePrice: 1200,
      sellingPrice: 1650,
      reorderLevel: 5,
      totalStock: 0, // Out of stock!
      isActive: true,
    },
  ]);

  // Form State for Add Product
  const [newProductName, setNewProductName] = useState('');
  const [newCategory, setNewCategory] = useState('Cement & Aggregates');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newUnit, setNewUnit] = useState('bag');
  const [newPurchasePrice, setNewPurchasePrice] = useState('100');
  const [newSellingPrice, setNewSellingPrice] = useState('130');
  const [newReorderLevel, setNewReorderLevel] = useState('10');
  const [newStock, setNewStock] = useState('20');

  const categories = ['all', 'Cement & Aggregates', 'Steel & Metals', 'Paints & Finishes', 'Plumbing & Pipes'];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryName === selectedCategory;
    const matchesSearch =
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    return matchesCategory && matchesSearch;
  });

  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (p) => (p.totalStock || 0) > 0 && (p.totalStock || 0) <= (p.reorderLevel || 0)
  ).length;
  const outOfStockCount = products.filter((p) => (p.totalStock || 0) === 0).length;

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const newProd: Partial<Product> = {
      id: `p-${Date.now()}`,
      name: newProductName,
      categoryName: newCategory,
      sku: newSku || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: newBarcode || undefined,
      baseUnitSymbol: newUnit,
      purchasePrice: parseFloat(newPurchasePrice) || 0,
      sellingPrice: parseFloat(newSellingPrice) || 0,
      reorderLevel: parseFloat(newReorderLevel) || 0,
      totalStock: parseFloat(newStock) || 0,
      isActive: true,
    };

    setProducts([newProd, ...products]);
    setShowAddModal(false);
    setNewProductName('');
    setNewSku('');
    setNewBarcode('');
  };

  return (
    <div style={{ padding: '4px' }}>
      {/* Top Header & Metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            🏷️ Product & Item Catalog
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            Master catalog with SKU, units, barcodes, tax rates, and inventory reorder controls.
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
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          + Add New Product
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>TOTAL PRODUCTS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>{totalProducts}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>ACTIVE IN STOCK</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {totalProducts - outOfStockCount}
          </div>
        </div>
        <div style={{ backgroundColor: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>LOW STOCK ALERTS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>{lowStockCount}</div>
        </div>
        <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>OUT OF STOCK</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#b91c1c', marginTop: '4px' }}>{outOfStockCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="🔍 Search products by name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 12px',
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
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Product Name</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>SKU / Barcode</th>
              <th style={{ padding: '12px 16px' }}>Base Unit</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Purchase Cost</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Selling Price</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Margin %</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stock on Hand</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const stock = p.totalStock || 0;
              const reorder = p.reorderLevel || 0;
              const margin = p.sellingPrice && p.purchasePrice
                ? (((p.sellingPrice - p.purchasePrice) / p.purchasePrice) * 100).toFixed(1)
                : '0.0';

              let stockBadgeBg = '#dcfce7';
              let stockBadgeColor = '#15803d';
              let stockStatus = 'In Stock';

              if (stock === 0) {
                stockBadgeBg = '#fee2e2';
                stockBadgeColor = '#b91c1c';
                stockStatus = 'Out of Stock';
              } else if (stock <= reorder) {
                stockBadgeBg = '#fef3c7';
                stockBadgeColor = '#b45309';
                stockStatus = 'Low Stock';
              }

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{p.categoryName || '—'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#374151' }}>
                    <div>{p.sku || '—'}</div>
                    {p.barcode && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{p.barcode}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4b5563' }}>{p.baseUnitSymbol || 'pcs'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                    ₹{(p.purchasePrice || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                    ₹{(p.sellingPrice || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                    +{margin}%
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>
                    {stock} {p.baseUnitSymbol}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: stockBadgeBg,
                        color: stockBadgeColor,
                      }}
                    >
                      {stockStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              width: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Add New Item</h3>
            <form onSubmit={handleAddProduct}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>
                  Item / Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Cement 50kg"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                  >
                    {categories.filter((c) => c !== 'all').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Base Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}
                  >
                    <option value="bag">Bag</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ton">Ton</option>
                    <option value="bucket">Bucket / Tub</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="mtr">Meter (mtr)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>SKU Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CEM-UT-50"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Barcode (EAN-13)</label>
                  <input
                    type="text"
                    placeholder="e.g. 8901234567890"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Initial Stock</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', display: 'block' }}>Reorder Level Warning</label>
                  <input
                    type="number"
                    value={newReorderLevel}
                    onChange={(e) => setNewReorderLevel(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
