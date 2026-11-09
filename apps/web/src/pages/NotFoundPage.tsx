import React from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { AlertTriangle, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <StoreHeader />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Página Não Encontrada</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            A rota solicitada não existe nesta vitrine ou foi desativada pelas configurações da LPS.
          </p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
};
