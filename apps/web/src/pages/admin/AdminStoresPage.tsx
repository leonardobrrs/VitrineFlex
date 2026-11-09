import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store as StoreIcon,
  Archive,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  Clock,
  ShieldCheck,
  X,
  History,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../services/api';

interface AdminStore {
  id: string;
  slug: string;
  name: string;
  segment: string;
  status: 'ACTIVE' | 'ARCHIVED';
  created_at: string;
  archived_at?: string | null;
  archived_by?: string | null;
  active_features_count: number;
}

interface StoreAuditLog {
  id: string;
  store_id: string;
  action: string;
  actor_id: string;
  details: string;
  created_at: string;
}

export const AdminStoresPage: React.FC = () => {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Archive modal state
  const [storeToArchive, setStoreToArchive] = useState<AdminStore | null>(null);
  const [storeToRestore, setStoreToRestore] = useState<AdminStore | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<StoreAuditLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get<AdminStore[]>('/api/v1/lps/admin/stores');
      setStores(resp.data);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar lista de lojas administrativas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const resp = await api.get<StoreAuditLog[]>('/api/v1/lps/admin/store-audit-logs');
      setAuditLogs(resp.data);
    } catch (err) {
      console.error('Falha ao carregar auditoria de lojas:', err);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchAuditLogs();
  }, []);

  const handleArchive = async () => {
    if (!storeToArchive) return;
    setProcessingId(storeToArchive.id);
    setError(null);
    try {
      await api.post(`/api/v1/lps/admin/stores/${storeToArchive.id}/archive`);
      setSuccessMsg(`Loja "${storeToArchive.name}" foi arquivada com sucesso. Integridade de pedidos e histórico preservados.`);
      setStoreToArchive(null);
      await fetchStores();
      await fetchAuditLogs();
    } catch (err: any) {
      setError(err?.message || 'Falha ao arquivar a loja.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRestore = async () => {
    if (!storeToRestore) return;
    setProcessingId(storeToRestore.id);
    setError(null);
    try {
      await api.post(`/api/v1/lps/admin/stores/${storeToRestore.id}/restore`);
      setSuccessMsg(`Loja "${storeToRestore.name}" foi reativada com sucesso.`);
      setStoreToRestore(null);
      await fetchStores();
      await fetchAuditLogs();
    } catch (err: any) {
      setError(err?.message || 'Falha ao reativar a loja.');
    } finally {
      setProcessingId(null);
    }
  };

  const activeStores = stores.filter((s) => s.status === 'ACTIVE');
  const archivedStores = stores.filter((s) => s.status === 'ARCHIVED');

  return (
    <AdminLayout
      title="Gerenciamento de Lojas Derivadas"
      subtitle="Ciclo de vida, status operacional e exclusão lógica de instâncias da Linha de Produto de Software"
      breadcrumbs={[{ label: 'Lojas' }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E7EF] hover:bg-slate-50 transition text-slate-700 shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>{showLogs ? 'Ocultar Auditoria' : 'Auditoria'}</span>
          </button>
          <button
            onClick={fetchStores}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E7EF] hover:bg-slate-50 transition text-slate-700 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total de Instâncias
              </span>
              <StoreIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{stores.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Lojas configuradas na LPS</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Lojas Ativas
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">{activeStores.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Visíveis publicamente e processando pedidos</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Lojas Arquivadas
              </span>
              <Archive className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-2">{archivedStores.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Exclusão lógica com histórico protegido</p>
          </div>
        </div>

        {/* Stores Table */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E7EF] flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-blue-600" />
              <span>Instâncias da Plataforma</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {stores.length} {stores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-[#E2E7EF]">
                <tr>
                  <th className="py-3 px-4">Loja / Identificador</th>
                  <th className="py-3 px-4">Segmento</th>
                  <th className="py-3 px-4">Features Ativas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Criada em</th>
                  <th className="py-3 px-4 text-right">Ações de Ciclo de Vida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((store) => {
                  const isActive = store.status === 'ACTIVE';
                  return (
                    <tr key={store.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{store.name}</div>
                        <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{store.slug}</span>
                          <span className="text-slate-300">•</span>
                          <span>ID: {store.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          store.segment === 'FASHION'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : store.segment === 'TECH'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : store.segment === 'BOOKS'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {store.segment}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-700 font-semibold">
                          {store.active_features_count} ativas
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Arquivada
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(store.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {store.archived_at && (
                          <div className="text-[10px] text-amber-700 mt-0.5">
                            Arquivada em {new Date(store.archived_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to="/admin/manifestos"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Ver Manifesto Canônico"
                          >
                            <FileCode2 className="w-4 h-4" />
                          </Link>

                          {isActive ? (
                            <button
                              onClick={() => setStoreToArchive(store)}
                              disabled={processingId === store.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition"
                              title="Arquivar loja (Exclusão lógica)"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>Arquivar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setStoreToRestore(store)}
                              disabled={processingId === store.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition"
                              title="Reativar loja"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reativar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Panel */}
        {showLogs && (
          <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Trilha de Auditoria do Ciclo de Vida de Lojas</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {auditLogs.length} eventos registrados
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum evento registrado até o momento.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg text-xs flex items-center justify-between border border-slate-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          log.action === 'ARCHIVE_STORE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-800">Loja: {log.store_id}</span>
                        <span className="text-slate-400 text-[11px]">por {log.actor_id}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">{log.details}</div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal: Archive Store */}
        {storeToArchive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 flex-shrink-0">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Arquivar Loja "{storeToArchive.name}"?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Exclusão lógica da vitrine ({storeToArchive.slug})
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Impacto Operacional & Preservação Histórica:</span>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>A loja não será mais exibida no portal principal (<code className="font-mono text-slate-900">/</code>).</li>
                  <li>O acesso público ao catálogo, carrinho e checkout será bloqueado com código <code className="font-mono font-bold text-slate-900">410 STORE_ARCHIVED</code>.</li>
                  <li><strong>Histórico mantido:</strong> Todos os pedidos, registros financeiros, análises e integridade do banco de dados permanecem intactos.</li>
                  <li>Você poderá reativar esta loja a qualquer momento com um único clique.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStoreToArchive(null)}
                  disabled={processingId !== null}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={processingId !== null}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
                >
                  {processingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  <span>Confirmar Arquivamento</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal: Restore Store */}
        {storeToRestore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 flex-shrink-0">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reativar Loja "{storeToRestore.name}"?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Restauração da vitrine ({storeToRestore.slug})
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Ao reativar, a loja voltará imediatamente a estar disponível na vitrine pública da LPS,
                e os usuários poderão novamente navegar pelo catálogo e realizar compras normalmente.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStoreToRestore(null)}
                  disabled={processingId !== null}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={processingId !== null}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
                >
                  {processingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Confirmar Reativação</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
