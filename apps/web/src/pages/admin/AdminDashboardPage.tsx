import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Sparkles,
  Server,
  Activity,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sliders,
  FileCode2,
  GitBranch,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../services/api';
import { SystemServicesResponse, Store as StoreType } from '../../types';

interface FeatureCatalogItem {
  id: string;
  name: string;
  category: string;
  is_core?: boolean;
}

export const AdminDashboardPage: React.FC = () => {
  const [servicesData, setServicesData] = useState<SystemServicesResponse | null>(null);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [features, setFeatures] = useState<FeatureCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch system services health
      const [servicesResp, storesResp, featuresResp] = await Promise.allSettled([
        api.get<SystemServicesResponse>('/api/v1/system/services'),
        api.get<StoreType[]>('/api/v1/lps/stores'),
        api.get<{ features: FeatureCatalogItem[] }>('/api/v1/lps/features'),
      ]);

      if (servicesResp.status === 'fulfilled' && servicesResp.value.data) {
        setServicesData(servicesResp.value.data);
      }
      if (storesResp.status === 'fulfilled' && storesResp.value.data) {
        setStores(storesResp.value.data);
      }
      if (featuresResp.status === 'fulfilled' && featuresResp.value.data) {
        // features can be an array directly or inside { features: [] }
        const feats = Array.isArray(featuresResp.value.data)
          ? featuresResp.value.data
          : featuresResp.value.data.features || [];
        setFeatures(feats);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar métricas administrativas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalServices = servicesData?.services?.length || 9;
  const onlineServices = servicesData?.services?.filter((s) => s.status === 'UP').length || 0;
  const totalStores = stores.length;
  const totalFeatures = features.length > 0 ? features.length : 23;

  return (
    <AdminLayout
      title="Painel de Controle LPS"
      subtitle="Monitoramento em tempo real da arquitetura de microsserviços e linha de produtos"
      breadcrumbs={[{ label: 'Dashboard' }]}
      actions={
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E7EF] hover:bg-slate-50 transition text-slate-700 shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Atualizar</span>
        </button>
      }
    >
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong>Aviso de Conexão:</strong> {error}
          </div>
        </div>
      )}

      {/* 4 Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Vitrines Derivadas */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vitrines Ativas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#182230]">
              {loading ? '...' : totalStores}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Moda, Tech & Books configuradas</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              100% instanciadas
            </span>
            <Link to="/admin/configurador" className="text-blue-600 hover:underline font-medium">
              Gerenciar
            </Link>
          </div>
        </div>

        {/* KPI 2: Features no Modelo */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Features LPS</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#182230]">
              {loading ? '...' : totalFeatures}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">6 Core + 3 Transv. + 14 Específicas</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">Modelo Canônico v2</span>
            <Link to="/admin/features" className="text-blue-600 hover:underline font-medium">
              Ver Catálogo
            </Link>
          </div>
        </div>

        {/* KPI 3: Microsserviços Online */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Microsserviços</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#182230]">
              {loading ? '...' : `${onlineServices} / ${totalServices}`}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Portas dedicadas :8000 a :8008</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className={onlineServices === totalServices ? 'text-emerald-700 font-semibold flex items-center gap-1' : 'text-amber-700 font-semibold'}>
              <CheckCircle2 className="w-3 h-3" />
              {onlineServices === totalServices ? 'Todos Operacionais' : 'Parcial'}
            </span>
            <Link to="/admin/microsservicos" className="text-blue-600 hover:underline font-medium">
              Detalhes
            </Link>
          </div>
        </div>

        {/* KPI 4: Portas & Protocolo */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Governança LPS</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#182230]">REST / JSON</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Saga Coreografada + JWT</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">SQLite WAL Isolado</span>
            <Link to="/admin/bancos" className="text-blue-600 hover:underline font-medium">
              Ver Bancos
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Health Table + Active Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Health dos 9 Microsserviços */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E7EF] shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E7EF] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#182230] flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Saúde dos 9 Microsserviços</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Monitoramento por porta individual e tempo de resposta
              </p>
            </div>
            <Link
              to="/admin/diagnostico"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Ver Diagnóstico</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#E2E7EF] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Microsserviço</th>
                  <th className="py-2.5 px-4">Porta</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Latência</th>
                  <th className="py-2.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7EF]">
                {servicesData?.services ? (
                  servicesData.services.map((svc) => (
                    <tr key={svc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{svc.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{svc.id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">:{svc.port}</td>
                      <td className="py-3 px-4">
                        {svc.status === 'UP' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            UP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            DOWN
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {svc.latency_ms !== null && svc.latency_ms !== undefined
                          ? `${svc.latency_ms.toFixed(1)} ms`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      {loading ? 'Consultando saúde dos serviços...' : 'Nenhum serviço registrado.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 3: Vitrines Derivadas Cards */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7EF]">
            <div>
              <h2 className="text-sm font-bold text-[#182230] flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" />
                <span>Vitrines Configuradas</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Instâncias da LPS com manifestos ativos
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {stores.length > 0 ? (
              stores.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-lg border border-[#E2E7EF] hover:border-slate-300 transition-colors bg-slate-50/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{st.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-200 text-slate-700">
                      {st.segment}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Slug: <code className="font-mono text-slate-700">/loja/{st.slug}</code></span>
                    <span className="font-semibold text-slate-700">
                      {st.current_manifest?.features ? Object.values(st.current_manifest.features).filter(Boolean).length : '—'} features
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <Link
                      to={`/loja/${st.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:underline font-semibold flex items-center gap-1 text-[11px]"
                    >
                      <span>Abrir Vitrine</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      to="/admin/configurador"
                      className="text-slate-500 hover:text-slate-800 text-[11px]"
                    >
                      Configurar
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                Nenhuma vitrine retornada pela LPS.
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="pt-2 border-t border-[#E2E7EF] space-y-2">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ações Rápidas
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                to="/admin/configurador"
                className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium flex items-center gap-2 transition"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Configurador</span>
              </Link>
              <Link
                to="/admin/regras"
                className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium flex items-center gap-2 transition"
              >
                <GitBranch className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Regras CTC</span>
              </Link>
              <Link
                to="/admin/manifestos"
                className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium flex items-center gap-2 transition"
              >
                <FileCode2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Manifestos</span>
              </Link>
              <Link
                to="/admin/diagnostico"
                className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium flex items-center gap-2 transition"
              >
                <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Diagnóstico</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
