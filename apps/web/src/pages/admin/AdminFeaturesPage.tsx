import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../services/api';
import { Store } from '../../types';

interface FeatureMeta {
  key: string;
  label: string;
  description: string;
  category: 'core' | 'transversal' | 'fashion' | 'tech' | 'books';
  required?: boolean;
}

const CANONICAL_FEATURES: FeatureMeta[] = [
  // Núcleo Obrigatório (6)
  { key: 'auth', label: 'Autenticação', description: 'Gestão de usuários, sessões JWT e identidade confiável.', category: 'core', required: true },
  { key: 'catalog', label: 'Catálogo de Produtos', description: 'Navegação por categorias, listagem e detalhe de produtos.', category: 'core', required: true },
  { key: 'cart', label: 'Carrinho de Compras', description: 'Gestão de itens selecionados e cálculo de subtotais.', category: 'core', required: true },
  { key: 'orders', label: 'Gestão de Pedidos', description: 'Orquestração de pedidos, histórico e ciclo de vida.', category: 'core', required: true },
  { key: 'checkout', label: 'Checkout & Pagamento', description: 'Finalização de compras, frete e integração de pagamento.', category: 'core', required: true },
  { key: 'recommendations', label: 'Motor de Recomendações', description: 'Sugestões de produtos por afinidade com heurística explicável.', category: 'core', required: true },

  // Transversais Opcionais (3)
  { key: 'favorites', label: 'Lista de Favoritos', description: 'Marcação persistente de produtos de interesse pelo consumidor.', category: 'transversal' },
  { key: 'recently_viewed', label: 'Vistos Recentemente', description: 'Histórico de produtos navegados na sessão do usuário.', category: 'transversal' },
  { key: 'back_in_stock_alert', label: 'Alerta de Reposição', description: 'Captura interesse em produtos esgotados para notificação.', category: 'transversal' },

  // Extensões de Moda (4)
  { key: 'size_grid', label: 'Grade de Tamanhos', description: 'Seleção dimensional de vestuário e calçados (P, M, G, 38 a 44).', category: 'fashion' },
  { key: 'color_variants', label: 'Variações de Cor', description: 'Múltiplas opções de cores para o mesmo modelo de peça.', category: 'fashion' },
  { key: 'variant_sku', label: 'SKU por Variante', description: 'Identificação e controle de estoque por combinação variante.', category: 'fashion' },
  { key: 'fashion_size_guide', label: 'Guia de Medidas', description: 'Tabela de medidas corporais e equivalências (requer size_grid).', category: 'fashion' },

  // Extensões de Tecnologia (4)
  { key: 'technical_specs', label: 'Especificações Técnicas', description: 'Tabela estruturada de atributos de hardware e eletrônicos.', category: 'tech' },
  { key: 'warranty_info', label: 'Informações de Garantia', description: 'Prazos de cobertura e termos de garantia do fabricante.', category: 'tech' },
  { key: 'product_comparison', label: 'Comparador de Produtos', description: 'Comparação técnica lado a lado de até 4 produtos do catálogo.', category: 'tech' },
  { key: 'technical_filters', label: 'Filtros Técnicos Dinâmicos', description: 'Filtragem facetada por atributos dinâmicos (requer technical_specs).', category: 'tech' },

  // Extensões de Livraria (6)
  { key: 'isbn', label: 'ISBN Padronizado', description: 'Identificação internacional normalizada de livros e publicações.', category: 'books' },
  { key: 'author', label: 'Autoria Literária', description: 'Metadados editoriais de autores, organizadores e ilustradores.', category: 'books' },
  { key: 'publisher', label: 'Editora', description: 'Registro da editora ou selo editorial responsável pela publicação.', category: 'books' },
  { key: 'literary_genre', label: 'Gênero Literário', description: 'Classificação temática e acervo literário especializado.', category: 'books' },
  { key: 'edition', label: 'Edição e Formato', description: 'Número da edição, ano e tipo de encadernação.', category: 'books' },
  { key: 'book_preview', label: 'Amostra de Leitura', description: 'Visualizador de primeiros capítulos e trechos de amostra.', category: 'books' },
];

export const AdminFeaturesPage: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    api.get<Store[]>('/api/v1/lps/stores')
      .then((res) => setStores(res.data || []))
      .catch(() => {});
  }, []);

  const getStoresWithFeature = (featureKey: string) => {
    return stores.filter((st) => Boolean(st.current_manifest?.features?.[featureKey]));
  };

  const categories = [
    { id: 'core', label: 'Núcleo Obrigatório (Core)', badge: '6 Features Obrigatórias', color: 'border-blue-200 bg-blue-50/40 text-blue-900' },
    { id: 'transversal', label: 'Features Transversais', badge: '3 Opcionais Multi-Segmento', color: 'border-purple-200 bg-purple-50/40 text-purple-900' },
    { id: 'fashion', label: 'Extensão Moda (FASHION)', badge: '4 Features de Vestuário', color: 'border-rose-200 bg-rose-50/40 text-rose-900' },
    { id: 'tech', label: 'Extensão Tecnologia (TECH)', badge: '4 Features de Hardware', color: 'border-cyan-200 bg-cyan-50/40 text-cyan-900' },
    { id: 'books', label: 'Extensão Livraria (BOOKS)', badge: '6 Features Editoriais', color: 'border-emerald-200 bg-emerald-50/40 text-emerald-900' },
  ];

  return (
    <AdminLayout
      title="Catálogo do Feature Model da LPS"
      subtitle="Matriz canônica de 23 features formais e mapeamento por vitrine configurada"
      breadcrumbs={[{ label: 'Features' }]}
    >
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#182230] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Modelo Canônico VitrineFlex (23 Features)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Definido na Engenharia de Domínio sem acoplamento a código estático de UI
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              6 Core
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              3 Transversais
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              14 Segmento
            </span>
          </div>
        </div>

        {/* Feature Groups */}
        {categories.map((cat) => {
          const groupFeatures = CANONICAL_FEATURES.filter((f) => f.category === cat.id);
          return (
            <div key={cat.id} className="bg-white rounded-xl border border-[#E2E7EF] shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50/60 border-b border-[#E2E7EF] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {cat.label}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 rounded bg-white border border-slate-200">
                  {cat.badge}
                </span>
              </div>

              <div className="divide-y divide-[#E2E7EF]">
                {groupFeatures.map((f) => {
                  const enabledStores = getStoresWithFeature(f.key);
                  return (
                    <div key={f.key} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{f.label}</span>
                          <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {f.key}
                          </code>
                          {f.required && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                              Obrigatória
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{f.description}</p>
                      </div>

                      {/* Enabled in stores */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-400 mr-1">Ativa em:</span>
                        {f.required ? (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Todas as Vitrines (Core)
                          </span>
                        ) : enabledStores.length > 0 ? (
                          enabledStores.map((st) => (
                            <span
                              key={st.id}
                              className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                              title={st.name}
                            >
                              {st.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Nenhuma vitrine</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};
