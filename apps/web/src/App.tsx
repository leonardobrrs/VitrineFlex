import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CartDrawer } from './components/layout/CartDrawer';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { ProductPage } from './pages/ProductPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { ConfiguratorPage } from './pages/ConfiguratorPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { StoreInventoryPage } from './pages/store-admin/StoreInventoryPage';

// Admin Platform Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminStoresPage } from './pages/admin/AdminStoresPage';
import { AdminFeaturesPage } from './pages/admin/AdminFeaturesPage';
import { AdminManifestsPage } from './pages/admin/AdminManifestsPage';
import { AdminVariabilityRulesPage } from './pages/admin/AdminVariabilityRulesPage';
import { AdminMicroservicesPage } from './pages/admin/AdminMicroservicesPage';
import { AdminDatabasesPage } from './pages/admin/AdminDatabasesPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <CartDrawer />
              <Routes>
                {/* Public Store & Consumer Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/loja/:slug" element={<StorePage />} />
                <Route path="/loja/:slug/produto/:productId" element={<ProductPage />} />
                <Route path="/loja/:slug/checkout" element={<CheckoutPage />} />
                <Route path="/loja/:slug/pedidos" element={<OrdersPage />} />
                <Route path="/pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/cadastro" element={<RegisterPage />} />
                <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/acesso-negado" element={<AccessDeniedPage />} />

                {/* Store Operator (STORE_ADMIN / LPS_ADMIN) Operational Routes */}
                <Route
                  path="/gestao-loja"
                  element={
                    <ProtectedRoute allowedRoles={['STORE_ADMIN', 'LPS_ADMIN']} requireStoreBinding>
                      <StoreInventoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/gestao-loja/estoque"
                  element={
                    <ProtectedRoute allowedRoles={['STORE_ADMIN', 'LPS_ADMIN']} requireStoreBinding>
                      <StoreInventoryPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Platform Routes (LPS_ADMIN only) */}
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
                <Route path="/admin/lojas" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminStoresPage /></ProtectedRoute>} />
                <Route path="/admin/configurador" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><ConfiguratorPage /></ProtectedRoute>} />
                <Route path="/admin/features" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminFeaturesPage /></ProtectedRoute>} />
                <Route path="/admin/manifestos" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminManifestsPage /></ProtectedRoute>} />
                <Route path="/admin/regras" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminVariabilityRulesPage /></ProtectedRoute>} />
                <Route path="/admin/diagnostico" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><DiagnosticsPage /></ProtectedRoute>} />
                <Route path="/admin/microsservicos" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminMicroservicesPage /></ProtectedRoute>} />
                <Route path="/admin/bancos" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminDatabasesPage /></ProtectedRoute>} />
                <Route path="/admin/logs" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminLogsPage /></ProtectedRoute>} />
                <Route path="/admin/usuarios" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
                <Route path="/admin/configuracoes" element={<ProtectedRoute allowedRoles={['LPS_ADMIN']}><AdminSettingsPage /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
};

export default App;
