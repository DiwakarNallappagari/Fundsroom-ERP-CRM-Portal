import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Trash,
  FileText,
  Printer,
  User,
  ShoppingBag,
  Info,
  X,
  AlertCircle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ChallanItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  productSkuSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  amount: number;
}

interface Customer {
  id: string;
  name: string;
  businessName: string;
  mobile: string;
  email: string;
  gstNumber?: string | null;
  address: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
}

interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  totalQuantity: number;
  totalAmount: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  customer: Customer;
  items: ChallanItem[];
  createdBy: {
    name: string;
    role: string;
  };
}

const Challans: React.FC = () => {
  const { fetchWithAuth, user } = useAuth();

  const [challans, setChallans] = useState<Challan[]>([]);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals / Wizard View
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  
  // Create wizard states
  const [wizardCustomerId, setWizardCustomerId] = useState('');
  const [wizardItems, setWizardItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 1 },
  ]);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardLoading, setWizardLoading] = useState(false);

  const loadChallans = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        page: page.toString(),
        limit: '12',
      });
      const res = await fetchWithAuth(`/api/challans?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setChallans(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallans();
  }, [search, statusFilter, page]);

  const loadChallanDetails = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/challans/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedChallan(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateWizard = async () => {
    setWizardCustomerId('');
    setWizardItems([{ productId: '', quantity: 1 }]);
    setWizardError(null);
    setShowCreateWizard(true);

    // Fetch lists
    try {
      const [custRes, prodRes] = await Promise.all([
        fetchWithAuth('/api/customers?limit=100'),
        fetchWithAuth('/api/products?limit=100'),
      ]);

      if (custRes.ok) {
        const data = await custRes.json();
        setCustomersList(data.data);
      }
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProductsList(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Wizard methods
  const handleAddItemRow = () => {
    setWizardItems([...wizardItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (wizardItems.length === 1) return;
    const items = [...wizardItems];
    items.splice(index, 1);
    setWizardItems(items);
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: any) => {
    const items = [...wizardItems];
    if (field === 'productId') {
      items[index].productId = value;
    } else if (field === 'quantity') {
      items[index].quantity = Math.max(1, parseInt(value) || 1);
    }
    setWizardItems(items);
  };

  const handleSaveChallan = async (status: 'DRAFT' | 'CONFIRMED') => {
    setWizardError(null);
    setWizardLoading(true);

    // Filter items
    const filteredItems = wizardItems.filter((i) => i.productId !== '');
    if (!wizardCustomerId) {
      setWizardError('Please select a customer for this challan.');
      setWizardLoading(false);
      return;
    }
    if (filteredItems.length === 0) {
      setWizardError('Please select at least one valid product SKU.');
      setWizardLoading(false);
      return;
    }

    try {
      const res = await fetchWithAuth('/api/challans', {
        method: 'POST',
        body: JSON.stringify({
          customerId: wizardCustomerId,
          status,
          items: filteredItems,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateWizard(false);
        loadChallans();
        // Automatically select the newly created challan
        loadChallanDetails(data.data.id);
      } else {
        setWizardError(data.message || 'Failed to create challan. Review inventory limits.');
      }
    } catch (err) {
      setWizardError('Failed to establish server connection.');
    } finally {
      setWizardLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    if (!window.confirm(`Are you sure you want to transition this challan status to: ${status}?`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/challans/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (res.ok) {
        loadChallans();
        loadChallanDetails(id);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPDF = (challan: Challan) => {
    const doc = new jsPDF();
    
    // Header banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 45, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('FUNDSROOM DISTRIBUTION', 15, 22);
    
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text('ERP System • Sales Operations Invoice', 15, 30);
    
    // Challan details box
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(challan.challanNumber, 195, 22, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Status: ${challan.status}`, 195, 28, { align: 'right' });
    doc.text(`Date: ${new Date(challan.createdAt).toLocaleDateString()}`, 195, 34, { align: 'right' });
    
    // Reset typography
    doc.setTextColor(31, 41, 55); // dark gray
    
    // Left side: Billing Address
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BILL TO / DELIVER TO:', 15, 60);
    doc.setFont('Helvetica', 'normal');
    doc.text(challan.customer.name, 15, 66);
    doc.setFont('Helvetica', 'bold');
    doc.text(challan.customer.businessName, 15, 71);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    
    // Address wrap text
    const addressLines = doc.splitTextToSize(challan.customer.address, 90);
    doc.text(addressLines, 15, 77);
    
    doc.text(`Contact: ${challan.customer.mobile}`, 15, 95);
    doc.text(`Email: ${challan.customer.email}`, 15, 100);
    if (challan.customer.gstNumber) {
      doc.setFont('Helvetica', 'bold');
      doc.text(`GSTIN: ${challan.customer.gstNumber}`, 15, 105);
    }
    
    // Right side: Company details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SHIP FROM (SENDER):', 110, 60);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Fundsroom Distribution Hub', 110, 66);
    doc.text('Aisle 4, Industrial Logistics Center', 110, 71);
    doc.text('Sector 62, Noida, UP - 201301', 110, 76);
    doc.text('Email: dispatch@fundsroom.com', 110, 81);
    doc.text(`Prepared by: ${challan.createdBy.name} (${challan.createdBy.role})`, 110, 90);
    
    // Horizontal separator
    doc.setDrawColor(229, 231, 235);
    doc.line(15, 115, 195, 115);
    
    // Table Header
    doc.setFillColor(243, 244, 246); // gray-100
    doc.rect(15, 120, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Product Name & Description', 18, 125);
    doc.text('SKU', 105, 125);
    doc.text('Rate', 130, 125, { align: 'right' });
    doc.text('Qty', 155, 125, { align: 'right' });
    doc.text('Subtotal', 190, 125, { align: 'right' });
    
    // Table Rows
    let y = 134;
    doc.setFont('Helvetica', 'normal');
    challan.items.forEach((item, index) => {
      // Row alternating bg
      if (index % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(15, y - 5, 180, 8, 'F');
      }
      doc.text(item.productNameSnapshot, 18, y);
      doc.text(item.productSkuSnapshot, 105, y);
      doc.text(`INR ${item.unitPriceSnapshot.toFixed(2)}`, 130, y, { align: 'right' });
      doc.text(String(item.quantity), 155, y, { align: 'right' });
      doc.text(`INR ${item.amount.toFixed(2)}`, 190, y, { align: 'right' });
      y += 8;
    });
    
    // Total calculation panel
    y += 4;
    doc.line(15, y - 4, 195, y - 4);
    
    doc.setFont('Helvetica', 'bold');
    doc.text('Total Quantities:', 125, y);
    doc.text(String(challan.totalQuantity), 155, y, { align: 'right' });
    
    doc.setFontSize(11);
    doc.text('Grand Total Amount:', 125, y + 6);
    doc.text(`INR ${challan.totalAmount.toFixed(2)}`, 190, y + 6, { align: 'right' });
    
    // Notes / Term rules at bottom
    y += 25;
    doc.setDrawColor(229, 231, 235);
    doc.rect(15, y, 180, 20);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text('Terms & Conditions:', 18, y + 5);
    doc.setFont('Helvetica', 'normal');
    doc.text('1. Goods once dispatched cannot be returned or exchanged without audit confirmation.', 18, y + 10);
    doc.text('2. Please inspect the seal and stock quantity physically before signing the delivery challan copy.', 18, y + 14);
    
    // Save/Download PDF
    doc.save(`${challan.challanNumber}.pdf`);
  };

  const getProductStockAlert = (productId: string, quantity: number) => {
    if (!productId) return null;
    const prod = productsList.find((p) => p.id === productId);
    if (!prod) return null;

    if (prod.currentStock === 0) {
      return { type: 'DANGER', text: `❌ SKU out of stock! (Available: 0)` };
    }
    if (prod.currentStock < quantity) {
      return { type: 'DANGER', text: `❌ Insufficient stock! Available: ${prod.currentStock}` };
    }
    if (prod.currentStock - quantity <= 10) {
      return { type: 'WARNING', text: `⚠️ Warning: Stock will drop to ${prod.currentStock - quantity} (Low stock alert)` };
    }
    return null;
  };

  const calculateSubtotal = () => {
    let total = 0;
    wizardItems.forEach((item) => {
      const prod = productsList.find((p) => p.id === item.productId);
      if (prod) {
        total += prod.unitPrice * item.quantity;
      }
    });
    return total;
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
          <h1>Sales Challans</h1>
          <p className="subtitle">Draft, confirm, or cancel shipping receipts and billing snapshots</p>
        </div>
        {user?.role !== 'WAREHOUSE' && (
          <button className="btn btn-primary" onClick={handleOpenCreateWizard}>
            <Plus size={18} /> New Sales Challan
          </button>
        )}
      </div>

      {/* Main Split Challans View */}
      <div className="crm-layout">
        {/* Left Side: Challans List */}
        <div className="crm-list-pane glass-card">
          <div className="filter-row">
            <div className="search-box">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search Challan No, Customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input-field"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="select-field status-select"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div className="list-loading">
              <div className="spinner"></div>
            </div>
          ) : challans.length === 0 ? (
            <div className="empty-state">
              <p>No sales challans recorded.</p>
            </div>
          ) : (
            <div className="customer-cards-list">
              {challans.map((ch) => (
                <div
                  key={ch.id}
                  className={`customer-summary-item ${
                    selectedChallan?.id === ch.id ? 'selected' : ''
                  }`}
                  onClick={() => loadChallanDetails(ch.id)}
                >
                  <div className="customer-item-header">
                    <h4>{ch.challanNumber}</h4>
                    <span className={`badge badge-${ch.status.toLowerCase()}`}>
                      {ch.status}
                    </span>
                  </div>
                  <div className="customer-item-body">
                    <span className="business-name">
                      <User size={12} /> {ch.customer.name}
                    </span>
                    <span className="challan-amount font-bold">
                      {formatCurrency(ch.totalAmount)}
                    </span>
                  </div>
                  <div className="customer-item-footer">
                    <span>
                      Date: {new Date(ch.createdAt).toLocaleDateString()}
                    </span>
                    <span className="follow-tag" style={{ color: 'var(--text-muted)' }}>
                      {ch.totalQuantity} items
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-wrapper">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="btn btn-secondary btn-sm"
              >
                Prev
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

        {/* Right Side: Challan Detail Viewer */}
        <div className="crm-detail-pane">
          {selectedChallan ? (
            <div className="glass-card detail-profile-card">
              {/* Challan Detail Header */}
              <div className="profile-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2>{selectedChallan.challanNumber}</h2>
                    <span className={`badge badge-${selectedChallan.status.toLowerCase()}`}>
                      {selectedChallan.status}
                    </span>
                  </div>
                  <p className="business-subtitle">
                    Generated on {new Date(selectedChallan.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="profile-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleExportPDF(selectedChallan)}
                    title="Export Invoice PDF"
                  >
                    <Printer size={14} /> Print PDF
                  </button>
                </div>
              </div>

              {/* Customer summary inside challan */}
              <div className="grid-2 challan-parties-pane">
                <div className="party-box">
                  <span className="attr-label">Buyer Customer File</span>
                  <h4>{selectedChallan.customer.name}</h4>
                  <p><strong>Business:</strong> {selectedChallan.customer.businessName}</p>
                  <p><strong>Mobile:</strong> {selectedChallan.customer.mobile} • <strong>Email:</strong> {selectedChallan.customer.email}</p>
                  <p><strong>Address:</strong> {selectedChallan.customer.address}</p>
                  {selectedChallan.customer.gstNumber && (
                    <p className="gst-display"><strong>GSTIN:</strong> <code>{selectedChallan.customer.gstNumber}</code></p>
                  )}
                </div>
                <div className="party-box meta-info-box">
                  <span className="attr-label">Challan Metadata</span>
                  <p><strong>Creator Account:</strong> {selectedChallan.createdBy.name}</p>
                  <p><strong>Creator Role:</strong> {selectedChallan.createdBy.role}</p>
                  <p style={{ marginTop: '0.75rem' }}><strong>Item SKU Count:</strong> {selectedChallan.items.length}</p>
                  <p><strong>Total Dispatched Qty:</strong> {selectedChallan.totalQuantity} Units</p>
                </div>
              </div>

              {/* Items Snapshot Table */}
              <div className="challan-items-section">
                <h3><ShoppingBag size={16} /> Dispatched Products list (Snapshotted Values)</h3>
                
                <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU Code</th>
                        <th>Snapshotted Price</th>
                        <th>Quantity Ordered</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChallan.items.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.productNameSnapshot}</strong></td>
                          <td><span className="sku-tag">{item.productSkuSnapshot}</span></td>
                          <td>{formatCurrency(item.unitPriceSnapshot)}</td>
                          <td>{item.quantity} Units</td>
                          <td><strong>{formatCurrency(item.amount)}</strong></td>
                        </tr>
                      ))}
                      <tr className="totals-row">
                        <td colSpan={3} style={{ textAlign: 'right' }}><strong>Grand Totals:</strong></td>
                        <td><strong>{selectedChallan.totalQuantity} Units</strong></td>
                        <td><strong style={{ color: 'var(--success)', fontSize: '1.05rem' }}>{formatCurrency(selectedChallan.totalAmount)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Operations State Transitions panel */}
              {user?.role !== 'WAREHOUSE' && selectedChallan.status !== 'CANCELLED' && (
                <div className="operations-panel-alert glass-card">
                  <h4><Info size={16} /> Operational State Transitions</h4>
                  <p>Manage the dispatch confirmation and stock validation workflows.</p>
                  <div className="transition-buttons">
                    {selectedChallan.status === 'DRAFT' && (
                      <>
                        <button
                          className="btn btn-success"
                          onClick={() => handleUpdateStatus(selectedChallan.id, 'CONFIRMED')}
                        >
                          Confirm Dispatch & Deduct Stock
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleUpdateStatus(selectedChallan.id, 'CANCELLED')}
                        >
                          Cancel Challan
                        </button>
                      </>
                    )}
                    {selectedChallan.status === 'CONFIRMED' && (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleUpdateStatus(selectedChallan.id, 'CANCELLED')}
                      >
                        Cancel & Revert Stock to Inventory
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card empty-detail-card">
              <FileText size={48} className="muted-icon" />
              <h3>No Challan Selected</h3>
              <p>Click on a sales challan number in the left panel to inspect snapshotted line items, print receipt invoices, or transition states.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Sales Challan Wizard Modal */}
      {showCreateWizard && (
        <div className="modal-overlay">
          <div className="modal-content log-modal-content">
            <div className="modal-header">
              <h2>Generate New Sales Challan</h2>
              <button className="close-modal-btn" onClick={() => setShowCreateWizard(false)}>
                <X size={20} />
              </button>
            </div>

            {wizardError && (
              <div className="alert-banner alert-danger" style={{ margin: '1rem' }}>
                <AlertCircle size={16} />
                <span>{wizardError}</span>
              </div>
            )}

            <div className="modal-form" style={{ padding: '1.5rem' }}>
              {/* Buyer select */}
              <div className="form-group">
                <label htmlFor="wiz-customer">Buyer Customer File</label>
                <select
                  id="wiz-customer"
                  value={wizardCustomerId}
                  onChange={(e) => setWizardCustomerId(e.target.value)}
                  className="select-field"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.businessName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lines listing */}
              <div className="challan-builder-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3>Challan Line Items</h3>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddItemRow}
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                <div className="wizard-lines-list">
                  {wizardItems.map((item, idx) => {
                    const alert = getProductStockAlert(item.productId, item.quantity);
                    
                    return (
                      <div key={idx} className="wizard-line-row-group">
                        <div className="wizard-line-row">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                            className="select-field item-select"
                            required
                          >
                            <option value="">-- Choose Product --</option>
                            {productsList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (SKU: {p.sku} • Price: {formatCurrency(p.unitPrice)})
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="input-field qty-input"
                            required
                          />

                          <button
                            type="button"
                            className="btn btn-secondary delete-line-btn text-danger"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={wizardItems.length === 1}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                        {alert && (
                          <div className={`line-stock-alert ${alert.type === 'DANGER' ? 'text-danger' : 'text-warn'}`}>
                            {alert.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Wizard Footer Figures summary */}
              <div className="wizard-calculation-card glass-card">
                <div className="calc-row">
                  <span>Grand Subtotal:</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--success)' }}>
                    {formatCurrency(calculateSubtotal())}
                  </strong>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateWizard(false)}
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSaveChallan('DRAFT')}
                  disabled={wizardLoading}
                >
                  Save as Draft
                </button>
                
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSaveChallan('CONFIRMED')}
                  disabled={wizardLoading}
                >
                  {wizardLoading ? 'Validating Stock...' : 'Confirm & Deduct Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Challans;
