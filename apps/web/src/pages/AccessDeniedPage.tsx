import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Store, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { applyStoreTheme } from '../services/theme';

export const AccessDeniedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    applyStoreTheme('neutral');
  }, []);

  const state = location.state as { from?: string; userRole?: string; reason?: string } | undefined;
  const attemptedPath = state?.from || 'Área restrita';

  const handleLogoutAndSwitch = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
            VF
          </div>
          <span className="font-extrabold text-lg text-slate-900 tracking-tight">VitrineFlex</span>
        </Link>

        {user && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogoutAndSwitch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Sair da Conta</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-2xs font-mono font-bold uppercase tracking-widest text-rose-600 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200">
              403 • Acesso Não Autorizado
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Acesso Negado a esta Área
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Sua conta autenticada não possui permissão para acessar o recurso solicitado (<code className="font-mono text-slate-700">{attemptedPath}</code>).
            </p>
          </div>

          {user && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Usuário conectado:</span>
                <span className="font-bold text-slate-900">{user.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Papel atual (RBAC):</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  user.role === 'LPS_ADMIN'
                    ? 'bg-purple-100 text-purple-800'
                    : user.role === 'STORE_ADMIN'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-200 text-slate-800'
                }`}>
                  {user.role}
                </span>
              </div>
              {user.role === 'STORE_ADMIN' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Loja atribuída:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {user.store_id || 'Nenhuma loja associada'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              <Home className="w-4 h-4" />
              <span>Página Inicial</span>
            </Link>

            {user?.role === 'STORE_ADMIN' && (
              <Link
                to="/gestao-loja/estoque"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
              >
                <Store className="w-4 h-4" />
                <span>Gestão da Minha Loja</span>
              </Link>
            )}

            <button
              onClick={handleLogoutAndSwitch}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Entrar com Outra Conta</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        VitrineFlex LPS — Controle de Acesso Baseado em Papéis (RBAC)
      </footer>
    </div>
  );
};
