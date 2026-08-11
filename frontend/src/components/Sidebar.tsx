import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Role check helper
  const hasAccess = (roles: string[]) => {
    return roles.includes(user.role);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'SALES':
        return 'Sales Operations';
      case 'WAREHOUSE':
        return 'Warehouse & Logistics';
      case 'ACCOUNTS':
        return 'Finance & Accounts';
      default:
        return role;
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="logo-box">FR</div>
        <div className="brand-text">
          <h2>Fundsroom</h2>
          <span>ERP + CRM Portal</span>
        </div>
      </div>

      {/* User Info Section */}
      <div className="sidebar-profile">
        <div className="profile-avatar">
          <UserIcon size={20} />
        </div>
        <div className="profile-details">
          <h4>{user.name}</h4>
          <span className={`badge badge-${user.role.toLowerCase()}`}>
            {getRoleLabel(user.role)}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              end
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          </li>

          {hasAccess(['ADMIN', 'SALES', 'ACCOUNTS']) && (
            <li>
              <NavLink
                to="/customers"
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <Users size={20} />
                <span>Customer CRM</span>
              </NavLink>
            </li>
          )}

          <li>
            <NavLink
              to="/inventory"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Package size={20} />
              <span>Product Inventory</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/challans"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <FileText size={20} />
              <span>Sales Challans</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Logout Footer */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
