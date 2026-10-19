import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { AssetsPage } from '../pages/AssetsPage';
import { UsersPage } from '../pages/UsersPage';
import { DepartmentsPage } from '../pages/DepartmentsPage';
import { AssetTypesPage } from '../pages/AssetTypesPage';
import { LocationsPage } from '../pages/LocationsPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RoleGuard } from '../components/auth/RoleGuard';
import { ROLES } from '../permissions/permissions';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/inventory" replace />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: 'assets',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CUSTODIAN]}>
            <AssetsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'asset-items',
        element: <Navigate to="/assets" replace />,
      },
      {
        path: 'users',
        element: (
          <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
            <UsersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'departments',
        element: <DepartmentsPage />,
      },
      {
        path: 'asset-types',
        element: <AssetTypesPage />,
      },
      {
        path: 'locations',
        element: <LocationsPage />,
      },
      {
        path: 'unauthorized',
        element: <UnauthorizedPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
