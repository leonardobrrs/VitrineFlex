import React from 'react';
import { Database, ShieldCheck, Lock } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';

interface DatabaseSpec {
  name: string;
  file: string;
  service: string;
  port: number;
  tables: string[];
  mode: string;
  isolation: string;
}

const DATABASES: DatabaseSpec[] = [
  { name: 'Auth Database', file: 'data/auth.db', service: 'Auth Service', port: 8001, tables: ['users', 'user_preferences', 'blacklisted_tokens'], mode: 'WAL (Write-Ahead Logging)', isolation: 'Completo (Apenas Auth Service acessa)' },
  { name: 'Catalog Database', file: 'data/catalog.db', service: 'Catalog Service', port: 8002, tables: ['products', 'variants', 'product_attributes', 'stock_alerts'], mode: 'WAL (Write-Ahead Logging)', isolation: 'Completo (Apenas Catalog Service acessa)' },
  { name: 'Cart Database', file: 'data/cart.db', service: 'Cart Service', port: 8003, tables: ['carts', 'cart_items'], mode: 'WAL (Write-Ahead Logging)', isolation: 'Completo (Apenas Cart Service acessa)' },
  { name: 'Orders Database', file: 'data/orders.db', service: 'Orders Service', port: 8004, tables: ['orders', 'order_items', 'order_status_history', 'saga_states'], mode: 'WAL (Write-Ahead Logging)', isolation: 'Completo (Orquestrador da Saga)' },
  { name: 'Payments Database', file: 'data/payments.db', service: 'Payments Service', port: 8005, tables: ['payments', 'transactions', 'idempotency_keys'], mode: 'WAL (Write-Ahead Logging)', isolation: 'Completo (Idempotência segura)' },
  { name: 'Shipping Database', file: 'data/shipping.db', service: 'Shipping Service', port: 8006, tables: ['shipping_quotes', 'fulfillment_options'], mode: 'WAL (Write-Ahead Logging)', isolation: 'Completo (Apenas Shipping Service acessa)' },
  { name: 'Recommendations Database', file: 'data/recommendations.db', service: 'Recommendation Service', port: 8007, tables: ['user_interactions', 'product_scores'], mode: 'WAL (Write-Ahead Logging)', isolation: 'Completo (Consultas agregadas indexadas)' },
  { name: 'LPS Config Database', file: 'data/lps_config.db', service: 'LPS Config Service', port: 8008, tables: ['stores', 'product_manifests', 'features_catalog'], mode: 'WAL (Write-Ahead Logging)', isolation: 'Completo (Fonte canônica dos manifestos)' },
];

export const AdminDatabasesPage: React.FC = () => {
  return (
    <AdminLayout
      title="Bancos de Dados Isolados (SQLite WAL)"
      subtitle="Padrão Database-per-Service com isolamento físico de arquivos e modo WAL ativo"
      breadcrumbs={[{ label: 'Bancos de Dados' }]}
    >
      <div className="space-y-6">
        {/* Architecture Note */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-[#182230]">
              Padrão Database-per-Service (Microservices Architecture)
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Nenhum microsserviço acessa diretamente o banco de dados de outro serviço. Toda a comunicação ocorre
            exclusivamente via contratos REST HTTP pelo API Gateway (:8000). A atomicidade transacional entre serviços é
            garantida pelo padrão Saga com ações compensatórias.
          </p>
        </div>

        {/* Database Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DATABASES.map((db) => (
            <div
              key={db.file}
              className="bg-white rounded-xl border border-[#E2E7EF] p-4 shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Database className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    WAL ATIVO
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-xs text-slate-900">{db.name}</h3>
                  <code className="text-[10px] font-mono text-slate-500 block truncate">{db.file}</code>
                </div>

                <div className="text-[11px] text-slate-600">
                  <span className="text-slate-400">Serviço:</span> {db.service} (:{db.port})
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Tabelas Principais
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {db.tables.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{db.isolation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
