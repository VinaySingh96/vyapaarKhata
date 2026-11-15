import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';

interface ProductItem {
  id: string;
  name: string;
  nameHi?: string;
  categoryName?: string;
  sku?: string;
  barcode?: string;
  baseUnitSymbol?: string;
  baseUnitId?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  totalStock?: number;
  isActive?: boolean;
}

export const ProductsScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);

  // Form State for Add Product
  const [newProductName, setNewProductName] = useState('');
  const [newProductNameHi, setNewProductNameHi] = useState('');
  const [newCategory, setNewCategory] = useState('General Goods');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newPurchasePrice, setNewPurchasePrice] = useState('100');
  const [newSellingPrice, setNewSellingPrice] = useState('130');
  const [newReorderLevel, setNewReorderLevel] = useState('10');
  const [newStock, setNewStock] = useState('20');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load products from backend
  const loadProducts = () => {
    setLoading(true);
    fetch('/api/v1/products', {
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const mapped: ProductItem[] = json.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            nameHi: p.nameHi || p.name_hi,
            categoryName: p.categoryName || 'General Goods',
            sku: p.sku || 'SKU',
            barcode: p.barcode,
            baseUnitSymbol: p.baseUnitSymbol || 'pcs',
            baseUnitId: p.baseUnitId || '10000000-0000-0000-0000-000000000001',
            purchasePrice: p.purchasePrice || p.variants?.[0]?.purchasePrice || 0,
            sellingPrice: p.sellingPrice || p.variants?.[0]?.sellingPrice || 0,
            reorderLevel: p.reorderLevel || p.variants?.[0]?.reorderLevel || 10,
            totalStock: p.totalStock !== undefined ? p.totalStock : (p.variants?.[0]?.stockOnHand || 0),
            isActive: p.isActive !== false,
          }));
          setProducts(mapped);

          // Extract unique categories
          const cats = Array.from(new Set(mapped.map((p) => p.categoryName || 'General Goods')));
          setCategories(['all', ...cats]);
        }
      })
      .catch((err) => {
        console.warn('Could not load products:', err);
        toast.error('Failed to load products from server');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryName === selectedCategory;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (p.name?.toLowerCase().includes(q) || false) ||
      (p.nameHi?.toLowerCase().includes(q) || false) ||
      (p.sku?.toLowerCase().includes(q) || false) ||
      (p.barcode?.toLowerCase().includes(q) || false);
    return matchesCategory && matchesSearch;
  });

  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (p) => (p.totalStock || 0) > 0 && (p.totalStock || 0) <= (p.reorderLevel || 0)
  ).length;
  const outOfStockCount = products.filter((p) => (p.totalStock || 0) === 0).length;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      toast.warning('Product name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedSku = newSku.trim() || `SKU-${Date.now().toString().slice(-6)}`;
      const prodId = crypto.randomUUID();

      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({
          id: prodId,
          name: newProductName.trim(),
          nameHi: newProductNameHi.trim() || undefined,
          sku: generatedSku,
          barcode: newBarcode.trim() || undefined,
          purchasePrice: parseFloat(newPurchasePrice) || 0,
          sellingPrice: parseFloat(newSellingPrice) || 0,
          reorderLevel: parseFloat(newReorderLevel) || 0,
          baseUnitId: '10000000-0000-0000-0000-000000000001',
          isStockTracked: true,
          trackingMethod: 'quantity',
          valuationMethod: 'weighted_average',
          isActive: true,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to save product');
      }

      toast.success(t('products.createdSuccess'));
      setShowAddModal(false);
      setNewProductName('');
      setNewProductNameHi('');
      setNewSku('');
      setNewBarcode('');
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Error creating product');
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
            {t('products.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {t('products.subtitle')}
          </p>
        </div>
        <button
          id="btn-add-new-product"
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
          {t('products.addNew')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="vk-grid-4" style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Total Catalog Products</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {totalProducts}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Active Selling Items</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {products.filter((p) => p.isActive).length}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Low Stock Threshold</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
            {lowStockCount}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Out of Stock (Zero)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
            {outOfStockCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder={t('products.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13.5px',
            }}
          />
        </div>
        <div style={{ flex: '0 1 200px' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13.5px',
              backgroundColor: '#ffffff',
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? t('products.allCategories') : c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={loadProducts}
          style={{
            padding: '8px 14px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Products Table with Responsive Overflow Wrapper */}
      <div className="vk-table-responsive">
        <table>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '12px', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('products.colItem')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('products.colCategory')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>SKU / Barcode</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>{t('products.colUnit')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('products.colPurchase')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('products.colSelling')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>{t('products.colStock')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>{t('products.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                  No products found matching your search.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const stock = p.totalStock || 0;
                const reorder = p.reorderLevel || 0;

                let stockBadgeBg = '#ecfdf5';
                let stockBadgeColor = '#065f46';
                let stockStatus = t('inventory.inStock');

                if (stock === 0) {
                  stockBadgeBg = '#fee2e2';
                  stockBadgeColor = '#b91c1c';
                  stockStatus = t('inventory.outOfStock');
                } else if (stock <= reorder) {
                  stockBadgeBg = '#fef3c7';
                  stockBadgeColor = '#b45309';
                  stockStatus = t('inventory.lowStock');
                }

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      <div>{p.name}</div>
                      {p.nameHi && (
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#4f46e5', marginTop: '2px' }}>
                          {p.nameHi}
                        </div>
                      )}
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modern Custom Modal for Adding Product */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('products.modalTitle')}
        subtitle="Add a new catalog item with pricing, SKU, and godown threshold."
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
              form="form-add-product"
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
              {isSubmitting ? 'Saving to Database...' : t('btn.create')}
            </button>
          </>
        }
      >
        <form id="form-add-product" onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              {t('products.nameLabel')} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. UltraTech Super Cement 50kg"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Product Name in Hindi (हिंदी में नाम / क्षेत्रीय नाम)
            </label>
            <input
              type="text"
              placeholder="उदा. अल्ट्राटेक सुपर सीमेंट 50 किग्रा"
              value={newProductNameHi}
              onChange={(e) => setNewProductNameHi(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('products.skuLabel')}
              </label>
              <input
                type="text"
                placeholder="Auto-generated if blank"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('products.barcodeLabel')}
              </label>
              <input
                type="text"
                placeholder="EAN / Barcode"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('products.purchasePriceLabel')}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={newPurchasePrice}
                onChange={(e) => setNewPurchasePrice(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('products.sellingPriceLabel')}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={newSellingPrice}
                onChange={(e) => setNewSellingPrice(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('products.reorderLabel')}
              </label>
              <input
                type="number"
                min="0"
                value={newReorderLevel}
                onChange={(e) => setNewReorderLevel(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('products.unitLabel')}
              </label>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff' }}
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="bag">Bags (bag)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="ton">Metric Tonnes (t)</option>
                <option value="bucket">Buckets (bkt)</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
