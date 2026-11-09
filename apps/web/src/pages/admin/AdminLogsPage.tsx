import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../services/api';
import { SystemServicesResponse } from '../../types';

export const AdminLogsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [logEntries, setLogEntries] = useState<{ timestamp: string; level: string; service: string; message: string }[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await api.get<SystemServicesResponse>('/api/v1/system/services');
      if (resp.data) {
        const now = new Date();
        const entries = (resp.data.services || []).map((s) => ({
          timestamp: now.toLocaleTimeString('pt-BR'),
          level: s.status === 'UP' ? 'INFO' : 'ERROR',
          service: s.name,
          message: s.status === 'UP'
            ? `Health check bem-sucedido na porta :${s.port} (${s.latency_ms?.toFixed(1) || 0} ms)`
            : `Serviço inacessível ou falha de resposta na porta :${s.port}`,
        }));
        setLogEntries(entries);
      }
    } catch (err: any) {
      setLogEntries([{
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        level: 'ERROR',
        service: 'api-gateway',
        message: `Falha ao consultar health dos serviços: ${err.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <AdminLayout
      title="Logs & Diagnóstico em Tempo Real"
      subtitle="Feed de eventos operacionais e monitoramento de integridade do API Gateway"
      breadcrumbs={[{ label: 'Logs & Auditoria' }]}
      actions={
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E7EF] hover:bg-slate-50 transition text-slate-700 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Logs</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Terminal Box */}
        <div className="bg-[#172334] rounded-xl border border-[#24364B] shadow-2xs overflow-hidden flex flex-col font-mono text-xs">
          <div className="p-3 bg-[#131E2D] border-b border-[#24364B] flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="ml-2 text-[11px] font-semibold text-slate-300">vitrineflex-gateway.log</span>
            </div>
            <span className="text-[10px] text-slate-500">Live Diagnostics</span>
          </div>

          <div className="p-4 space-y-2 text-slate-300 max-h-[500px] overflow-y-auto">
            {logEntries.length > 0 ? (
              logEntries.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 text-[11px] leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`font-bold shrink-0 ${
                      log.level === 'INFO'
                        ? 'text-emerald-400'
                        : log.level === 'WARN'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-blue-300 shrink-0">[{log.service}]</span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic py-4">Aguardando eventos do sistema...</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
