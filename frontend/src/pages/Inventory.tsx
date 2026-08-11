import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  AlertTriangle,
  History,
  MapPin,
  X,
  Edit2,
  Sliders,
  Archive,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  createdAt: string;
}

interface StockLog {
  id: string;
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdAt: string;
  createdBy: {
    name: string;
    role: string;
  };
}

const Inventory: React.FC = () => {
  const { fetchWithAuth, user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtering & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalMode, setProductModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [movementLogs, setMovementLogs] = useState<StockLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlert: 10,
    location: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    quantityChanged: 1,
    movementType: 'IN' as 'IN' | 'OUT',
    reason: '',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isWarehouseOrAdmin = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const loadProducts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        category: categoryFilter,
        alert: alertsOnly ? 'true' : 'false',
        page: page.toString(),
        limit: '15',
      });

      const res = await fetchWithAuth(`/api/products?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search, categoryFilter, alertsOnly, page]);

  // Handlers
  const handleOpenAddProduct = () => {
    setProductModalMode('ADD');
    setProductForm({
      name: '',
      sku: '',
      category: '',
      unitPrice: 0,
      currentStock: 0,
      minStockAlert: 10,
      location: '',
    });
    setErrorMsg(null);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setProductModalMode('EDIT');
    setSelectedProduct(prod);
    setProductForm({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unitPrice: prod.unitPrice,
      currentStock: prod.currentStock,
      minStockAlert: prod.minStockAlert,
      location: prod.location,
    });
    setErrorMsg(null);
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);

    try {
      const url = productModalMode === 'ADD' ? '/api/products' : `/api/products/${selectedProduct?.id}`;
      const method = productModalMode === 'ADD' ? 'POST' : 'PUT';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(productForm),
      });

      const data = await res.json();
      if (res.ok) {
        setShowProductModal(false);
        loadProducts();
      } else {
        setErrorMsg(data.message || 'Operation failed. Review input constraints.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to the backend server.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAdjustStock = (prod: Product) => {
    setSelectedProduct(prod);
    setAdjustForm({
      quantityChanged: 1,
      movementType: 'IN',
      reason: '',
    });
    setErrorMsg(null);
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setActionLoading(true);
    setErrorMsg(null);

    // Validation
    if (adjustForm.movementType === 'OUT' && selectedProduct.currentStock < adjustForm.quantityChanged) {
      setErrorMsg(`Insufficient stock. Cannot adjust OUT by ${adjustForm.quantityChanged} units (Available: ${selectedProduct.currentStock}).`);
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/products/${selectedProduct.id}/stock`, {
        method: 'POST',
        body: JSON.stringify(adjustForm),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAdjustModal(false);
        loadProducts();
      } else {
        setErrorMsg(data.message || 'Failed to adjust stock.');
      }
    } catch (err) {
      setErrorMsg('Backend connection failure.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewLogs = async (prod: Product) => {
    setSelectedProduct(prod);
    setShowLogsModal(true);
    setLogsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/products/${prod.id}/movements`);
      if (res.ok) {
        const data = await res.json();
        setMovementLogs(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Product Inventory</h1>
          <p className="subtitle">Track stock levels, warehouse placement, and auditing logs</p>
        </div>
        {isWarehouseOrAdmin && (
          <button className="btn btn-primary" onClick={handleOpenAddProduct}>
            <Plus size={18} /> Add Product SKU
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card table-toolbar">
        <div className="toolbar-search">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search by product name or SKU SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field"
          />
        </div>

        <div className="toolbar-options">
          <input
            type="text"
            placeholder="Filter Category..."
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="input-field cat-input"
          />

          <label className="checkbox-label glass-card-pill">
            <input
              type="checkbox"
              checked={alertsOnly}
              onChange={(e) => {
                setAlertsOnly(e.target.checked);
                setPage(1);
              }}
            />
            <AlertTriangle size={14} className="text-warn" />
            <span>Low Stock Alerts Only</span>
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-card table-card">
        {loading ? (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Loading inventory list...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Archive size={48} className="muted-icon" />
            <p>No products found in the inventory database.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock Level</th>
                  <th>Warehouse Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const isLow = prod.currentStock <= prod.minStockAlert;
                  const isOut = prod.currentStock === 0;

                  return (
                    <tr key={prod.id}>
                      <td>
                        <div className="table-item-name">
                          <strong>{prod.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="sku-tag">{prod.sku}</span>
                      </td>
                      <td>{prod.category}</td>
                      <td>{formatCurrency(prod.unitPrice)}</td>
                      <td>
                        <div className="stock-level-cell">
                          <span
                            className={`badge ${
                              isOut
                                ? 'badge-cancelled'
                                : isLow
                                ? 'badge-draft'
                                : 'badge-active'
                            }`}
                          >
                            {prod.currentStock} Units
                          </span>
                          {isLow && (
                            <span className="stock-alert-text">
                              Alert threshold: {prod.minStockAlert}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="location-pill">
                          <MapPin size={12} /> {prod.location}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {isWarehouseOrAdmin && (
                            <>
                              <button
                                className="action-icon-btn text-accent"
                                onClick={() => handleOpenEditProduct(prod)}
                                title="Edit Product Info"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="action-icon-btn text-warn"
                                onClick={() => handleOpenAdjustStock(prod)}
                                title="Adjust Stock (IN/OUT)"
                              >
                                <Sliders size={16} />
                              </button>
                            </>
                          )}
                          <button
                            className="action-icon-btn text-muted"
                            onClick={() => handleViewLogs(prod)}
                            title="View Stock Movement Logs"
                          >
                            <History size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-wrapper" style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{productModalMode === 'ADD' ? 'Register New Product' : 'Modify Product File'}</h2>
              <button className="close-modal-btn" onClick={() => setShowProductModal(false)}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="alert-banner alert-danger">
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="prod-name">Product Name</label>
                <input
                  id="prod-name"
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="prod-sku">SKU Code</label>
                  <input
                    id="prod-sku"
                    type="text"
                    placeholder="e.g. WIDG-102"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="input-field"
                    disabled={productModalMode === 'EDIT'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prod-cat">Category</label>
                  <input
                    id="prod-cat"
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label htmlFor="prod-price">Unit Price (INR)</label>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.unitPrice}
                    onChange={(e) => setProductForm({ ...productForm, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prod-stock">Initial Stock</label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    value={productForm.currentStock}
                    onChange={(e) => setProductForm({ ...productForm, currentStock: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    disabled={productModalMode === 'EDIT'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prod-alert">Min Alert Stock</label>
                  <input
                    id="prod-alert"
                    type="number"
                    min="0"
                    value={productForm.minStockAlert}
                    onChange={(e) => setProductForm({ ...productForm, minStockAlert: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prod-loc">Warehouse Storage Location</label>
                <input
                  id="prod-loc"
                  type="text"
                  placeholder="e.g. Aisle 4, Row B"
                  value={productForm.location}
                  onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProductModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Product SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Adjust Inventory Stock</h2>
              <button className="close-modal-btn" onClick={() => setShowAdjustModal(false)}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="alert-banner alert-danger">
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="modal-sub-info">
              <p>Product: <strong>{selectedProduct.name}</strong></p>
              <p>SKU: <code>{selectedProduct.sku}</code> • Available Stock: <strong>{selectedProduct.currentStock} Units</strong></p>
            </div>

            <form onSubmit={handleAdjustSubmit} className="modal-form">
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="adj-type">Movement Type</label>
                  <select
                    id="adj-type"
                    value={adjustForm.movementType}
                    onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value as 'IN' | 'OUT' })}
                    className="select-field"
                  >
                    <option value="IN">IN (Receive Stock)</option>
                    <option value="OUT">OUT (Remove Stock)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="adj-qty">Adjustment Count</label>
                  <input
                    id="adj-qty"
                    type="number"
                    min="1"
                    value={adjustForm.quantityChanged}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantityChanged: parseInt(e.target.value) || 1 })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="adj-reason">Audit Justification / Reason</label>
                <textarea
                  id="adj-reason"
                  placeholder="e.g. Purchase order received, damaged goods write-off, manual check audit..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="textarea-field"
                  rows={2}
                  required
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdjustModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Apply Stock Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Logs History Modal */}
      {showLogsModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content log-modal-content">
            <div className="modal-header">
              <h2>Inventory Movement Logs</h2>
              <button className="close-modal-btn" onClick={() => setShowLogsModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-sub-info border-bottom">
              <p>Product: <strong>{selectedProduct.name}</strong></p>
              <p>SKU: <code>{selectedProduct.sku}</code> • Current Level: <strong>{selectedProduct.currentStock} Units</strong></p>
            </div>

            <div className="modal-log-body">
              {logsLoading ? (
                <div className="list-loading">
                  <div className="spinner"></div>
                </div>
              ) : movementLogs.length === 0 ? (
                <div className="empty-state">
                  <p>No logged stock changes found for this product.</p>
                </div>
              ) : (
                <div className="logs-timeline-list">
                  {movementLogs.map((log) => (
                    <div key={log.id} className="log-node glass-card">
                      <div className="log-node-header">
                        <span className={`badge ${log.movementType === 'IN' ? 'badge-active' : 'badge-cancelled'}`}>
                          {log.movementType === 'IN' ? '+' : '-'}{log.quantityChanged} Units
                        </span>
                        <span className="log-node-date">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="log-node-reason"><strong>Reason:</strong> {log.reason}</p>
                      <div className="log-node-footer">
                        <span>Logged by: <strong>{log.createdBy.name}</strong> ({log.createdBy.role})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLogsModal(false)}
                style={{ width: '100%' }}
              >
                Close Logs Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Inventory;
