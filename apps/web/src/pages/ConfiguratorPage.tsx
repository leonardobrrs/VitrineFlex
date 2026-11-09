import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Store as StoreIcon,
  Layers,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Store, StoreSegment } from '../types';
import { api } from '../services/api';
import { AdminLayout } from '../components/admin/AdminLayout';

interface FeatureMeta {
  key: string;
  label: string;
  description: string;
  group: 'core' | 'transversal' | 'fashion' | 'tech' | 'books';
  segmentReq?: StoreSegment;
  requires?: string[];
}

const ALL_FEATURES: FeatureMeta[] = [
  // Núcleo Obrigatório
  { key: 'auth', label: 'Autenticação (auth)', description: 'Gestão de usuários, login JWT e controle de acesso.', group: 'core' },
  { key: 'catalog', label: 'Catálogo de Produtos (catalog)', description: 'Navegação de produtos, categorias e detalhes.', group: 'core' },
  { key: 'cart', label: 'Carrinho de Compras (cart)', description: 'Gerenciamento de itens e cálculo de subtotais.', group: 'core' },
  { key: 'orders', label: 'Gestão de Pedidos (orders)', description: 'Orquestração de pedidos e ciclo de vida de compras.', group: 'core' },
  { key: 'checkout', label: 'Checkout & Pagamento (checkout)', description: 'Finalização de pedidos, frete e opções de pagamento.', group: 'core' },
  { key: 'recommendations', label: 'Motor de Recomendações (recommendations)', description: 'Sugestões explicáveis com heurística de popularidade e afinidade.', group: 'core' },

  // Transversais
  { key: 'favorites', label: 'Lista de Favoritos (favorites)', description: 'Permite aos clientes marcar e acompanhar produtos de interesse.', group: 'transversal' },
  { key: 'recently_viewed', label: 'Vistos Recentemente (recently_viewed)', description: 'Exibe histórico dos produtos navegados na sessão do usuário.', group: 'transversal' },
  { key: 'back_in_stock_alert', label: 'Alerta de Reposição (back_in_stock_alert)', description: 'Captura interesse em itens esgotados e notifica na reposição.', group: 'transversal' },

  // Moda
  { key: 'size_grid', label: 'Grade de Tamanhos (size_grid)', description: 'Seleção dimensional de vestuário e calçados (P, M, G, 38, etc).', group: 'fashion', segmentReq: 'FASHION' },
  { key: 'color_variants', label: 'Variações de Cor (color_variants)', description: 'Múltiplas opções de cores para o mesmo modelo de peça.', group: 'fashion', segmentReq: 'FASHION' },
  { key: 'variant_sku', label: 'SKU Individual por Variante (variant_sku)', description: 'Identificação e controle de estoque por variação combinada.', group: 'fashion', segmentReq: 'FASHION' },
  { key: 'fashion_size_guide', label: 'Guia de Medidas (fashion_size_guide)', description: 'Tabela de medidas corporais e equivalências (requer size_grid).', group: 'fashion', segmentReq: 'FASHION', requires: ['size_grid'] },

  // Tecnologia
  { key: 'technical_specs', label: 'Especificações Técnicas (technical_specs)', description: 'Tabela estruturada de atributos de hardware e eletrônicos.', group: 'tech', segmentReq: 'TECH' },
  { key: 'warranty_info', label: 'Informações de Garantia (warranty_info)', description: 'Prazos de cobertura e termos de suporte do fabricante.', group: 'tech', segmentReq: 'TECH' },
  { key: 'product_comparison', label: 'Comparador de Produtos (product_comparison)', description: 'Comparação técnica lado a lado de até 4 itens.', group: 'tech', segmentReq: 'TECH' },
  { key: 'technical_filters', label: 'Filtros Técnicos Dinâmicos (technical_filters)', description: 'Filtragem facetada por atributos (requer technical_specs).', group: 'tech', segmentReq: 'TECH', requires: ['technical_specs'] },

  // Livraria
  { key: 'isbn', label: 'ISBN Padronizado (isbn)', description: 'Identificação internacional normalizada de publicações.', group: 'books', segmentReq: 'BOOKS' },
  { key: 'author', label: 'Autoria Literária (author)', description: 'Metadados editoriais de autores e organizadores.', group: 'books', segmentReq: 'BOOKS' },
  { key: 'publisher', label: 'Editora (publisher)', description: 'Registro da editora ou selo editorial responsável.', group: 'books', segmentReq: 'BOOKS' },
  { key: 'literary_genre', label: 'Gênero Literário (literary_genre)', description: 'Classificação temática e acervo literário especializado.', group: 'books', segmentReq: 'BOOKS' },
  { key: 'edition', label: 'Edição e Formato (edition)', description: 'Número da edição, ano e encadernação da obra.', group: 'books', segmentReq: 'BOOKS' },
  { key: 'book_preview', label: 'Amostra de Leitura (book_preview)', description: 'Visualizador de primeiros capítulos e trechos de amostra.', group: 'books', segmentReq: 'BOOKS' },
];

export const ConfiguratorPage: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [segment, setSegment] = useState<StoreSegment>('FASHION');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1e40af');

  // Active Features Map
  const [activeFeatures, setActiveFeatures] = useState<Record<string, boolean>>({
    // Core
    auth: true,
    catalog: true,
    cart: true,
    orders: true,
    checkout: true,
    recommendations: true,
    // Transversal
    favorites: true,
    recently_viewed: true,
    back_in_stock_alert: true,
    // Segment defaults for Fashion
    size_grid: true,
    color_variants: true,
    variant_sku: true,
    fashion_size_guide: true,
    // Others initially false
    technical_specs: false,
    warranty_info: false,
    product_comparison: false,
    technical_filters: false,
    isbn: false,
    author: false,
    publisher: false,
    literary_genre: false,
    edition: false,
    book_preview: false,
  });

  // Payments & Shipping
  const [paymentPix, setPaymentPix] = useState(true);
  const [paymentCard, setPaymentCard] = useState(true);
  const [paymentBoleto, setPaymentBoleto] = useState(false);
  const [fulfillDelivery, setFulfillDelivery] = useState(true);
  const [fulfillPickup, setFulfillPickup] = useState(false);

  // Feedback states
  const [validationResult, setValidationResult] = useState<{
    isValid?: boolean;
    errors?: string[];
    errorCode?: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const resp = await api.get('/api/v1/lps/stores');
      setStores(resp.data);
    } catch (e) {
      console.error('Erro ao listar lojas:', e);
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // When segment changes, adjust active features according to XOR cross-segment rules
  const handleSegmentChange = (newSegment: StoreSegment) => {
    setSegment(newSegment);
    setValidationResult(null);
    setActionSuccess(null);

    setActiveFeatures((prev) => {
      const next = { ...prev };
      // Turn off fashion
      if (newSegment !== 'FASHION') {
        next.size_grid = false;
        next.color_variants = false;
        next.variant_sku = false;
        next.fashion_size_guide = false;
      } else {
        next.size_grid = true;
        next.color_variants = true;
        next.variant_sku = true;
        next.fashion_size_guide = true;
      }

      // Turn off tech
      if (newSegment !== 'TECH') {
        next.technical_specs = false;
        next.warranty_info = false;
        next.product_comparison = false;
        next.technical_filters = false;
      } else {
        next.technical_specs = true;
        next.warranty_info = true;
        next.product_comparison = true;
        next.technical_filters = true;
      }

      // Turn off books
      if (newSegment !== 'BOOKS') {
        next.isbn = false;
        next.author = false;
        next.publisher = false;
        next.literary_genre = false;
        next.edition = false;
        next.book_preview = false;
      } else {
        next.isbn = true;
        next.author = true;
        next.publisher = true;
        next.literary_genre = true;
        next.edition = true;
        next.book_preview = true;
      }

      return next;
    });
  };

  const toggleFeature = (featKey: string) => {
    const feat = ALL_FEATURES.find((f) => f.key === featKey);
    if (!feat || feat.group === 'core') return; // Core cannot be toggled

    setActiveFeatures((prev) => {
      const nextVal = !prev[featKey];
      const next = { ...prev, [featKey]: nextVal };

      // Handle dependencies
      if (featKey === 'size_grid' && !nextVal) {
        next.fashion_size_guide = false;
      }
      if (featKey === 'fashion_size_guide' && nextVal) {
        next.size_grid = true;
      }
      if (featKey === 'technical_specs' && !nextVal) {
        next.technical_filters = false;
      }
      if (featKey === 'technical_filters' && nextVal) {
        next.technical_specs = true;
      }

      return next;
    });
  };

  const buildPayload = () => {
    const payment_methods: string[] = [];
    if (paymentPix) payment_methods.push('PIX');
    if (paymentCard) payment_methods.push('CARD');
    if (paymentBoleto) payment_methods.push('BOLETO');

    const fulfillment_modes: string[] = [];
    if (fulfillDelivery) fulfillment_modes.push('DELIVERY');
    if (fulfillPickup) fulfillment_modes.push('PICKUP');

    return {
      name,
      slug,
      segment,
      features: activeFeatures,
      payment_methods,
      fulfillment_modes,
      theme: {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        store_name: name,
      },
    };
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    setActionSuccess(null);
    try {
      const payload = buildPayload();
      const resp = await api.post('/api/v1/lps/validate', {
        segment: payload.segment,
        features: payload.features,
        payment_methods: payload.payment_methods,
        fulfillment_modes: payload.fulfillment_modes,
      });
      setValidationResult({
        isValid: resp.data.is_valid,
        errors: resp.data.errors,
        errorCode: resp.data.error_code,
      });
    } catch (e: any) {
      setValidationResult({
        isValid: false,
        errors: [e.message || 'Erro ao conectar com o validador da LPS.'],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionSuccess(null);
    setValidationResult(null);

    const payload = buildPayload();

    try {
      if (editingStoreId) {
        // Update manifest
        const resp = await api.patch(`/api/v1/lps/stores/${editingStoreId}/manifest`, {
          features: payload.features,
          payment_methods: payload.payment_methods,
          fulfillment_modes: payload.fulfillment_modes,
          theme: payload.theme,
        });
        setActionSuccess(`Manifesto da loja "${resp.data.store_name}" atualizado para a versão ${resp.data.version}!`);
        fetchStores();
      } else {
        // Create new store
        const resp = await api.post('/api/v1/lps/stores', payload);
        setActionSuccess(`Loja "${resp.data.name}" (${resp.data.slug}) derivada com sucesso!`);
        setName('');
        setSlug('');
        fetchStores();
      }
    } catch (e: any) {
      const errData = e.response?.data;
      setValidationResult({
        isValid: false,
        errors: Array.isArray(errData?.details)
          ? errData.details
          : [errData?.error?.message || errData?.detail || 'Falha ao processar solicitação.'],
        errorCode: errData?.error?.code || 'VALIDATION_ERROR',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const loadStoreIntoEditor = (store: Store) => {
    setEditingStoreId(store.id);
    setName(store.name);
    setSlug(store.slug);
    setSegment(store.segment);
    if (store.current_manifest) {
      const mf = store.current_manifest;
      const featMap: Record<string, boolean> = {};
      ALL_FEATURES.forEach((f) => {
        featMap[f.key] = f.group === 'core' ? true : Boolean(mf.features[f.key]);
      });
      setActiveFeatures(featMap);
      setPaymentPix(mf.payment_methods.includes('PIX'));
      setPaymentCard(mf.payment_methods.includes('CARD'));
      setPaymentBoleto(mf.payment_methods.includes('BOLETO'));
      setFulfillDelivery(mf.fulfillment_modes.includes('DELIVERY'));
      setFulfillPickup(mf.fulfillment_modes.includes('PICKUP'));
      if (mf.theme?.primary_color) setPrimaryColor(mf.theme.primary_color);
      if (mf.theme?.secondary_color) setSecondaryColor(mf.theme.secondary_color);
    }
    setActionSuccess(null);
    setValidationResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingStoreId(null);
    setName('');
    setSlug('');
    handleSegmentChange('FASHION');
    setActionSuccess(null);
    setValidationResult(null);
  };

  return (
    <AdminLayout
      title="Configurador de Derivação & Gestão de Manifestos"
      subtitle="Configure instâncias de e-commerce gerenciando a matriz de 23 features formais e versionamento de ProductManifest"
      breadcrumbs={[{ label: 'Configurador' }]}
      actions={
        editingStoreId ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs text-amber-900">
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold">Editando loja</span>
            <button
              type="button"
              onClick={cancelEdit}
              className="ml-2 font-bold underline hover:text-amber-950"
            >
              Cancelar
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-7">
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Store Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nome da Vitrine
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vitrine Nova Era"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingStoreId && !slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }
                  }}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Slug da Loja (URL)
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingStoreId)}
                  pattern="^[a-z0-9-]+$"
                  placeholder="vitrine-nova-era"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Segment Selector (XOR) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Segmento Comercial (XOR - Imutável pós-derivação ADR-006)
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Exclusão mútua obrigatória</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['FASHION', 'TECH', 'BOOKS'] as StoreSegment[]).map((seg) => {
                  const isSelected = segment === seg;
                  return (
                    <button
                      key={seg}
                      type="button"
                      disabled={Boolean(editingStoreId)}
                      onClick={() => handleSegmentChange(seg)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } ${editingStoreId ? 'cursor-not-allowed opacity-80' : ''}`}
                    >
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>{seg}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {seg === 'FASHION' && 'Moda, Cores & Tamanhos'}
                        {seg === 'TECH' && 'Eletrônicos & Hardware'}
                        {seg === 'BOOKS' && 'Livraria & Acervo'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Matrix Sections */}
            <div className="space-y-6 pt-2">
              {/* 1. Núcleo Obrigatório */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Núcleo Obrigatório da LPS (6 Features)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Sempre Ativas
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Fundação transacional comum compartilhada por todos os produtos derivados.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {ALL_FEATURES.filter((f) => f.group === 'core').map((feat) => (
                    <div
                      key={feat.key}
                      className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">{feat.key}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{feat.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Transversais Opcionais */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Features Transversais Opcionais (3 Features)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Compatíveis com qualquer segmento</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ALL_FEATURES.filter((f) => f.group === 'transversal').map((feat) => {
                    const isActive = !!activeFeatures[feat.key];
                    return (
                      <label
                        key={feat.key}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isActive
                            ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleFeature(feat.key)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{feat.key}</span>
                            <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                              {feat.description}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Features do Segmento Selecionado */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Extensões do Segmento {segment} ({ALL_FEATURES.filter((f) => f.segmentReq === segment).length} Features)
                  </span>
                  <span className="text-[11px] text-slate-500">Restrições CTC ativas em tempo real</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_FEATURES.filter((f) => f.segmentReq === segment).map((feat) => {
                    const isActive = !!activeFeatures[feat.key];
                    const hasDepReq = feat.requires && feat.requires.some((dep) => !activeFeatures[dep]);

                    return (
                      <label
                        key={feat.key}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isActive
                            ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        } ${hasDepReq ? 'opacity-70' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleFeature(feat.key)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{feat.key}</span>
                            <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                              {feat.description}
                            </span>
                            {feat.requires && (
                              <span className="inline-block text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded mt-1.5">
                                Requer: {feat.requires.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payments & Shipping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Métodos de Pagamento (Mínimo 1)
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentPix}
                      onChange={(e) => setPaymentPix(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700">PIX Instantâneo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentCard}
                      onChange={(e) => setPaymentCard(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700">Cartão de Crédito</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentBoleto}
                      onChange={(e) => setPaymentBoleto(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700">Boleto Bancário</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Modalidades de Frete (Mínimo 1)
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fulfillDelivery}
                      onChange={(e) => setFulfillDelivery(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700">Entrega em Domicílio (DELIVERY)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fulfillPickup}
                      onChange={(e) => setFulfillPickup(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700">Retirada no Local (PICKUP)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Theme Colors */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Cor Primária
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                  />
                  <span className="text-xs font-mono text-slate-600 font-semibold">{primaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Cor Secundária
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                  />
                  <span className="text-xs font-mono text-slate-600 font-semibold">{secondaryColor}</span>
                </div>
              </div>
            </div>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`p-4 rounded-2xl border text-xs ${
                  validationResult.isValid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {validationResult.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  {validationResult.isValid
                    ? 'Configuração Validada com Sucesso pela LPS!'
                    : `Violação de Regra LPS (${validationResult.errorCode}):`}
                </div>
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px]">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {actionSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleValidate}
                disabled={validating}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
              >
                {validating ? 'Validando...' : 'Validar Regras da LPS (Dry-run)'}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {submitting
                  ? 'Processando...'
                  : editingStoreId
                  ? 'Atualizar Manifesto da Loja'
                  : 'Derivar e Emitir ProductManifest'}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Stores Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-indigo-600" />
              Lojas Derivadas ({stores.length})
            </h2>
            <button
              onClick={fetchStores}
              disabled={loadingStores}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Recarregar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStores ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingStores && stores.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">Carregando lojas...</div>
          ) : stores.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Nenhuma loja derivada ainda. Utilize o formulário para criar a primeira!
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map((s) => (
                <div
                  key={s.id}
                  className={`p-4 rounded-2xl border transition-all shadow-2xs space-y-2.5 ${
                    editingStoreId === s.id
                      ? 'border-indigo-600 bg-indigo-50/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{s.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {s.segment}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-mono text-slate-600">/{s.slug}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Layers className="w-3 h-3 text-slate-400" />
                      Manifest v{s.current_manifest?.version || 1}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => loadStoreIntoEditor(s)}
                      className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>

                    <Link
                      to={`/loja/${s.slug}`}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      Acessar Vitrine
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
