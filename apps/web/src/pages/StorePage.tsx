import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { ShieldAlert, Scale } from 'lucide-react';
import { Product } from '../types';
import { ProductComparisonModal } from '../components/extensions/ProductComparisonModal';
import { RecommendationCarousel } from '../components/RecommendationCarousel';
import { RecentlyViewedSection } from '../components/RecentlyViewedSection';
import { TechnicalFiltersBar } from '../components/extensions/TechnicalFiltersBar';
import { BackInStockAlertModal } from '../components/extensions/BackInStockAlertModal';
import { ProductCard } from '../components/ProductCard';

export const StorePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { manifest, loading, error, loadStoreBySlug, hasFeature } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedTechFilters, setSelectedTechFilters] = useState<Record<string, string[]>>({});
  const [stockAlertProduct, setStockAlertProduct] = useState<Product | null>(null);

  useEffect(() => {
    const alertState = (location.state as any)?.openStockAlert;
    if (alertState && products.length > 0) {
      const match = products.find((p) => p.id === alertState.productId);
      if (match) {
        setStockAlertProduct(match);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, products]);

  useEffect(() => {
    if (slug) {
      loadStoreBySlug(slug);
    }
  }, [slug]);

  useEffect(() => {
    if (!manifest?.store_id) return;

    let isMounted = true;
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const resp = await fetch(
          `http://localhost:8000/api/v1/catalog/stores/${manifest.store_id}/products`
        );
        if (resp.ok && isMounted) {
          const data = await resp.json();
          setProducts(data);
        }
      } catch (e) {
        console.error('Erro ao buscar produtos do catálogo:', e);
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [manifest?.store_id]);

  const primaryColor = manifest?.theme?.primary_color || '#1e40af';
  const isTechStore = manifest?.segment === 'TECH';
  const hasComparison = isTechStore && hasFeature('product_comparison');
  const hasFavorites = hasFeature('favorites');
  const hasTechFilters = hasFeature('technical_filters');

  const filteredProducts = useMemo(() => {
    if (!hasTechFilters || Object.keys(selectedTechFilters).length === 0) {
      return products;
    }
    return products.filter((p) => {
      for (const [attrName, allowedValues] of Object.entries(selectedTechFilters)) {
        if (!allowedValues || allowedValues.length === 0) continue;
        const attr = p.attributes?.find(
          (a) => a.name.toLowerCase() === attrName.toLowerCase()
        );
        if (!attr || !allowedValues.includes(attr.value)) {
          return false;
        }
      }
      return true;
    });
  }, [products, selectedTechFilters, hasTechFilters]);

  const toggleCompareSelection = (productId: string) => {
    if (selectedForCompare.includes(productId)) {
      setSelectedForCompare(selectedForCompare.filter((id) => id !== productId));
    } else {
      if (selectedForCompare.length >= 4) {
        alert('Você pode comparar no máximo 4 produtos simultaneamente.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, productId]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <StoreHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 font-medium animate-pulse">Carregando vitrine...</p>
        </div>
        <StoreFooter />
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="flex flex-col min-h-screen">
        <StoreHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md bg-white p-6 rounded-2xl border border-rose-200 text-center shadow-sm">
            <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900 mb-1">Loja Não Encontrada</h2>
            <p className="text-sm text-slate-600 mb-4">
              Não foi possível carregar os produtos para a vitrine selecionada.
            </p>
          </div>
        </div>
        <StoreFooter />
      </div>
    );
  }

  const getStoreHeadline = () => {
    switch (manifest.segment) {
      case 'FASHION':
        return {
          tag: 'Coleção Exclusiva',
          desc: 'Roupas e calçados com modelagens contemporâneas, tecidos premium e acabamento refinado.',
        };
      case 'TECH':
        return {
          tag: 'Alta Tecnologia & Performance',
          desc: 'Eletrônicos, notebooks e periféricos de alta performance com garantia e suporte especializado.',
        };
      case 'BOOKS':
        return {
          tag: 'Livraria & Acervo Selecionado',
          desc: 'Livros de computação, engenharia de software e clássicos da literatura com curadoria editorial.',
        };
      default:
        return {
          tag: 'Catálogo de Produtos',
          desc: 'Produtos selecionados especialmente para você.',
        };
    }
  };

  const headline = getStoreHeadline();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60">
      <StoreHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-10">
        {/* Commercial Hero Banner */}
        <section
          className="rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-block text-xs uppercase tracking-widest font-extrabold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
                {headline.tag}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {manifest.store_name}
              </h1>
              <p className="text-white/90 text-sm sm:text-base leading-relaxed pt-1">
                {headline.desc}
              </p>
            </div>

            {/* Comparison Floating Action Button for TECH stores */}
            {hasComparison && selectedForCompare.length >= 2 && (
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="px-5 py-3 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-slate-100 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
              >
                <Scale className="w-4 h-4 text-indigo-600" />
                Comparar ({selectedForCompare.length}) Produtos
              </button>
            )}
          </div>
        </section>

        {/* Supplementary Section: Recommendations (PB-21) */}
        {hasFeature('recommendations') && (
          <RecommendationCarousel
            storeId={manifest.store_id}
            storeSlug={manifest.store_slug}
            primaryColor={primaryColor}
          />
        )}

        {/* Supplementary Section: Recently Viewed Products (Prominently visible when items exist) */}
        {hasFeature('recently_viewed') && (
          <RecentlyViewedSection
            storeId={manifest.store_id}
            storeSlug={manifest.store_slug}
            primaryColor={primaryColor}
          />
        )}

        {/* Primary Section: Main Catalog */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-slate-200/80 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Todos os Produtos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredProducts.length === products.length
                  ? `${products.length} ${products.length === 1 ? 'item disponível' : 'itens disponíveis no catálogo'}`
                  : `Exibindo ${filteredProducts.length} de ${products.length} itens (filtrado)`}
              </p>
            </div>

            {hasComparison && (
              <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                <span>Selecione 2 a 4 produtos para comparar</span>
              </div>
            )}
          </div>

          {loadingProducts ? (
            <div className="py-20 text-center text-sm text-slate-400">
              Carregando catálogo de produtos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-16 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-2">
              <p className="text-base text-slate-600 font-semibold">Nenhum produto encontrado com os filtros selecionados.</p>
              <button
                onClick={() => setSelectedTechFilters({})}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : hasTechFilters ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              <div className="lg:col-span-1 lg:sticky lg:top-24 min-h-0 self-start">
                <TechnicalFiltersBar
                  storeId={manifest.store_id}
                  selectedFilters={selectedTechFilters}
                  onChangeFilters={setSelectedTechFilters}
                  primaryColor={primaryColor}
                />
              </div>
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      storeId={manifest.store_id}
                      storeSlug={manifest.store_slug}
                      segment={manifest.segment}
                      primaryColor={primaryColor}
                      hasFavorites={hasFavorites}
                      hasComparison={hasComparison}
                      isSelectedForCompare={selectedForCompare.includes(product.id)}
                      onToggleCompare={() => toggleCompareSelection(product.id)}
                      hasFeature={hasFeature}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  storeId={manifest.store_id}
                  storeSlug={manifest.store_slug}
                  segment={manifest.segment}
                  primaryColor={primaryColor}
                  hasFavorites={hasFavorites}
                  hasComparison={hasComparison}
                  isSelectedForCompare={selectedForCompare.includes(product.id)}
                  onToggleCompare={() => toggleCompareSelection(product.id)}
                  hasFeature={hasFeature}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Stock Alert Modal (e.g. returning from login) */}
      {stockAlertProduct && (
        <BackInStockAlertModal
          product={stockAlertProduct}
          isOpen={!!stockAlertProduct}
          onClose={() => setStockAlertProduct(null)}
          primaryColor={primaryColor}
        />
      )}

      {/* Comparison Modal */}
      {hasComparison && (
        <ProductComparisonModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          storeId={manifest.store_id}
          selectedProductIds={selectedForCompare}
        />
      )}

      <StoreFooter />
    </div>
  );
};
