import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ClientesPage } from '../pages/ClientesPage';
import { MotoresPage } from '../pages/MotoresPage';
import { OrdenesPage } from '../pages/OrdenesPage';
import { OrdenDetailPage } from '../pages/OrdenDetailPage';
import { UsersPage } from '../pages/UsersPage';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Ruta Pública de Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas Protegidas del Taller */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <ClientesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/motores"
        element={
          <ProtectedRoute>
            <MotoresPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ordenes"
        element={
          <ProtectedRoute>
            <OrdenesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ordenes/:id"
        element={
          <ProtectedRoute>
            <OrdenDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Ruta Exclusiva de Administradores */}
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute requireAdmin={true}>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      {/* Redirección por defecto */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
