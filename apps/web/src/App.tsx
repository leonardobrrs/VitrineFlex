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
                <Route path="/pedidos" element={<OrdersPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/cadastro" element={<RegisterPage />} />
                <Route path="/perfil" element={<ProfilePage />} />

                {/* Admin Platform Routes */}
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/lojas" element={<AdminStoresPage />} />
                <Route path="/admin/configurador" element={<ConfiguratorPage />} />
                <Route path="/admin/features" element={<AdminFeaturesPage />} />
                <Route path="/admin/manifestos" element={<AdminManifestsPage />} />
                <Route path="/admin/regras" element={<AdminVariabilityRulesPage />} />
                <Route path="/admin/diagnostico" element={<DiagnosticsPage />} />
                <Route path="/admin/microsservicos" element={<AdminMicroservicesPage />} />
                <Route path="/admin/bancos" element={<AdminDatabasesPage />} />
                <Route path="/admin/logs" element={<AdminLogsPage />} />
                <Route path="/admin/usuarios" element={<AdminUsersPage />} />
                <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />

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
