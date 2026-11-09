import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { manifest } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const primaryColor = manifest?.theme_colors?.primary || manifest?.theme?.primary_color || '#1e40af';

  const from = (location.state as any)?.from || '/perfil';
  const openStockAlert = (location.state as any)?.openStockAlert;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true, state: { openStockAlert } });
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <StoreHeader />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white mx-auto mb-3 shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              <LogIn className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Entrar na Conta</h1>
            <p className="text-xs text-slate-500 mt-1">Acesse seus pedidos, favoritos e recomendações exclusivas</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm shadow-sm transition hover:opacity-95 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Entrando...' : 'Acessar Conta'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            Ainda não possui conta?{' '}
            <Link to="/register" state={{ from, openStockAlert }} className="font-semibold text-blue-600 hover:underline">
              Cadastre-se gratuitamente
            </Link>
          </p>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
};
