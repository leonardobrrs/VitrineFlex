import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  User as UserIcon,
  LogOut,
  ShoppingCart,
  Package,
} from 'lucide-react';

export const StoreHeader: React.FC = () => {
  const { manifest } = useStore();
  const { user, logout } = useAuth();
  const { cart, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const primaryColor = manifest?.theme?.primary_color || '#1e40af';
  const storeName = manifest?.store_name || (manifest as any)?.store?.name || 'VitrineFlex';
  const storeSlug = manifest?.store_slug || (manifest as any)?.store?.slug || 'vitrine-moda';

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo & Store Selector */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md transition-transform group-hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                VF
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-slate-700 transition">
                {storeName}
              </span>
            </Link>

            {/* Quick Switcher across the 3 Stores */}
            <div className="hidden lg:flex items-center space-x-1 border-l border-slate-200 pl-4 text-xs font-medium text-slate-500">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 mr-1">Vitrines:</span>
              <Link
                to="/loja/vitrine-moda"
                className={`px-2.5 py-1 rounded-md transition ${
                  storeSlug === 'vitrine-moda'
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Moda
              </Link>
              <Link
                to="/loja/vitrine-tech"
                className={`px-2.5 py-1 rounded-md transition ${
                  storeSlug === 'vitrine-tech'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Tecnologia
              </Link>
              <Link
                to="/loja/vitrine-books"
                className={`px-2.5 py-1 rounded-md transition ${
                  storeSlug === 'vitrine-books'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Livros
              </Link>
            </div>
          </div>

          {/* Navigation & Consumer Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <nav className="hidden md:flex items-center space-x-1 text-sm font-semibold text-slate-600 mr-2">
              <Link
                to="/"
                className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition"
              >
                Início
              </Link>
              <Link
                to={`/loja/${storeSlug}`}
                className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition"
              >
                Catálogo
              </Link>
              {user && (
                <Link
                  to={`/loja/${storeSlug}/pedidos`}
                  className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Meus Pedidos</span>
                </Link>
              )}
            </nav>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-700 hover:text-slate-900 transition rounded-xl hover:bg-slate-100 flex items-center gap-2 border border-slate-200/80 shadow-sm"
              aria-label="Abrir carrinho de compras"
              title="Ver meu carrinho"
            >
              <ShoppingCart className="w-5 h-5 text-slate-700" />
              <span className="hidden sm:inline text-xs font-bold text-slate-800">
                Carrinho
              </span>
              {(cart?.total_items || 0) > 0 && (
                <span
                  className="w-5 h-5 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {cart?.total_items}
                </span>
              )}
            </button>

            {/* User Account */}
            {user ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/perfil"
                  className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition bg-slate-100 hover:bg-slate-200/80 px-3 py-2 rounded-xl"
                  title="Meu Perfil"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span className="max-w-[100px] truncate">{user.name}</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  title="Sair da conta"
                  className="p-2 text-slate-400 hover:text-rose-600 transition rounded-xl hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition px-3 py-2 rounded-xl hover:bg-slate-100"
                >
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="text-xs sm:text-sm font-bold text-white px-3.5 py-2 rounded-xl shadow-sm transition hover:opacity-95 active:scale-95"
                  style={{ backgroundColor: primaryColor }}
                >
                  Cadastrar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
