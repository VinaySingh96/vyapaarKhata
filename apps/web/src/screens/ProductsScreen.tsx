import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';
import { useStore } from '../context/StoreContext.js';
import { formatIndianNumber } from '../utils/currency.js';
import { apiFetch } from '../utils/api.js';
import * as XLSX from 'xlsx';

interface ProductItem {
  id: string;
  name: string;
  nameHi?: string;
  categoryId?: string;
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

interface CategoryItem {
  id: string;
  tenantId?: string;
  parentId?: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  productCount?: number;
  createdAt?: string;
}

interface UnitItem {
  id: string;
  name: string;
  symbol: string;
  unitType?: string;
  isActive: boolean;
}

export const ProductsScreen: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();
  const { tenantId } = useStore();

  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [unitsList, setUnitsList] = useState<UnitItem[]>([]);

  // Form State for Add Product
  const [newProductName, setNewProductName] = useState('');
  const [newProductNameHi, setNewProductNameHi] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newUnitId, setNewUnitId] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('100');
  const [newSellingPrice, setNewSellingPrice] = useState('130');
  const [newReorderLevel, setNewReorderLevel] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category CRUD State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Category Delete State
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Excel Bulk Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImportItems, setParsedImportItems] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let rawJson: any[] = [];
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const sheetRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
          if (sheetRows && sheetRows.length > 0) {
            rawJson = sheetRows;
            break;
          }
        }

        if (!rawJson || rawJson.length === 0) {
          setImportError('The uploaded Excel sheet contains no rows.');
          setParsedImportItems([]);
          return;
        }

        const mapped = rawJson.map((row) => {
          const getVal = (...keys: string[]) => {
            for (const k of keys) {
              const matchedKey = Object.keys(row).find(
                (rk) => rk.trim().toLowerCase() === k.toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
                return row[matchedKey];
              }
            }
            return '';
          };

          const category = getVal('Category', 'category', 'CATEGORY', 'Category Name', 'श्रेणी');
          const name = getVal('Item Name', 'name', 'Product Name', 'Item', 'सामग्री', 'Item Name (English)');
          const nameHi = getVal(
            'Item Name (Hindi)',
            'Hindi Name',
            'Item Name Hindi',
            'Name (Hindi)',
            'Hindi',
            'nameHi',
            'name_hi',
            'सामग्री (हिंदी)',
            'नाम (हिंदी)'
          );
          const sku = getVal('Item Code / SKU', 'sku', 'Item Code', 'SKU', 'Code');
          const unit = getVal('Unit', 'unit', 'UOM', 'इकाई') || 'pcs';
          const stock = Number(getVal('Initial Stock', 'Stock', 'Quantity', 'stock', 'qty', 'स्टॉक') || 0);
          const purchasePrice = Number(getVal('Purchase Rate (Asset Cost)', 'Purchase Rate', 'Purchase Price', 'Cost', 'Asset Cost', 'खरीद मूल्य') || 0);
          const sellingPrice = Number(getVal('Daily Rental Rate (Sell Rate)', 'Daily Rental Rate', 'Sell Rate', 'Daily Rent', 'Rent', 'Rate', 'Selling Price', 'दैनिक किराया') || 0);
          const description = getVal('Description', 'description', 'Notes', 'विवरण');

          return {
            category,
            name,
            nameHi,
            sku,
            unit,
            stock,
            purchasePrice,
            sellingPrice,
            description,
          };
        }).filter((item) => item.name && String(item.name).trim() !== '');

        if (mapped.length === 0) {
          setImportError('Could not find valid items with an "Item Name" column.');
          setParsedImportItems([]);
          return;
        }

        setParsedImportItems(mapped);
      } catch (err: any) {
        setImportError(`Failed to parse Excel file: ${err.message}`);
        setParsedImportItems([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (parsedImportItems.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await apiFetch('/api/v1/products/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: parsedImportItems }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Bulk import failed');
      }
      toast.success(json.message || `Successfully imported ${parsedImportItems.length} items!`);
      setShowImportModal(false);
      setParsedImportItems([]);
      setImportFile(null);
      loadProducts();
      loadCategories();
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Edit Product State
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameHi, setEditNameHi] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editUnitId, setEditUnitId] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('0');
  const [editSellingPrice, setEditSellingPrice] = useState('0');
  const [editStock, setEditStock] = useState('0');
  const [editReorderLevel, setEditReorderLevel] = useState('0');
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  // Delete Product State
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const handleOpenEditProduct = (p: ProductItem) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditNameHi(p.nameHi || '');
    setEditCategoryId(p.categoryId || (categoriesList[0]?.id || ''));
    setEditUnitId(p.baseUnitId || (unitsList[0]?.id || ''));
    setEditSku(p.sku || '');
    setEditBarcode(p.barcode || '');
    setEditPurchasePrice(String(p.purchasePrice || 0));
    setEditSellingPrice(String(p.sellingPrice || 0));
    setEditStock(String(p.totalStock || 0));
    setEditReorderLevel(String(p.reorderLevel || 0));
    setShowEditProductModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim()) {
      toast.warning('Product name is required');
      return;
    }

    setIsUpdatingProduct(true);
    try {
      const res = await apiFetch(`/api/v1/products/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          nameHi: editNameHi.trim() || undefined,
          categoryId: editCategoryId,
          baseUnitId: editUnitId,
          sku: editSku.trim(),
          barcode: editBarcode.trim() || undefined,
          purchasePrice: parseFloat(editPurchasePrice) || 0,
          sellingPrice: parseFloat(editSellingPrice) || 0,
          totalStock: parseFloat(editStock) || 0,
          reorderLevel: parseFloat(editReorderLevel) || 0,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to update product');

      toast.success('Product updated successfully!');
      setShowEditProductModal(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Error updating product');
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      const res = await apiFetch(`/api/v1/products/${productToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to remove product');

      toast.success('Product removed from catalog');
      setShowDeleteProductModal(false);
      setProductToDelete(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting product');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleExportCatalog = () => {
    if (products.length === 0) {
      toast.warning('No products in catalog to export');
      return;
    }

    const exportData = products.map((p) => ({
      Category: p.categoryName || 'General',
      'Item Name': p.name,
      'Item Name (Hindi)': p.nameHi || '',
      'Item Code / SKU': p.sku || '',
      Unit: p.baseUnitSymbol || 'pcs',
      'Initial Stock': p.totalStock || 0,
      'Purchase Rate (Asset Cost)': p.purchasePrice || 0,
      'Daily Rental Rate (Sell Rate)': p.sellingPrice || 0,
      'Reorder Warning Level': p.reorderLevel || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalog');
    XLSX.writeFile(wb, `catalog_export_${Date.now().toString().slice(-6)}.xlsx`);
    toast.success(`Exported ${products.length} products to Excel!`);
  };

  // Load products from backend
  const loadProducts = () => {
    setLoading(true);
    apiFetch('/api/v1/products')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const mapped: ProductItem[] = json.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            nameHi: p.nameHi || p.name_hi,
            categoryId: p.categoryId,
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
        }
      })
      .catch((err) => {
        console.warn('Could not load products:', err);
        toast.error('Failed to load products from server');
      })
      .finally(() => setLoading(false));
  };

  // Load categories from backend
  const loadCategories = () => {
    apiFetch('/api/v1/products/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCategoriesList(json.data);
          if (json.data.length > 0 && !newCategoryId) {
            setNewCategoryId(json.data[0].id);
          }
        }
      })
      .catch((err) => console.warn('Could not load categories:', err));
  };

  // Load units from backend
  const loadUnits = () => {
    apiFetch('/api/v1/products/units')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const seen = new Set<string>();
          const deduped = json.data.filter((u: any) => {
            const key = (u.name || u.symbol || '').toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setUnitsList(deduped);
          if (deduped.length > 0 && !newUnitId) {
            setNewUnitId(deduped[0].id);
          }
        }
      })
      .catch((err) => console.warn('Could not load units:', err));
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadUnits();
  }, [tenantId]);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategoryFilter === 'all' ||
      p.categoryName === selectedCategoryFilter ||
      p.categoryId === selectedCategoryFilter;
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

  // Add Product Submit Handler
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      toast.warning('Product name is required');
      return;
    }
    if (!newCategoryId) {
      toast.warning('Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedSku = newSku.trim() || `SKU-${Date.now().toString().slice(-6)}`;
      const prodId = crypto.randomUUID();

      const res = await apiFetch('/api/v1/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: prodId,
          name: newProductName.trim(),
          nameHi: newProductNameHi.trim() || undefined,
          categoryId: newCategoryId,
          sku: generatedSku,
          barcode: newBarcode.trim() || undefined,
          purchasePrice: parseFloat(newPurchasePrice) || 0,
          sellingPrice: parseFloat(newSellingPrice) || 0,
          reorderLevel: parseFloat(newReorderLevel) || 0,
          baseUnitId: newUnitId || '10000000-0000-0000-0000-000000000001',
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
      loadCategories(); // refresh product counts
    } catch (err: any) {
      toast.error(err.message || 'Error creating product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category CRUD: Create Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.warning('Category name is required');
      return;
    }

    setIsSubmittingCategory(true);
    try {
      const res = await apiFetch('/api/v1/products/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: catName.trim(),
          code: catCode.trim() || undefined,
          description: catDescription.trim() || undefined,
          isActive: catIsActive,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create category');
      }

      toast.success(`Category "${json.data.name}" created successfully!`);
      setShowAddCategoryModal(false);
      setCatName('');
      setCatCode('');
      setCatDescription('');
      setCatIsActive(true);
      // Auto-select this newly created category in the Add Product form
      setNewCategoryId(json.data.id);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || 'Error creating category');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Category CRUD: Open Edit Modal
  const handleOpenEditCategory = (cat: CategoryItem) => {
    setCategoryToEdit(cat);
    setCatName(cat.name);
    setCatCode(cat.code || '');
    setCatDescription(cat.description || '');
    setCatIsActive(cat.isActive);
    setShowEditCategoryModal(true);
  };

  // Category CRUD: Update Handler
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToEdit) return;
    if (!catName.trim()) {
      toast.warning('Category name is required');
      return;
    }

    setIsSubmittingCategory(true);
    try {
      const res = await apiFetch(`/api/v1/products/categories/${categoryToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: catName.trim(),
          code: catCode.trim() || undefined,
          description: catDescription.trim() || undefined,
          isActive: catIsActive,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to update category');
      }

      toast.success(`Category "${catName}" updated successfully!`);
      setShowEditCategoryModal(false);
      setCategoryToEdit(null);
      loadCategories();
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Error updating category');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Category CRUD: Delete Handler
  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeletingCategory(true);
    try {
      const res = await apiFetch(`/api/v1/products/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to delete category');
      }

      toast.success(`Category "${categoryToDelete.name}" deleted!`);
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
      loadCategories();
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Could not delete category');
    } finally {
      setIsDeletingCategory(false);
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
          marginBottom: '16px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            {activeTab === 'products' ? t('products.title') : t('categories.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {activeTab === 'products'
              ? t('products.subtitle')
              : 'Organize catalog into categories, subcategories and industry classifications.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'categories' ? (
            <button
              onClick={() => {
                setCatName('');
                setCatCode('');
                setCatDescription('');
                setCatIsActive(true);
                setShowAddCategoryModal(true);
              }}
              style={{
                padding: '9px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
              }}
            >
              + Add New Category
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="btn-export-catalog"
                type="button"
                onClick={handleExportCatalog}
                style={{
                  padding: '9px 14px',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                📤 Export Catalog (.xlsx)
              </button>
              <button
                id="btn-import-excel"
                type="button"
                onClick={() => {
                  setImportFile(null);
                  setParsedImportItems([]);
                  setImportError(null);
                  setShowImportModal(true);
                }}
                style={{
                  padding: '9px 14px',
                  backgroundColor: '#ffffff',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                📊 Import Excel / CSV
              </button>
              <button
                id="btn-add-new-product"
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                }}
              >
                {t('products.addNew')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Switcher: Products Catalogue vs Categories */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: '#f3f4f6',
          padding: '4px',
          borderRadius: '8px',
          width: 'fit-content',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          style={{
            padding: '7px 16px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'products' ? '#ffffff' : 'transparent',
            color: activeTab === 'products' ? '#2563eb' : '#4b5563',
            boxShadow: activeTab === 'products' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {t('products.tabProducts')} ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '7px 16px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'categories' ? '#ffffff' : 'transparent',
            color: activeTab === 'categories' ? '#2563eb' : '#4b5563',
            boxShadow: activeTab === 'categories' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {t('products.tabCategories')} ({categoriesList.length})
        </button>
      </div>

      {/* TAB 1: PRODUCTS CATALOGUE */}
      {activeTab === 'products' && (
        <>
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
            id="products-search-filter-bar"
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
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: '0 1 220px' }}>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13.5px',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="all">{t('products.allCategories')}</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                loadProducts();
                loadCategories();
              }}
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
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
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
                        <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#334155',
                            }}
                          >
                            {p.categoryName || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#374151' }}>
                          <div>{p.sku || '—'}</div>
                          {p.barcode && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{p.barcode}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4b5563' }}>{p.baseUnitSymbol || 'pcs'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>
                          ₹{formatIndianNumber(p.purchasePrice || 0, { decimals: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                          ₹{formatIndianNumber(p.sellingPrice || 0, { decimals: 2 })}
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
                        <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '5px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProductToDelete(p);
                                setShowDeleteProductModal(true);
                              }}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '5px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                              title="Delete Product"
                            >
                              🗑️
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
        </>
      )}

      {/* TAB 2: CATEGORIES MANAGEMENT (FULL CRUD) */}
      {activeTab === 'categories' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                📂 Master Categories ({categoriesList.length})
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#6b7280' }}>
                Manage construction & building material departments, hierarchy, and assigned item counts.
              </p>
            </div>
            <button
              onClick={() => {
                setCatName('');
                setCatCode('');
                setCatDescription('');
                setCatIsActive(true);
                setShowAddCategoryModal(true);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              + Create Category
            </button>
          </div>

          <div className="vk-table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#6b7280', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px' }}>Category Name</th>
                  <th style={{ padding: '12px 16px' }}>Code / Identifier</th>
                  <th style={{ padding: '12px 16px' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Assigned Products</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categoriesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>
                      No categories found. Click "+ Create Category" to add one.
                    </td>
                  </tr>
                ) : (
                  categoriesList.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>
                        {cat.name}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4b5563' }}>
                        {cat.code || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                        {cat.description || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: (cat.productCount || 0) > 0 ? '#e0f2fe' : '#f1f5f9',
                            color: (cat.productCount || 0) > 0 ? '#0369a1' : '#64748b',
                          }}
                        >
                          {cat.productCount || 0} Products
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: cat.isActive !== false ? '#ecfdf5' : '#f3f4f6',
                            color: cat.isActive !== false ? '#065f46' : '#6b7280',
                          }}
                        >
                          {cat.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCategory(cat)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#2563eb',
                            }}
                            title="Edit Category"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryToDelete(cat);
                              setShowDeleteCategoryModal(true);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#dc2626',
                            }}
                            title="Delete Category"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD PRODUCT WITH CATEGORY SELECTION */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('products.modalTitle')}
        subtitle="Add a new catalog item with pricing, category, SKU, and godown threshold."
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
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
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
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Category Input & Quick Add */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                {t('products.categoryLabel')} *
              </label>
              <button
                type="button"
                onClick={() => {
                  setCatName('');
                  setCatCode('');
                  setCatDescription('');
                  setCatIsActive(true);
                  setShowAddCategoryModal(true);
                }}
                style={{
                  fontSize: '11.5px',
                  color: '#2563eb',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 600,
                  textDecoration: 'underline',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                + New Category
              </button>
            </div>
            <select
              required
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '13.5px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              {categoriesList.length === 0 ? (
                <option value="">No categories found - click + New Category</option>
              ) : (
                categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.code ? `(${cat.code})` : ''}
                  </option>
                ))
              )}
            </select>
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
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
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
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
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
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
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
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
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
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {t('products.unitLabel')}
              </label>
              <select
                value={newUnitId}
                onChange={(e) => setNewUnitId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
              >
                {unitsList.length > 0 ? (
                  unitsList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))
                ) : (
                  <option value="">Loading units...</option>
                )}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD CATEGORY MODAL */}
      <Modal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        title="+ Create New Category"
        subtitle="Define a new product department or material classification."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddCategoryModal(false)}
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
              form="form-add-category"
              disabled={isSubmittingCategory}
              style={{
                padding: '8px 18px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isSubmittingCategory ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmittingCategory ? 'Creating...' : 'Create Category'}
            </button>
          </>
        }
      >
        <form id="form-add-category" onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paints & Primer, Hardware Tools"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Category Code / Identifier
            </label>
            <input
              type="text"
              placeholder="e.g. CAT-PAINTS (auto-generated if empty)"
              value={catCode}
              onChange={(e) => setCatCode(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of products in this category"
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="cat-is-active"
              checked={catIsActive}
              onChange={(e) => setCatIsActive(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="cat-is-active" style={{ fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              Active (Visible in POS billing and catalogue dropdowns)
            </label>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: EDIT CATEGORY MODAL */}
      <Modal
        isOpen={showEditCategoryModal}
        onClose={() => {
          setShowEditCategoryModal(false);
          setCategoryToEdit(null);
        }}
        title="✏️ Edit Category"
        subtitle={`Update details for ${categoryToEdit?.name || 'Category'}`}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowEditCategoryModal(false);
                setCategoryToEdit(null);
              }}
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
              form="form-edit-category"
              disabled={isSubmittingCategory}
              style={{
                padding: '8px 18px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isSubmittingCategory ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmittingCategory ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="form-edit-category" onSubmit={handleUpdateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Category Name *
            </label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Category Code / Identifier
            </label>
            <input
              type="text"
              value={catCode}
              onChange={(e) => setCatCode(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              rows={3}
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13.5px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="edit-cat-is-active"
              checked={catIsActive}
              onChange={(e) => setCatIsActive(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="edit-cat-is-active" style={{ fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              Active (Visible in POS billing and catalogue dropdowns)
            </label>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: CONFIRM DELETE CATEGORY */}
      <Modal
        isOpen={showDeleteCategoryModal}
        onClose={() => {
          setShowDeleteCategoryModal(false);
          setCategoryToDelete(null);
        }}
        title="Confirm Category Deletion"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              onClick={() => {
                setShowDeleteCategoryModal(false);
                setCategoryToDelete(null);
              }}
              disabled={isDeletingCategory}
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
              onClick={handleConfirmDeleteCategory}
              disabled={isDeletingCategory}
              style={{
                backgroundColor: isDeletingCategory ? '#fca5a5' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isDeletingCategory ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              {isDeletingCategory ? 'Deleting...' : 'Yes, Delete Category'}
            </button>
          </div>
        }
      >
        <div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
            Are you sure you want to delete category <strong>{categoryToDelete?.name}</strong>?
          </p>

          {(categoryToDelete?.productCount || 0) > 0 ? (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '12px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#991b1b',
              }}
            >
              ⚠️ <strong>Warning:</strong> This category has <strong>{categoryToDelete?.productCount} product(s)</strong> assigned to it.
              The database will prevent deleting this category until all products are reassigned or deleted.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '12px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#166534',
              }}
            >
              ✓ This category has 0 assigned products and can be safely removed.
            </div>
          )}
        </div>
      </Modal>

      {/* EXCEL / CSV BULK IMPORT MODAL */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          if (!isImporting) {
            setShowImportModal(false);
            setParsedImportItems([]);
            setImportFile(null);
            setImportError(null);
          }
        }}
        title="📊 Bulk Import Products & Rental Fleet from Excel"
        subtitle="Upload Category, Product Name, Stock Count, Daily Rental Rate, and Purchase Cost"
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {parsedImportItems.length > 0 && (
                <span>
                  Ready to import: <strong>{parsedImportItems.length} items</strong>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedImportItems([]);
                  setImportFile(null);
                  setImportError(null);
                }}
                disabled={isImporting}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {t('btn.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || parsedImportItems.length === 0}
                style={{
                  backgroundColor: isImporting || parsedImportItems.length === 0 ? '#93c5fd' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  cursor: isImporting || parsedImportItems.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isImporting ? 'Importing Products...' : `Confirm & Upload (${parsedImportItems.length} Items)`}
              </button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Template Download & Help Banner */}
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📥 Pre-formatted Excel Spreadsheets Ready for Download:</span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#3b82f6', lineHeight: 1.5 }}>
              Download our ready-made Excel sheets, edit the rates or quantities, and upload them back.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
              <a
                href="/patel_centring_store_items.xlsx"
                download="patel_centring_store_items.xlsx"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  color: '#1d4ed8',
                  border: '1px solid #93c5fd',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                📋 Download Patel Centring Store Catalog (.xlsx)
              </a>
              <a
                href="/patel_building_materials_items.xlsx"
                download="patel_building_materials_items.xlsx"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  color: '#1d4ed8',
                  border: '1px solid #93c5fd',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                🧱 Download Building Materials Catalog (.xlsx)
              </a>
              <a
                href="/sample_product_import_template.xlsx"
                download="sample_product_import_template.xlsx"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                📄 Blank Sample Template (.xlsx)
              </a>
            </div>
          </div>

          {/* File Upload Drop Zone */}
          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: importFile ? '#f8fafc' : '#ffffff',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onClick={(e) => {
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              {importFile ? importFile.name : 'Click to select or drag & drop an Excel file (.xlsx, .xls, .csv)'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {importFile
                ? `${(importFile.size / 1024).toFixed(1)} KB — Click to choose a different file`
                : 'Supports columns: Category, Item Name, Item Name (Hindi), Initial Stock, Daily Rental Rate, Purchase Rate (Asset Cost), Unit'}
            </div>
          </div>

          {/* Error Message */}
          {importError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#b91c1c',
              }}
            >
              ⚠️ {importError}
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedImportItems.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Preview: {parsedImportItems.length} items parsed from file
                </span>
                <span style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 600 }}>
                  ✓ All rows validated
                </span>
              </div>
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>#</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Category</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Item Name</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Item Name (Hindi / हिन्दी)</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Daily Rent</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Purchase Cost</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Initial Stock</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, color: '#475569' }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedImportItems.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#2563eb' }}>
                          {item.category || 'General'}
                        </td>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '6px 10px', fontWeight: 500, color: '#4f46e5' }}>
                          {item.nameHi || <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          ₹{formatIndianNumber(item.sellingPrice || 0)} / day
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b' }}>
                          ₹{formatIndianNumber(item.purchasePrice || 0)}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {formatIndianNumber(item.stock || 0)}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#64748b' }}>
                          {item.unit || 'pcs'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      <Modal
        isOpen={showEditProductModal}
        onClose={() => {
          if (!isUpdatingProduct) {
            setShowEditProductModal(false);
            setEditingProduct(null);
          }
        }}
        title="✏️ Edit Product in Catalog"
        subtitle={`Update rates, stock count, and details for ${editingProduct?.name}`}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              onClick={() => {
                setShowEditProductModal(false);
                setEditingProduct(null);
              }}
              disabled={isUpdatingProduct}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isUpdatingProduct ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              {t('btn.cancel')}
            </button>
            <button
              type="submit"
              form="form-edit-product"
              disabled={isUpdatingProduct}
              style={{
                backgroundColor: isUpdatingProduct ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '6px',
                cursor: isUpdatingProduct ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              {isUpdatingProduct ? 'Saving...' : 'Update Product'}
            </button>
          </div>
        }
      >
        <form id="form-edit-product" onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Product Name (English) *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Product Name (हिन्दी / Local Name)
            </label>
            <input
              type="text"
              value={editNameHi}
              onChange={(e) => setEditNameHi(e.target.value)}
              placeholder="e.g. बल्ली, बांस, फर्मा, पात्रा"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                Category *
              </label>
              <select
                required
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                Base Unit *
              </label>
              <select
                required
                value={editUnitId}
                onChange={(e) => setEditUnitId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                {unitsList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>
                Daily Rent / Sell Rate (₹) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={editSellingPrice}
                onChange={(e) => setEditSellingPrice(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                Purchase Price / Asset Cost (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={editPurchasePrice}
                onChange={(e) => setEditPurchasePrice(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                Total Fleet Stock Quantity *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={editStock}
                onChange={(e) => setEditStock(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '14px', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                Reorder / Low Stock Warning
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={editReorderLevel}
                onChange={(e) => setEditReorderLevel(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                SKU / Item Code
              </label>
              <input
                type="text"
                value={editSku}
                onChange={(e) => setEditSku(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                Barcode
              </label>
              <input
                type="text"
                value={editBarcode}
                onChange={(e) => setEditBarcode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteProductModal}
        onClose={() => {
          if (!isDeletingProduct) {
            setShowDeleteProductModal(false);
            setProductToDelete(null);
          }
        }}
        title="🗑️ Remove Product from Catalog"
        subtitle="Deactivate this item from your active catalog"
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              onClick={() => {
                setShowDeleteProductModal(false);
                setProductToDelete(null);
              }}
              disabled={isDeletingProduct}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isDeletingProduct ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              {t('btn.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteProduct}
              disabled={isDeletingProduct}
              style={{
                backgroundColor: isDeletingProduct ? '#fca5a5' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isDeletingProduct ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              {isDeletingProduct ? 'Removing...' : 'Yes, Remove Item'}
            </button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
          Are you sure you want to remove <strong>{productToDelete?.name}</strong> from the catalog?
        </p>
      </Modal>
    </div>
  );
};
