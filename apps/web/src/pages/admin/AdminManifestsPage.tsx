import React, { useEffect, useState } from 'react';
import { Copy, Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../services/api';
import { Store, StoreManifest } from '../../types';

export const AdminManifestsPage: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string>('vitrine-moda');
  const [manifest, setManifest] = useState<StoreManifest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    api.get<Store[]>('/api/v1/lps/stores')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setStores(res.data);
          setSelectedStoreSlug(res.data[0].slug);
        }
      })
      .catch(() => {});
  }, []);

  const fetchManifest = async (slug: string) => {
    setLoading(true);
    try {
      const resp = await api.get<StoreManifest>(`/api/v1/lps/stores/${slug}/manifest`);
      if (resp.data) {
        setManifest(resp.data);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStoreSlug) {
      fetchManifest(selectedStoreSlug);
    }
  }, [selectedStoreSlug]);

  const copyJson = () => {
    if (!manifest) return;
    navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminLayout
      title="Gestão de ProductManifests"
      subtitle="Inspeção dos contratos canônicos de variabilidade gerados pelo LPS Config Service"
      breadcrumbs={[{ label: 'Manifestos' }]}
      actions={
        <button
          onClick={() => fetchManifest(selectedStoreSlug)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E7EF] hover:bg-slate-50 transition text-slate-700 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recarregar</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Store Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E7EF] pb-3">
          <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wider">
            Vitrine:
          </span>
          {stores.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStoreSlug(st.slug)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                selectedStoreSlug === st.slug
                  ? 'bg-[#172334] text-white shadow-xs'
                  : 'bg-white border border-[#E2E7EF] text-slate-700 hover:bg-slate-50'
              }`}
            >
              {st.name} ({st.segment})
            </button>
          ))}
        </div>

        {manifest && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manifest Metadata Card */}
            <div className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-2xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Metadados do Manifesto</span>
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  v{manifest.version || 1}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Store ID:</span>
                  <div className="font-mono text-slate-800 break-all">{manifest.store_id}</div>
                </div>
                <div>
                  <span className="text-slate-400">Store Name:</span>
                  <div className="font-semibold text-slate-800">{manifest.store_name}</div>
                </div>
                <div>
                  <span className="text-slate-400">Slug:</span>
                  <div className="font-mono text-slate-800">/loja/{manifest.store_slug}</div>
                </div>
                <div>
                  <span className="text-slate-400">Segmento LPS:</span>
                  <div className="font-bold text-blue-600">{manifest.segment}</div>
                </div>
              </div>

              {/* Theme Colors */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Cores Declaradas
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded border border-slate-200"
                      style={{ backgroundColor: manifest.theme?.primary_color || '#1e40af' }}
                    />
                    <span className="font-mono text-[11px] text-slate-600">
                      {manifest.theme?.primary_color || '#1e40af'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded border border-slate-200"
                      style={{ backgroundColor: manifest.theme?.secondary_color || '#0f172a' }}
                    />
                    <span className="font-mono text-[11px] text-slate-600">
                      {manifest.theme?.secondary_color || '#0f172a'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Features Count */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Features Ativas:</span>
                  <span className="font-bold text-slate-900">
                    {manifest.features ? Object.values(manifest.features).filter(Boolean).length : 0}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pt-1">
                  {manifest.features &&
                    Object.entries(manifest.features)
                      .filter(([_, enabled]) => Boolean(enabled))
                      .map(([featureKey]) => (
                        <span
                          key={featureKey}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {featureKey}
                        </span>
                      ))}
                </div>
              </div>
            </div>

            {/* Raw JSON Preview */}
            <div className="lg:col-span-2 bg-[#172334] rounded-xl border border-[#24364B] shadow-2xs overflow-hidden flex flex-col">
              <div className="p-3 bg-[#131E2D] border-b border-[#24364B] flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px]">ProductManifest.json</span>
                <button
                  onClick={copyJson}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#24364B] hover:bg-slate-700 text-slate-200 text-[11px] transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                </button>
              </div>
              <div className="flex-1 p-4 overflow-x-auto text-[11px] font-mono text-emerald-300 leading-relaxed max-h-[500px]">
                <pre>{JSON.stringify(manifest, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
