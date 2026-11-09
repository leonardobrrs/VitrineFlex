import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { api } from '../../services/api';

interface CTCRule {
  code: string;
  name: string;
  expression: string;
  description: string;
  scope: 'CORE' | 'FASHION' | 'TECH' | 'BOOKS' | 'CROSS_CUTTING';
}

const CTC_RULES: CTCRule[] = [
  { code: 'CTC-01', name: 'Núcleo Obrigatório Completo', expression: 'Store implies (auth and catalog and cart and orders and checkout and recommendations)', description: 'Todas as vitrines derivadas precisam obrigatoriamente instanciar as 6 features do núcleo.', scope: 'CORE' },
  { code: 'CTC-02', name: 'Exclusividade de Segmento', expression: 'FASHION xor TECH xor BOOKS', description: 'Cada vitrine pertence estritamente a um único segmento de negócio.', scope: 'CORE' },
  { code: 'CTC-03', name: 'Guia de Medidas Requer Grade', expression: 'fashion_size_guide implies size_grid', description: 'O Guia de Medidas depende da existência prévia de uma Grade de Tamanhos ativa.', scope: 'FASHION' },
  { code: 'CTC-04', name: 'Grade de Tamanhos Restrita a Moda', expression: 'size_grid implies FASHION', description: 'A grade dimensional é exclusiva de vestuário e calçados.', scope: 'FASHION' },
  { code: 'CTC-05', name: 'Variações de Cor Restrita a Moda', expression: 'color_variants implies FASHION', description: 'A seleção visual de cores é exclusiva do segmento de moda.', scope: 'FASHION' },
  { code: 'CTC-06', name: 'SKU por Variante Restrito a Moda', expression: 'variant_sku implies FASHION', description: 'Controle de estoque multidimensional restrito ao vestuário.', scope: 'FASHION' },
  { code: 'CTC-07', name: 'Filtros Técnicos Requerem Especificações', expression: 'technical_filters implies technical_specs', description: 'A filtragem facetada de hardware requer atributos técnicos estruturados.', scope: 'TECH' },
  { code: 'CTC-08', name: 'Comparador Restrito a Tecnologia', expression: 'product_comparison implies TECH', description: 'A comparação técnica lado a lado é exclusiva do domínio de hardware.', scope: 'TECH' },
  { code: 'CTC-09', name: 'Garantia Restrita a Tecnologia', expression: 'warranty_info implies TECH', description: 'Exibição de termos de garantia do fabricante vinculada a eletrônicos.', scope: 'TECH' },
  { code: 'CTC-10', name: 'Especificações Restritas a Tecnologia', expression: 'technical_specs implies TECH', description: 'Tabela de atributos estruturados restrita ao segmento tecnológico.', scope: 'TECH' },
  { code: 'CTC-11', name: 'ISBN Restrito a Livraria', expression: 'isbn implies BOOKS', description: 'Metadado internacional padronizado exclusivo para o mercado editorial.', scope: 'BOOKS' },
  { code: 'CTC-12', name: 'Autoria Restrita a Livraria', expression: 'author implies BOOKS', description: 'Identificação editorial de autores restrita à Livraria.', scope: 'BOOKS' },
  { code: 'CTC-13', name: 'Editora Restrita a Livraria', expression: 'publisher implies BOOKS', description: 'Registro de selos editoriais restrito à Livraria.', scope: 'BOOKS' },
  { code: 'CTC-14', name: 'Gênero Literário Restrito a Livraria', expression: 'literary_genre implies BOOKS', description: 'Classificação temática literária restrita à Livraria.', scope: 'BOOKS' },
  { code: 'CTC-15', name: 'Edição Restrita a Livraria', expression: 'edition implies BOOKS', description: 'Metadados de encadernação e número da edição restritos à Livraria.', scope: 'BOOKS' },
  { code: 'CTC-16', name: 'Amostra de Leitura Restrita a Livraria', expression: 'book_preview implies BOOKS', description: 'Degustação e pré-visualização de texto restritas à Livraria.', scope: 'BOOKS' },
  { code: 'CTC-17', name: 'Favoritos Transversal Livre', expression: 'favorites implies (FASHION or TECH or BOOKS)', description: 'Lista de favoritos pode ser ativada opcionalmente em qualquer vitrine.', scope: 'CROSS_CUTTING' },
  { code: 'CTC-18', name: 'Alerta de Estoque Transversal Livre', expression: 'back_in_stock_alert implies (FASHION or TECH or BOOKS)', description: 'Alerta de reposição pode ser ativado em qualquer segmento.', scope: 'CROSS_CUTTING' },
];

export const AdminVariabilityRulesPage: React.FC = () => {
  const [filterScope, setFilterScope] = useState<string>('ALL');
  const [testSegment, setTestSegment] = useState<'FASHION' | 'TECH' | 'BOOKS'>('FASHION');
  const [testFeatures, setTestFeatures] = useState<string>('auth, catalog, cart, orders, checkout, recommendations, size_grid, fashion_size_guide');
  const [validationResponse, setValidationResponse] = useState<any>(null);
  const [validating, setValidating] = useState<boolean>(false);

  const runValidation = async () => {
    setValidating(true);
    setValidationResponse(null);
    try {
      const featArray = testFeatures.split(',').map((s) => s.trim()).filter(Boolean);
      const resp = await api.post('/api/v1/lps/validate', {
        segment: testSegment,
        features: featArray,
      });
      setValidationResponse(resp.data);
    } catch (err: any) {
      setValidationResponse({
        valid: false,
        errors: [err.response?.data?.detail || err.message || 'Erro ao validar regras'],
      });
    } finally {
      setValidating(false);
    }
  };

  const filteredRules = filterScope === 'ALL'
    ? CTC_RULES
    : CTC_RULES.filter((r) => r.scope === filterScope);

  return (
    <AdminLayout
      title="Regras de Variabilidade e Restrições CTC"
      subtitle="Matriz de restrições formais (CTC-01 a CTC-18) com validador interativo em tempo real"
      breadcrumbs={[{ label: 'Regras CTC' }]}
    >
      <div className="space-y-6">
        {/* Interactive Validation Tester */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              <span>Simulador do Mecanismo de Validação da LPS</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">POST /api/v1/lps/validate</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Segmento</label>
              <select
                value={testSegment}
                onChange={(e) => setTestSegment(e.target.value as any)}
                className="w-full text-xs border border-[#E2E7EF] rounded-lg px-3 py-2 bg-white"
              >
                <option value="FASHION">FASHION (Moda)</option>
                <option value="TECH">TECH (Tecnologia)</option>
                <option value="BOOKS">BOOKS (Livraria)</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Features Selecionadas (separadas por vírgula)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testFeatures}
                  onChange={(e) => setTestFeatures(e.target.value)}
                  className="flex-1 text-xs font-mono border border-[#E2E7EF] rounded-lg px-3 py-2"
                />
                <button
                  type="button"
                  onClick={runValidation}
                  disabled={validating}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50"
                >
                  {validating ? 'Validando...' : 'Validar CTC'}
                </button>
              </div>
            </div>
          </div>

          {validationResponse && (
            <div className={`p-4 rounded-xl border text-xs ${
              validationResponse.valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="font-bold flex items-center gap-1.5 mb-1">
                {validationResponse.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Configuração Válida — Atende a todas as restrições CTC</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Violação de Restrição Detectada</span>
                  </>
                )}
              </div>
              {validationResponse.errors && validationResponse.errors.length > 0 && (
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  {validationResponse.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E2E7EF] pb-3">
          <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wider">Escopo:</span>
          {['ALL', 'CORE', 'FASHION', 'TECH', 'BOOKS', 'CROSS_CUTTING'].map((sc) => (
            <button
              key={sc}
              onClick={() => setFilterScope(sc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterScope === sc
                  ? 'bg-[#172334] text-white shadow-2xs'
                  : 'bg-white border border-[#E2E7EF] text-slate-700 hover:bg-slate-50'
              }`}
            >
              {sc === 'ALL' ? 'Todas (18)' : sc}
            </button>
          ))}
        </div>

        {/* CTC Rules Table */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#E2E7EF] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4">Código</th>
                <th className="py-2.5 px-4">Nome da Restrição</th>
                <th className="py-2.5 px-4">Expressão Lógica (Feature Model)</th>
                <th className="py-2.5 px-4">Descrição da Regra</th>
                <th className="py-2.5 px-4">Escopo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E7EF]">
              {filteredRules.map((rule) => (
                <tr key={rule.code} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{rule.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{rule.name}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-purple-700">{rule.expression}</td>
                  <td className="py-3 px-4 text-slate-600 text-[11px] max-w-sm">{rule.description}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {rule.scope}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
