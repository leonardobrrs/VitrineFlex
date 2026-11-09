import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { ShieldAlert, Scale, X, ArrowUpDown } from 'lucide-react';
import { Product } from '../types';
import { ProductComparisonModal } from '../components/extensions/ProductComparisonModal';
import { RecommendationCarousel } from '../components/RecommendationCarousel';
import { RecentlyViewedSection } from '../components/RecentlyViewedSection';
import { TechnicalFiltersBar } from '../components/extensions/TechnicalFiltersBar';
import { BackInStockAlertModal } from '../components/extensions/BackInStockAlertModal';
import { ProductCard } from '../components/ProductCard';
import { resolveStoreTheme, StoreTheme } from '../services/theme';
import {
  FashionHero,
  FashionSecondaryFeature,
  FashionCategoriesSection,
} from '../components/store/FashionSections';
import {
  TechHero,
  TechCategoryTiles,
  TechComparatorCallout,
} from '../components/store/TechSections';
import {
  BooksHero,
  BooksCollectionsSection,
  BooksAuthorFeature,
  BooksGenreBar,
} from '../components/store/BooksSections';

export const StorePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { manifest, loading, error, loadStoreBySlug, hasFeature, theme } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedTechFilters, setSelectedTechFilters] = useState<Record<string, string[]>>({});
  const [stockAlertProduct, setStockAlertProduct] = useState<Product | null>(null);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const catalogRef = useRef<HTMLDivElement>(null);

  const effectiveTheme: StoreTheme = theme !== 'neutral'
    ? theme
    : resolveStoreTheme(manifest?.segment || slug);

  const isFashion = effectiveTheme === 'fashion';
  const isTech = effectiveTheme === 'tech';
  const isBooks = effectiveTheme === 'books';

  // Read URL query params (?cat=..., ?q=...)
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const querySearch = searchParams.get('q');
  const queryCategory = searchParams.get('cat');

  const scrollToCatalog = () => {
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectCategory = (cat: string | null) => {
    setSelectedCategory(cat);
    setSelectedGenre(null);
    setTimeout(scrollToCatalog, 60);
  };

  const handleSelectGenre = (genre: string | null) => {
    setSelectedGenre(genre);
    setSelectedCategory(null);
    setTimeout(scrollToCatalog, 60);
  };

  const handleClearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedGenre(null);
    setSelectedTechFilters({});
    setSortBy('featured');
    if (slug) {
      navigate(`/loja/${slug}`, { replace: true });
    }
    setTimeout(scrollToCatalog, 60);
  };

  // Reset catalog when triggered by header link or #catalogo state
  useEffect(() => {
    if (location.state?.resetCatalog || location.hash === '#catalogo') {
      setSelectedCategory(null);
      setSelectedGenre(null);
      setSelectedTechFilters({});
      setSortBy('featured');
      setTimeout(scrollToCatalog, 80);
    }
  }, [location.state?.resetCatalog, location.hash]);

  useEffect(() => {
    if (queryCategory) {
      setSelectedCategory(queryCategory);
      setTimeout(scrollToCatalog, 120);
    } else if (!location.hash) {
      setSelectedCategory(null);
    }
  }, [queryCategory]);

  useEffect(() => {
    if (querySearch) {
      setTimeout(scrollToCatalog, 120);
    }
  }, [querySearch]);

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

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query filter
    if (querySearch) {
      const q = querySearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.attributes?.some((a) => a.value.toLowerCase().includes(q))
      );
    }

    // Category / Genre filter
    const activeCat = selectedCategory || selectedGenre;
    if (activeCat) {
      const target = activeCat.toLowerCase().trim();

      result = result.filter((p) => {
        const cat = p.category?.toLowerCase() || '';
        if (cat === target) return true;

        // Attribute matches: Gênero, Departamento, Estilo, Gênero Literário, Autor, Editora
        const hasAttrMatch = p.attributes?.some((a) => {
          const val = a.value.toLowerCase().trim();
          const name = a.name.toLowerCase().trim();

          // Moda gender & department mapping
          if (target === 'feminino') {
            return (name === 'gênero' || name === 'departamento') && (val === 'feminino' || val === 'unissex');
          }
          if (target === 'masculino') {
            return (name === 'gênero' || name === 'departamento') && (val === 'masculino' || val === 'unissex');
          }
          if (target === 'acessórios' || target === 'acessorios') {
            return (name === 'departamento' || name === 'estilo') && val === 'acessórios';
          }
          if (target === 'alfaiataria moderna' || target === 'alfaiataria') {
            return name === 'estilo' && val.includes('alfaiataria');
          }

          // Books genre / author / collection mapping
          if (name === 'gênero literário' || name === 'autor' || name === 'editora') {
            return val.includes(target) || target.includes(val);
          }

          return val === target;
        });

        if (hasAttrMatch) return true;

        // Semantic Category & Title fallback mappings
        if (target === 'feminino') {
          return ['vestidos', 'bolsas', 'saias', 'blusas', 'scarpin', 'regata', 'dress'].some(
            (k) => cat.includes(k) || p.title.toLowerCase().includes(k)
          );
        }
        if (target === 'masculino') {
          return ['camisas', 'bermudas', 'blazer', 'moletons', 'chino', 'polo', 'tshirt'].some(
            (k) => cat.includes(k) || p.title.toLowerCase().includes(k)
          );
        }
        if (target === 'acessórios' || target === 'acessorios') {
          return ['acessórios', 'cinto', 'carteira', 'cachecol', 'bolsa', 'hub', 'carregador', 'fone'].some(
            (k) => cat.includes(k) || p.title.toLowerCase().includes(k)
          );
        }
        if (target === 'alfaiataria moderna' || target === 'alfaiataria') {
          return ['blazer', 'social', 'alfaiataria', 'trench', 'chino', 'linho'].some(
            (k) => cat.includes(k) || p.title.toLowerCase().includes(k)
          );
        }

        // Tech departments
        if (target === 'smartphones') {
          return cat.includes('smartphone') || p.title.toLowerCase().includes('iphone') || p.title.toLowerCase().includes('galaxy');
        }
        if (target === 'notebooks') {
          return cat.includes('notebook') || p.title.toLowerCase().includes('dell') || p.title.toLowerCase().includes('laptop') || p.title.toLowerCase().includes('macbook');
        }
        if (target === 'áudio' || target === 'audio') {
          return cat.includes('áudio') || cat.includes('audio') || p.title.toLowerCase().includes('fone') || p.title.toLowerCase().includes('headphone') || p.title.toLowerCase().includes('microfone');
        }

        // Books collections / genres
        if (target === 'literatura') {
          return cat.includes('literatura') || cat.includes('ficção') || p.description?.toLowerCase().includes('literatura');
        }
        if (target === 'clássicos' || target === 'classicos') {
          return cat.includes('clássic') || ['1984', 'duna', 'casmurro', 'metamorfose', 'crime', 'memórias'].some((k) => p.title.toLowerCase().includes(k));
        }
        if (target === 'não-ficção' || target === 'não ficção' || target === 'nao ficcao') {
          return cat.includes('não-ficção') || cat.includes('computação') || cat.includes('engenharia') || cat.includes('história') || cat.includes('ciência');
        }

        return cat.includes(target) || p.title.toLowerCase().includes(target);
      });
    }

    // Technical attributes filter
    if (hasTechFilters && Object.keys(selectedTechFilters).length > 0) {
      result = result.filter((p) => {
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
    }

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, querySearch, selectedCategory, selectedGenre, selectedTechFilters, hasTechFilters, sortBy]);

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
        <div className="flex-1 flex items-center justify-center p-12">
          <p className="text-stone-400 font-medium animate-pulse text-sm">Carregando vitrine...</p>
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
          <div className="max-w-md bg-white p-8 rounded-2xl border border-rose-200 text-center shadow-sm space-y-3">
            <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Vitrine Não Encontrada</h2>
            <p className="text-xs text-slate-500">
              Não foi possível encontrar a configuração para a vitrine informada.
            </p>
          </div>
        </div>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <StoreHeader />

      <main className="flex-1">
        {/* ==================================================================
            SEGMENT HERO & SPECIALIZED EDITORIAL SECTIONS
            ================================================================== */}
        {isFashion && (
          <>
            <FashionHero onScrollToCatalog={scrollToCatalog} />
            <FashionSecondaryFeature onSelectCategory={handleSelectCategory} />
            <FashionCategoriesSection onSelectCategory={handleSelectCategory} />
          </>
        )}

        {isTech && (
          <>
            <TechHero
              onScrollToCatalog={scrollToCatalog}
            />
            <TechCategoryTiles onSelectCategory={handleSelectCategory} />
            {hasComparison && (
              <TechComparatorCallout onOpenCompare={() => setIsCompareModalOpen(true)} />
            )}
          </>
        )}

        {isBooks && (
          <>
            <BooksHero onScrollToCatalog={scrollToCatalog} />
            <BooksCollectionsSection onSelectCategory={handleSelectCategory} />
            <BooksAuthorFeature onSelectCategory={handleSelectCategory} />
            <BooksGenreBar selectedGenre={selectedGenre} onSelectGenre={handleSelectGenre} />
          </>
        )}

        {/* ==================================================================
            COMMON SECTIONS: RECOMMENDATIONS & RECENTLY VIEWED
            ================================================================== */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {hasFeature('recommendations') && (
            <RecommendationCarousel
              storeId={manifest.store_id}
              storeSlug={manifest.store_slug}
              primaryColor={primaryColor}
            />
          )}

          {hasFeature('recently_viewed') && (
            <RecentlyViewedSection
              storeId={manifest.store_id}
              storeSlug={manifest.store_slug}
              primaryColor={primaryColor}
            />
          )}

          {/* ================================================================
              MAIN CATALOG SECTION
              ================================================================ */}
          <section ref={catalogRef} id="catalogo" className="pt-4 space-y-6 scroll-mt-24">
            {/* Catalog Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-stone-200/80 pb-4 gap-4">
              <div>
                <h2 className={`text-2xl sm:text-3xl tracking-tight text-slate-900 ${isBooks ? 'font-serif font-normal' : isFashion ? 'font-light uppercase tracking-wider' : 'font-extrabold'}`}>
                  {selectedCategory ? `${selectedCategory}` : selectedGenre ? `${selectedGenre}` : querySearch ? `Busca: "${querySearch}"` : 'Catálogo Completo'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {filteredProducts.length === products.length
                    ? `${products.length} itens disponíveis`
                    : `Exibindo ${filteredProducts.length} de ${products.length} itens`}
                </p>
              </div>

              {/* Active Filters Pill / Reset */}
              <div className="flex flex-wrap items-center gap-3">
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-800 font-medium">
                    <span>{selectedCategory}</span>
                    <button
                      onClick={() => handleSelectCategory(null)}
                      className="hover:text-rose-600"
                      title="Remover filtro"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}

                {selectedGenre && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-800 font-medium">
                    <span>{selectedGenre}</span>
                    <button
                      onClick={() => handleSelectGenre(null)}
                      className="hover:text-rose-600"
                      title="Remover gênero"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}

                {(selectedCategory || selectedGenre || Object.keys(selectedTechFilters).length > 0) && (
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline px-1"
                  >
                    Catálogo completo
                  </button>
                )}

                {/* Sort selector */}
                <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none"
                  >
                    <option value="featured">Destaques</option>
                    <option value="price-asc">Menor Preço</option>
                    <option value="price-desc">Maior Preço</option>
                  </select>
                </div>

                {hasComparison && selectedForCompare.length >= 2 && (
                  <button
                    onClick={() => setIsCompareModalOpen(true)}
                    className="px-4 py-2 rounded-md bg-[#155EEF] text-white font-bold text-xs shadow hover:bg-[#124CC4] flex items-center gap-1.5"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Comparar ({selectedForCompare.length})
                  </button>
                )}
              </div>
            </div>

            {/* Catalog Grid */}
            {loadingProducts ? (
              <div className="py-24 text-center text-xs text-slate-400">
                Carregando catálogo de produtos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-16 text-center rounded-xl border border-dashed border-slate-300 bg-white space-y-3">
                <p className="text-sm text-slate-700 font-semibold">
                  {querySearch
                    ? `Nenhum produto encontrado para a busca "${querySearch}".`
                    : 'Nenhum produto encontrado com os filtros selecionados.'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Tente buscar por outros termos, autores ou categorias, ou limpe os filtros para visualizar a coleção completa.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleClearAllFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Ver catálogo completo
                  </button>
                </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
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
        </div>
      </main>

      {/* Stock Alert Modal */}
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
