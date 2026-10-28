import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  LayoutDashboard,
  Building2,
  Cpu,
  ClipboardList,
  Users,
  LogOut,
  Shield,
  User as UserIcon,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Marca / Logo */}
        <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
          <div className="brand-icon">
            <Wrench size={22} color="#0f172a" />
          </div>
          <div className="brand-text">
            <span className="brand-title">MINING MOTORS</span>
            <span className="brand-subtitle">Heavy Equipment Workshop</span>
          </div>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="navbar-links">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/clientes"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Building2 size={18} />
            <span>Clientes</span>
          </NavLink>

          <NavLink
            to="/motores"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Cpu size={18} />
            <span>Motores</span>
          </NavLink>

          <NavLink
            to="/ordenes"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <ClipboardList size={18} />
            <span>Órdenes</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/usuarios"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Usuarios</span>
            </NavLink>
          )}
        </nav>

        {/* Sección de Usuario & Logout */}
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-avatar">
              {isAdmin ? <Shield size={16} /> : <UserIcon size={16} />}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.nombre || 'Usuario'}</span>
              <span className={`user-role-badge ${user?.rol}`}>
                {user?.rol?.toUpperCase()}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn-logout"
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
            <span className="logout-text">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
