import React from 'react';
import { Globe } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';

export const AdminSettingsPage: React.FC = () => {
  return (
    <AdminLayout
      title="Configurações Globais da Plataforma"
      subtitle="Parâmetros de ambiente, gateways, CORS e políticas de execução da LPS"
      breadcrumbs={[{ label: 'Configurações' }]}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Ambiente & Roteamento</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
              LOCAL_DEV
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
              <span className="font-semibold text-slate-700">API Gateway Base URL:</span>
              <div className="font-mono text-slate-900">http://localhost:8000</div>
              <p className="text-[11px] text-slate-500">Roteamento unificado com proxy reverso e CORS ativo</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
              <span className="font-semibold text-slate-700">Frontend Web Host:</span>
              <div className="font-mono text-slate-900">http://localhost:5173</div>
              <p className="text-[11px] text-slate-500">Vite + React 18 + TailwindCSS + Tipografia Inter</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
              <span className="font-semibold text-slate-700">SGBD & Concorrência:</span>
              <div className="font-mono text-slate-900">SQLite 3 com WAL (Write-Ahead Logging)</div>
              <p className="text-[11px] text-slate-500">Isolamento físico por microsserviço sem cross-database lock</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
              <span className="font-semibold text-slate-700">Orquestração Transacional:</span>
              <div className="font-mono text-slate-900">Saga Coreografada com Compensações</div>
              <p className="text-[11px] text-slate-500">Fluxo resiliente de reserva de estoque e pagamento</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
