import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Calendar,
  MessageSquare,
  FileText,
  Phone,
  Mail,
  MapPin,
  Building,
  Briefcase,
  X,
  Edit2,
} from 'lucide-react';

interface FollowUpNote {
  id: string;
  note: string;
  createdAt: string;
  createdBy: {
    name: string;
    role: string;
  };
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  createdBy: {
    name: string;
  };
  followUpNotes?: FollowUpNote[];
}

const Customers: React.FC = () => {
  const { fetchWithAuth } = useAuth();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'RETAIL' as 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR',
    address: '',
    status: 'LEAD' as 'LEAD' | 'ACTIVE' | 'INACTIVE',
    followUpDate: '',
    notes: '',
  });

  const [newNote, setNewNote] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        status: statusFilter,
        page: page.toString(),
        limit: '10',
      });

      const res = await fetchWithAuth(`/api/customers?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, statusFilter, page]);

  // Load detailed notes for selected customer
  const loadCustomerDetails = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomer(data.data);
      }
    } catch (err) {
      console.error('Failed to load customer details:', err);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('ADD');
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'RETAIL',
      address: '',
      status: 'LEAD',
      followUpDate: '',
      notes: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setModalMode('EDIT');
    setFormData({
      name: cust.name,
      mobile: cust.mobile,
      email: cust.email,
      businessName: cust.businessName,
      gstNumber: cust.gstNumber || '',
      customerType: cust.customerType,
      address: cust.address,
      status: cust.status,
      followUpDate: cust.followUpDate ? new Date(cust.followUpDate).toISOString().slice(0, 10) : '',
      notes: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError(null);

    // Format GST and Dates
    const payload = {
      ...formData,
      gstNumber: formData.gstNumber.trim() || null,
      followUpDate: formData.followUpDate || null,
      notes: modalMode === 'ADD' ? formData.notes : undefined,
    };

    try {
      const url = modalMode === 'ADD' ? '/api/customers' : `/api/customers/${selectedCustomer?.id}`;
      const method = modalMode === 'ADD' ? 'POST' : 'PUT';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        loadCustomers();
        if (modalMode === 'EDIT' && selectedCustomer) {
          loadCustomerDetails(selectedCustomer.id);
        }
      } else {
        setFormError(data.message || 'Operation failed. Check input validation.');
      }
    } catch (err) {
      setFormError('Failed to connect to the server.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCustomer) return;

    try {
      const res = await fetchWithAuth(`/api/customers/${selectedCustomer.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote }),
      });

      if (res.ok) {
        setNewNote('');
        loadCustomerDetails(selectedCustomer.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Customer CRM</h1>
          <p className="subtitle">Manage business leads, customer files, and follow-ups</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Main CRM Grid (Split Screen: List on Left, Detail on Right) */}
      <div className="crm-layout">
        {/* Left Side: List & Filters */}
        <div className="crm-list-pane glass-card">
          <div className="filter-row">
            <div className="search-box">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search name, mobile, business..."
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
              <option value="LEAD">Leads</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {loading ? (
            <div className="list-loading">
              <div className="spinner"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <p>No customers found matching criteria.</p>
            </div>
          ) : (
            <div className="customer-cards-list">
              {customers.map((cust) => (
                <div
                  key={cust.id}
                  className={`customer-summary-item ${
                    selectedCustomer?.id === cust.id ? 'selected' : ''
                  }`}
                  onClick={() => loadCustomerDetails(cust.id)}
                >
                  <div className="customer-item-header">
                    <h4>{cust.name}</h4>
                    <span className={`badge badge-${cust.status.toLowerCase()}`}>
                      {cust.status}
                    </span>
                  </div>
                  <div className="customer-item-body">
                    <span className="business-name">
                      <Building size={12} /> {cust.businessName}
                    </span>
                    <span className="customer-type">
                      {cust.customerType}
                    </span>
                  </div>
                  <div className="customer-item-footer">
                    <span>
                      <Phone size={12} /> {cust.mobile}
                    </span>
                    {cust.followUpDate && (
                      <span className="follow-tag">
                        <Calendar size={12} />{' '}
                        {new Date(cust.followUpDate).toLocaleDateString()}
                      </span>
                    )}
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

        {/* Right Side: Customer Detailed Profile */}
        <div className="crm-detail-pane">
          {selectedCustomer ? (
            <div className="glass-card detail-profile-card">
              {/* Profile Header */}
              <div className="profile-header">
                <div>
                  <h2>{selectedCustomer.name}</h2>
                  <p className="business-subtitle">
                    <Building size={16} /> {selectedCustomer.businessName}
                  </p>
                </div>
                <div className="profile-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEditModal(selectedCustomer)}
                  >
                    <Edit2 size={14} /> Edit File
                  </button>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="profile-attributes grid-2">
                <div className="attribute-item">
                  <span className="attr-label">Contact Mobile</span>
                  <span className="attr-value">
                    <Phone size={14} /> {selectedCustomer.mobile}
                  </span>
                </div>
                <div className="attribute-item">
                  <span className="attr-label">Email Address</span>
                  <span className="attr-value">
                    <Mail size={14} /> {selectedCustomer.email}
                  </span>
                </div>
                <div className="attribute-item">
                  <span className="attr-label">Customer Category</span>
                  <span className="attr-value">
                    <Briefcase size={14} /> {selectedCustomer.customerType}
                  </span>
                </div>
                <div className="attribute-item">
                  <span className="attr-label">GSTIN / Tax Code</span>
                  <span className="attr-value">
                    <FileText size={14} />{' '}
                    {selectedCustomer.gstNumber || 'Not Provided (Optional)'}
                  </span>
                </div>
                <div className="attribute-item full-width">
                  <span className="attr-label">Registered Address</span>
                  <span className="attr-value">
                    <MapPin size={14} /> {selectedCustomer.address}
                  </span>
                </div>
                {selectedCustomer.followUpDate && (
                  <div className="attribute-item full-width highlight-follow">
                    <span className="attr-label">Next Scheduled Follow-up</span>
                    <span className="attr-value text-warn">
                      <Calendar size={14} />{' '}
                      {new Date(selectedCustomer.followUpDate).toLocaleDateString(
                        'en-US',
                        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Follow-up notes section */}
              <div className="timeline-section">
                <h3>
                  <MessageSquare size={16} /> Activity Timeline & Follow-ups
                </h3>

                {/* Add new follow-up note form */}
                <form onSubmit={handleAddNote} className="note-form">
                  <textarea
                    placeholder="Log a new phone call, meeting discussion, or status update here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="textarea-field"
                    rows={3}
                    required
                  />
                  <button type="submit" className="btn btn-primary btn-sm align-right">
                    Submit Update Log
                  </button>
                </form>

                {/* Timeline display */}
                <div className="timeline-list">
                  {!selectedCustomer.followUpNotes ||
                  selectedCustomer.followUpNotes.length === 0 ? (
                    <p className="no-notes">No updates logged yet.</p>
                  ) : (
                    selectedCustomer.followUpNotes.map((note) => (
                      <div key={note.id} className="timeline-node">
                        <div className="node-marker"></div>
                        <div className="node-content">
                          <p className="node-text">{note.note}</p>
                          <div className="node-footer">
                            <span className="node-author">
                              By {note.createdBy.name} ({note.createdBy.role})
                            </span>
                            <span className="node-time">
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card empty-detail-card">
              <MessageSquare size={48} className="muted-icon" />
              <h3>No Customer Selected</h3>
              <p>Click on a customer card in the left list to view notes history and submit updates.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Dialog Overlay */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modalMode === 'ADD' ? 'Add Customer Account' : 'Edit Customer Account'}</h2>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="alert-banner alert-danger">
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="modal-form">
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="name">Customer Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="businessName">Business Name</label>
                  <input
                    id="businessName"
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="mobile">Mobile Number</label>
                  <input
                    id="mobile"
                    type="text"
                    placeholder="+91..."
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="customerType">Type of Customer</label>
                  <select
                    id="customerType"
                    value={formData.customerType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customerType: e.target.value as 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR',
                      })
                    }
                    className="select-field"
                  >
                    <option value="RETAIL">Retail Store</option>
                    <option value="WHOLESALE">Wholesale Merchant</option>
                    <option value="DISTRIBUTOR">Distributor Agent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="status">Account Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'LEAD' | 'ACTIVE' | 'INACTIVE',
                      })
                    }
                    className="select-field"
                  >
                    <option value="LEAD">Lead Status</option>
                    <option value="ACTIVE">Active Partner</option>
                    <option value="INACTIVE">Inactive Account</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="gstNumber">GSTIN / Tax ID (Optional)</label>
                  <input
                    id="gstNumber"
                    type="text"
                    placeholder="27AAAAA1111A1Z1"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="followUpDate">Next Follow-up Date</label>
                  <input
                    id="followUpDate"
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Billing & Delivery Address</label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="textarea-field"
                  rows={2}
                  required
                />
              </div>

              {modalMode === 'ADD' && (
                <div className="form-group">
                  <label htmlFor="notes">Initial Follow-up / Intake Note</label>
                  <textarea
                    id="notes"
                    placeholder="Log detail on product interests or first contact details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="textarea-field"
                    rows={2}
                  />
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : 'Save Customer File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Customers;
