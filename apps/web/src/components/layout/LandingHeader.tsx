import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Layers,
  User as UserIcon,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export const LandingHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo VitrineFlex LPS */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              VF
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                VitrineFlex
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mt-0.5">
                Linha de Produto de Software
              </span>
            </div>
          </Link>

          {/* Navigation to Admin Platform */}
          <nav className="hidden md:flex items-center space-x-3 text-xs font-semibold text-slate-700">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Painel Admin</span>
            </Link>
          </nav>

          {/* User Auth Section */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/perfil"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.name.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Sair da conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 transition"
                >
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  className="text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-lg shadow-sm transition"
                >
                  Criar Conta
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <div>
            <Link
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-100 text-slate-900 font-bold text-xs"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Painel Administrativo da LPS</span>
            </Link>
          </div>

          <div className="border-t border-slate-100 pt-3">
            {user ? (
              <div className="flex items-center justify-between px-2">
                <Link
                  to="/perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-slate-800"
                >
                  Perfil ({user.name})
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-rose-600 font-semibold"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
                >
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                >
                  Criar Conta
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
