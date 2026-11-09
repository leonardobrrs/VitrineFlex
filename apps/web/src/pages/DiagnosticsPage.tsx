import React, { useEffect, useState } from 'react';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { SystemServicesResponse, ServiceHealth } from '../types';
import { Activity, RefreshCw, CheckCircle2, XCircle, Clock, Server, ShieldCheck } from 'lucide-react';

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
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>UP (Operacional)</span>
          </span>
        );
      case 'DOWN':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>DOWN (Falha)</span>
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>NOT_STARTED (Fase Futura)</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <StoreHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <Activity className="w-4 h-4" />
              <span>Diagnóstico de Portas & Governança (PB-27)</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">Painel de Saúde dos 9 Microsserviços</h1>
            <p className="text-sm text-slate-500 mt-1">
              Exibição dos 9 microsserviços com portas locais dedicadas (:8000 a :8008), monitorando a saúde em tempo real e a integridade da LPS.
            </p>
          </div>

          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Consultando...' : 'Atualizar Diagnóstico'}</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center space-x-3">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold">Falha ao obter status dos serviços</p>
              <p className="text-xs">{error} — Verifique se o API Gateway (:8000) está em execução.</p>
            </div>
          </div>
        )}

        {/* Services Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Microsserviço
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Porta Local
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Sprint Planejada
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status Operacional
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Latência / Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data?.services?.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${svc.status === 'UP' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Server className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{svc.name}</div>
                          <div className="text-xs font-mono text-slate-400">{svc.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-800">
                        :{svc.port}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Sprint {svc.planned_sprint}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(svc.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {svc.latency_ms !== null ? (
                        <span className="font-mono text-emerald-600 font-semibold">{svc.latency_ms} ms</span>
                      ) : (
                        <span className="text-slate-400 italic">{svc.message}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sprint 1 Verification Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-900">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Critério de Aceitação da Sprint 1 (PB-27):</h3>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Na Sprint 1, Gateway (:8000) e Auth (:8001) respondem com status <strong>UP</strong>, enquanto os serviços planejados para as Sprints 2 a 4 apresentam status <strong>NOT_STARTED</strong>. Ao término da Sprint 4, todos os 9 serviços estarão com status <strong>UP</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
};
