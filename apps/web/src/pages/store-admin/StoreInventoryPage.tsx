import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  RefreshCw,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Store,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ProductImage } from '../../components/ProductImage';
import { applyStoreTheme } from '../../services/theme';

interface ProductItem {
  id: string;
  store_id: string;
  title: string;
  category: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  variants?: { id: string; sku: string; size?: string; color?: string; stock_quantity: number }[];
}

export const StoreInventoryPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isLpsAdmin = user?.role === 'LPS_ADMIN';
  const assignedStoreId = user?.store_id || 'store-tech';

  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    isLpsAdmin ? 'store-tech' : assignedStoreId
  );

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de reposição
  const [replenishProduct, setReplenishProduct] = useState<ProductItem | null>(null);
  const [additionalStock, setAdditionalStock] = useState<number>(10);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    applyStoreTheme('neutral');
  }, []);

  const fetchProducts = async (storeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get<ProductItem[]>(`/api/v1/catalog/stores/${storeId}/products`);
      setProducts(resp.data);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar catálogo da loja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storeToFetch = isLpsAdmin ? selectedStoreId : assignedStoreId;
    fetchProducts(storeToFetch);
  }, [selectedStoreId, assignedStoreId, isLpsAdmin]);

  const handleOpenReplenish = (p: ProductItem) => {
    setReplenishProduct(p);
    setAdditionalStock(10);
    setSelectedVariantId(p.variants && p.variants.length > 0 ? p.variants[0].id : '');
    setError(null);
  };

  const handleReplenishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishProduct) return;

    if (additionalStock <= 0) {
      setError('A quantidade de reposição deve ser maior que zero.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ additional_stock: String(additionalStock) });
      if (selectedVariantId) {
        params.set('variant_id', selectedVariantId);
      }

      const url = `/api/v1/catalog/products/${replenishProduct.id}/replenish?${params.toString()}`;
      const resp = await api.post(url);

      const newStock = resp.data?.new_stock ?? (replenishProduct.stock_quantity + additionalStock);
      setSuccessMsg(`Estoque de "${replenishProduct.title}" reposto com sucesso! Novo saldo: ${newStock} unidades.`);

      // Atualiza o estado local
      setProducts((prev) =>
        prev.map((item) =>
          item.id === replenishProduct.id ? { ...item, stock_quantity: newStock } : item
        )
      );

      setReplenishProduct(null);
    } catch (err: any) {
      setError(err?.message || 'Falha ao repor estoque.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const lowStockCount = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity < 5).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  const storeLabels: Record<string, string> = {
    'store-fashion': 'Vitrine Moda',
    'store-tech': 'Vitrine Tech',
    'store-books': 'Vitrine Books',
  };

  const currentStoreName = storeLabels[isLpsAdmin ? selectedStoreId : assignedStoreId] || (isLpsAdmin ? selectedStoreId : assignedStoreId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  VF
                </div>
                <span className="font-extrabold text-base text-slate-900 tracking-tight">VitrineFlex</span>
              </Link>

              <span className="text-slate-300">/</span>

              <div className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs text-slate-800">Área Operacional de Estoque</span>
              </div>
            </div>

            {/* Right Operator Info & Logout */}
            <div className="flex items-center gap-3">
              {isLpsAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Painel LPS Admin</span>
                </Link>
              )}

              {user && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 leading-tight">{user.name}</span>
                    <span className="text-[10px] font-mono font-semibold text-blue-700">{user.role}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold transition"
                    title="Encerrar sessão"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Banner de Identificação da Loja */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  {currentStoreName}
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {isLpsAdmin ? selectedStoreId : assignedStoreId}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLpsAdmin
                  ? 'Acesso irrestrito de Administrador da LPS. Você pode inspecionar e repor o estoque de qualquer vitrine.'
                  : 'Gestão exclusiva da loja vinculada ao seu usuário STORE_ADMIN.'}
              </p>
            </div>
          </div>

          {/* LPS_ADMIN Store Selector Switcher */}
          {isLpsAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Alternar Loja:</span>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="store-fashion">Vitrine Moda (store-fashion)</option>
                <option value="store-tech">Vitrine Tech (store-tech)</option>
                <option value="store-books">Vitrine Books (store-books)</option>
              </select>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200">
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span>Escopo Operacional Restrito</span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Produtos no Catálogo</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{products.length}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Cadastrados no serviço de catálogo</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Estoque Baixo (&lt; 5 unid.)</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{lowStockCount}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Requer atenção operacional</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Esgotados (0 unid.)</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{outOfStockCount}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Alertas de reposição pendentes</p>
          </div>
        </div>

        {/* Products Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por produto ou categoria..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <button
              onClick={() => fetchProducts(isLpsAdmin ? selectedStoreId : assignedStoreId)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar Catálogo</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-14">Foto</th>
                  <th className="py-3 px-4">Produto / Identificador</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Preço</th>
                  <th className="py-3 px-4">Estoque Atual</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                      Carregando produtos da loja...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isZero = p.stock_quantity === 0;
                    const isLow = p.stock_quantity > 0 && p.stock_quantity < 5;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-4">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            <ProductImage
                              src={p.image_url}
                              alt={p.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{p.title}</div>
                          <div className="font-mono text-[10px] text-slate-400">ID: {p.id}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                          R$ {p.price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4">
                          {isZero ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Esgotado (0)
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Baixo ({p.stock_quantity})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {p.stock_quantity} unidades
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenReplenish(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>Repor</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Repor Estoque */}
        {replenishProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <PackagePlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Repor Estoque de Produto</h3>
                    <p className="text-[11px] text-slate-500">{currentStoreName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReplenishProduct(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900">{replenishProduct.title}</div>
                <div className="text-slate-500 font-mono text-[11px]">ID: {replenishProduct.id}</div>
                <div className="text-slate-700 font-semibold pt-1">
                  Estoque Atual: <span className="text-blue-700">{replenishProduct.stock_quantity} unidades</span>
                </div>
              </div>

              <form onSubmit={handleReplenishSubmit} className="space-y-4 text-xs">
                {replenishProduct.variants && replenishProduct.variants.length > 0 && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Variante (Opcional)
                    </label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none"
                    >
                      <option value="">Repor no produto base</option>
                      {replenishProduct.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          SKU {v.sku} ({v.size || ''} {v.color || ''}) — Estoque: {v.stock_quantity}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Quantidade a Adicionar (unidades adicionais)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={additionalStock}
                    onChange={(e) => setAdditionalStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ao confirmar, alertas de reposição pendentes (BackInStock) serão notificados automaticamente.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReplenishProduct(null)}
                    disabled={submitting}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs"
                  >
                    {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PackagePlus className="w-3.5 h-3.5" />}
                    <span>Confirmar Reposição</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        VitrineFlex LPS — Módulo Operacional de Gestão de Estoque
      </footer>
    </div>
  );
};
