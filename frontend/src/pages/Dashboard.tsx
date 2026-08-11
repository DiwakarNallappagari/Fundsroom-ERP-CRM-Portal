import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Package,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalChallans: number;
  lowStockCount: number;
  revenue: number;
}

const Dashboard: React.FC = () => {
  const { fetchWithAuth, user } = useAuth();
  const isWarehouse = user?.role === 'WAREHOUSE';
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    totalChallans: 0,
    lowStockCount: 0,
    revenue: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentChallans, setRecentChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);



        // Fetch data concurrently
        const [custRes, prodRes, lowStockRes, challanRes] = await Promise.all([
          !isWarehouse ? fetchWithAuth('/api/customers?limit=1') : Promise.resolve(null),
          fetchWithAuth('/api/products?limit=1'),
          fetchWithAuth('/api/products?alert=true&limit=10'),
          fetchWithAuth('/api/challans?limit=100'),
        ]);

        let totalCustomers = 0;
        let totalProducts = 0;
        let lowStockCount = 0;
        let totalChallans = 0;
        let revenue = 0;
        let challanList: any[] = [];
        let lowStockList: any[] = [];

        if (custRes && custRes.ok) {
          const data = await custRes.json();
          totalCustomers = data.pagination.total;
        }

        if (prodRes.ok) {
          const data = await prodRes.json();
          totalProducts = data.pagination.total;
        }

        if (lowStockRes.ok) {
          const data = await lowStockRes.json();
          lowStockCount = data.pagination.total;
          lowStockList = data.data;
        }

        if (challanRes.ok) {
          const data = await challanRes.json();
          totalChallans = data.pagination.total;
          challanList = data.data;

          // Calculate total invoiced amount from CONFIRMED challans
          revenue = challanList
            .filter((c: any) => c.status === 'CONFIRMED')
            .reduce((sum: number, c: any) => sum + c.totalAmount, 0);
        }

        setStats({
          totalCustomers,
          totalProducts,
          totalChallans,
          lowStockCount,
          revenue,
        });
        setLowStockProducts(lowStockList);
        setRecentChallans(challanList.slice(0, 5)); // top 5 recent
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading business intelligence dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.name}</h1>
          <p className="subtitle">Operational statistics for today</p>
        </div>
        <div className="header-date">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-4">
        {/* Total Customers */}
        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper cust-color">
            <Users size={24} />
          </div>
          <div className="kpi-details">
            <span>Customers CRM</span>
            <h3>{isWarehouse ? '—' : stats.totalCustomers}</h3>
            {isWarehouse ? (
              <span className="kpi-link" style={{ opacity: 0.5, cursor: 'default' }}>
                Restricted Access
              </span>
            ) : (
              <Link to="/customers" className="kpi-link">
                Manage CRM <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Total Products */}
        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper prod-color">
            <Package size={24} />
          </div>
          <div className="kpi-details">
            <span>Inventory SKUs</span>
            <h3>{stats.totalProducts}</h3>
            <Link to="/inventory" className="kpi-link">
              View Inventory <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card kpi-card alert-highlight">
          <div className="kpi-icon-wrapper warn-color">
            <AlertTriangle size={24} />
          </div>
          <div className="kpi-details">
            <span>Low Stock Warnings</span>
            <h3 className={stats.lowStockCount > 0 ? 'text-warn' : ''}>
              {stats.lowStockCount}
            </h3>
            <Link to="/inventory" className="kpi-link">
              Check Levels <ChevronRight size={14} />
            </Link>
          </div>
          {stats.lowStockCount > 0 && <span className="kpi-alert-dot"></span>}
        </div>

        {/* Sales Confirmed Revenue */}
        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper revenue-color">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-details">
            <span>Confirmed Revenue</span>
            <h3>{formatCurrency(stats.revenue)}</h3>
            <Link to="/challans" className="kpi-link">
              View Sales Challans <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Low Stock Watchlist */}
        <div className="glass-card panel-card">
          <div className="panel-header">
            <h3>
              <AlertTriangle className="text-warn" size={18} /> Low Stock Watchlist
            </h3>
            <span className="badge badge-cancelled">{stats.lowStockCount} items alert</span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="empty-state">
              <p>🎉 All inventory levels are healthy!</p>
            </div>
          ) : (
            <ul className="watchlist-list">
              {lowStockProducts.map((p) => (
                <li key={p.id} className="watchlist-item">
                  <div className="item-info">
                    <h4>{p.name}</h4>
                    <span>SKU: {p.sku} • Location: {p.location}</span>
                  </div>
                  <div className="item-stock">
                    <span className="stock-pill low">
                      {p.currentStock} left
                    </span>
                    <span className="min-alert">Min alert: {p.minStockAlert}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Sales Challans */}
        <div className="glass-card panel-card">
          <div className="panel-header">
            <h3>
              <FileText className="text-accent" size={18} /> Recent Sales Challans
            </h3>
            <Link to="/challans" className="panel-header-link">
              View All
            </Link>
          </div>

          {recentChallans.length === 0 ? (
            <div className="empty-state">
              <p>No sales challans generated yet.</p>
            </div>
          ) : (
            <ul className="watchlist-list">
              {recentChallans.map((c) => (
                <li key={c.id} className="watchlist-item">
                  <div className="item-info">
                    <h4>{c.challanNumber}</h4>
                    <span>
                      Customer: {c.customer.name} • {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="item-status">
                    <span className={`badge badge-${c.status.toLowerCase()}`}>
                      {c.status}
                    </span>
                    <span className="challan-amount">{formatCurrency(c.totalAmount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
