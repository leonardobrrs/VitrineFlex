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
                <Route path="/admin/diagnostico" element={<DiagnosticsPage />} />
                <Route path="/admin/configurador" element={<ConfiguratorPage />} />
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
