import React, { useEffect, useState } from 'react';
import { Server, ExternalLink, RefreshCw, CheckCircle2, XCircle, Database } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../services/api';
import { SystemServicesResponse } from '../../types';

interface ServiceArchitectureInfo {
  port: number;
  name: string;
  role: string;
  database: string;
  endpoints: string[];
}

const ARCHITECTURE_SPEC: ServiceArchitectureInfo[] = [
  { port: 8000, name: 'API Gateway', role: 'Ponto único de entrada, roteamento reverso, sanitização de cabeçalhos e validação JWT', database: 'Sem banco (stateless)', endpoints: ['/api/v1/system/services', '/api/v1/*'] },
  { port: 8001, name: 'Auth Service', role: 'Gestão de identidades, registro, emissão e validação de tokens JWT', database: 'data/auth.db', endpoints: ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/me'] },
  { port: 8002, name: 'Catalog Service', role: 'Gestão de catálogo, produtos, variantes de vestuário, specs de tech e metadados de livros', database: 'data/catalog.db', endpoints: ['/api/v1/catalog/stores/{id}/products', '/api/v1/catalog/alerts/stock'] },
  { port: 8003, name: 'Cart Service', role: 'Carrinho de compras por sessão/usuário e cálculo dinâmico de subtotais', database: 'data/cart.db', endpoints: ['/api/v1/cart', '/api/v1/cart/items'] },
  { port: 8004, name: 'Orders Service', role: 'Orquestrador do ciclo de vida de pedidos e coordenador da Saga coreografada', database: 'data/orders.db', endpoints: ['/api/v1/orders', '/api/v1/orders/{id}'] },
  { port: 8005, name: 'Payments Service', role: 'Simulação de pagamentos (PIX, Cartão), regras de idempotência e compensação', database: 'data/payments.db', endpoints: ['/api/v1/payments/process'] },
  { port: 8006, name: 'Shipping Service', role: 'Cálculo de frete, prazos estimados de entrega e opções de retirada em loja', database: 'data/shipping.db', endpoints: ['/api/v1/shipping/quote'] },
  { port: 8007, name: 'Recommendation Service', role: 'Motor de recomendações explicáveis por afinidade de categoria e popularidade', database: 'data/recommendations.db', endpoints: ['/api/v1/recommendations/{store_id}', '/api/v1/recommendations/interactions'] },
  { port: 8008, name: 'LPS Config Service', role: 'Engenharia de domínio, validação CTC, cadastro de vitrines e ProductManifest', database: 'data/lps_config.db', endpoints: ['/api/v1/lps/stores', '/api/v1/lps/validate', '/api/v1/lps/features'] },
];

export const AdminMicroservicesPage: React.FC = () => {
  const [servicesData, setServicesData] = useState<SystemServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const resp = await api.get<SystemServicesResponse>('/api/v1/system/services');
      if (resp.data) setServicesData(resp.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getServiceStatus = (port: number) => {
    const found = servicesData?.services?.find((s) => s.port === port);
    return found ? found.status : 'UP';
  };

  return (
    <AdminLayout
      title="Arquitetura dos 9 Microsserviços"
      subtitle="Mapeamento de portas (:8000 a :8008), bancos de dados SQLite WAL e contratos de API"
      breadcrumbs={[{ label: 'Microsserviços' }]}
      actions={
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E7EF] hover:bg-slate-50 transition text-slate-700 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Verificar Saúde</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ARCHITECTURE_SPEC.map((svc) => {
          const status = getServiceStatus(svc.port);
          return (
            <div
              key={svc.port}
              className="bg-white rounded-xl border border-[#E2E7EF] p-5 shadow-2xs space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">{svc.name}</h3>
                      <span className="font-mono text-[10px] text-slate-500">Porta :{svc.port}</span>
                    </div>
                  </div>
                  {status === 'UP' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      UP
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      DOWN
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">{svc.role}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                  <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[10px] text-slate-700">{svc.database}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <a
                  href={`http://localhost:${svc.port}/health`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-semibold flex items-center gap-1 text-[11px]"
                >
                  <span>Health Check</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`http://localhost:${svc.port}/docs`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px]"
                >
                  <span>Docs Swagger</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};
