import React, { useEffect, useState } from 'react';
import { SystemServicesResponse, ServiceHealth } from '../types';
import { RefreshCw, CheckCircle2, XCircle, Clock, Server, ShieldCheck, ExternalLink } from 'lucide-react';
import { AdminLayout } from '../components/admin/AdminLayout';

export const DiagnosticsPage: React.FC = () => {
  const [data, setData] = useState<SystemServicesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/system/services');
      if (!res.ok) {
        throw new Error(`Erro ao obter diagnóstico (${res.status})`);
      }
      const json: SystemServicesResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Falha ao consultar API Gateway');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const renderStatusBadge = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'UP':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>UP (Operacional)</span>
          </span>
        );
      case 'DOWN':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>DOWN (Falha)</span>
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>NOT_STARTED</span>
          </span>
        );
    }
  };

  return (
    <AdminLayout
      title="Diagnóstico de Portas & Saúde dos Serviços"
      subtitle="Exibição dos 9 microsserviços com portas locais dedicadas (:8000 a :8008)"
      breadcrumbs={[{ label: 'Diagnóstico' }]}
      actions={
        <button
          onClick={fetchDiagnostics}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E2E7EF] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Consultando...' : 'Atualizar'}</span>
        </button>
      }
    >
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-3">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="font-bold">Falha ao obter status dos serviços</p>
            <p className="text-[11px]">{error} — Verifique se o API Gateway (:8000) está em execução.</p>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E2E7EF]">
            <thead className="bg-slate-50/80">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Microsserviço
                </th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Porta Local
                </th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Status Operacional
                </th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Latência
                </th>
                <th scope="col" className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Endpoint
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E7EF] bg-white text-xs">
              {data?.services?.map((svc) => (
                <tr key={svc.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${svc.status === 'UP' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{svc.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{svc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-800">
                      :{svc.port}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {renderStatusBadge(svc.status)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                    {svc.latency_ms !== null ? (
                      <span className="font-mono text-emerald-600 font-semibold">{svc.latency_ms.toFixed(1)} ms</span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">{svc.message}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <a
                      href={`http://localhost:${svc.port}/health`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-blue-600 transition"
                      title="Abrir health check"
                    >
                      <ExternalLink className="w-3.5 h-3.5 inline" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture Card */}
      <div className="bg-white border border-[#E2E7EF] rounded-xl p-5 shadow-2xs text-xs text-slate-700 space-y-2">
        <div className="flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="font-bold text-xs text-slate-900">Governança dos 9 Microsserviços e Linha de Produtos:</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cada serviço opera com porta local dedicada e isolamento de banco SQLite WAL, garantindo a independência das transações locais e a integridade da Saga coreografada.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
