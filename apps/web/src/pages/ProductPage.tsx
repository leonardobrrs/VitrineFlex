import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  ShoppingBag,
  Check,
  ShieldAlert,
  ArrowLeft,
  Ruler,
  BookOpen,
  Bell,
  Scale,
  Minus,
  Plus,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { Product, ProductVariant } from '../types';
import { api } from '../services/api';
import { FavoriteHeartButton } from '../components/extensions/FavoriteHeartButton';
import { FashionVariantSelector } from '../components/extensions/FashionVariantSelector';
import { TechnicalSpecificationsTable } from '../components/extensions/TechnicalSpecificationsTable';
import { BookMetadataPanel } from '../components/extensions/BookMetadataPanel';
import { FashionSizeGuideModal } from '../components/extensions/FashionSizeGuideModal';
import { BookPreviewModal } from '../components/extensions/BookPreviewModal';
import { BackInStockAlertModal } from '../components/extensions/BackInStockAlertModal';
import { ProductComparisonModal } from '../components/extensions/ProductComparisonModal';
import { RecommendationCarousel } from '../components/RecommendationCarousel';
import { RecentlyViewedSection } from '../components/RecentlyViewedSection';

export const ProductPage: React.FC = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const location = useLocation();
  const { manifest, loading: loadingStore, loadStoreBySlug, hasFeature } = useStore();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [productNotFound, setProductNotFound] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  // Modals state
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showBookPreview, setShowBookPreview] = useState(false);
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Button feedback state
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Load store manifest if not loaded
  useEffect(() => {
    if (slug) {
      loadStoreBySlug(slug);
    }
  }, [slug]);

  // Load product once store manifest is loaded
  useEffect(() => {
    if (!manifest?.store_id || !productId) return;

    let isMounted = true;
    const fetchProduct = async () => {
      setLoadingProduct(true);
      setProductNotFound(false);
      try {
        const resp = await api.get<Product>(
          `/api/v1/catalog/stores/${manifest.store_id}/products/${productId}`
        );
        if (isMounted && resp.data) {
          setProduct(resp.data);
          setSelectedVariant(resp.data.variants?.[0]);
          setQuantity(1);
        }
      } catch (err: any) {
        if (isMounted) {
          if (err.response?.status === 404) {
            setProductNotFound(true);
          } else {
            console.error('Erro ao buscar produto:', err);
            setProductNotFound(true);
          }
        }
      } finally {
        if (isMounted) setLoadingProduct(false);
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [manifest?.store_id, productId]);

  // Reopen stock alert modal if returning from login with redirect context
  useEffect(() => {
    const alertState = (location.state as any)?.openStockAlert;
    if (alertState && product && alertState.productId === product.id) {
      setShowStockAlert(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, product]);

  // Record genuine VIEW interaction when entering the product page
  const viewRecordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!product || !manifest?.store_id) return;
    if (viewRecordedRef.current === product.id) return;

    viewRecordedRef.current = product.id;

    // Resolve or generate visitor ID for guest tracking
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = `vis-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('visitor_id', visitorId);
    }

    const effectiveUserId = user?.id || visitorId;

    api.post('/api/v1/recommendations/interactions', {
      store_id: manifest.store_id,
      product_id: product.id,
      category: product.category,
      user_id: effectiveUserId,
      event_type: 'VIEW',
    }).catch(() => {});
  }, [product, manifest?.store_id, user]);

  if (loadingStore || loadingProduct) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/60">
        <StoreHeader />
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex items-center justify-center">
          <p className="text-slate-500 font-medium animate-pulse text-sm">Carregando detalhes do produto...</p>
        </div>
        <StoreFooter />
      </div>
    );
  }

  if (productNotFound || !product || !manifest) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/60">
        <StoreHeader />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex items-center justify-center">
          <div className="max-w-md bg-white p-8 rounded-3xl border border-rose-200 text-center shadow-sm space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Produto Não Encontrado</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                O produto solicitado não existe ou não pertence ao catálogo da vitrine {manifest?.store_name || 'atual'}.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to={`/loja/${slug || manifest?.store_slug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Catálogo</span>
              </Link>
            </div>
          </div>
        </main>
        <StoreFooter />
      </div>
    );
  }

  const primaryColor = manifest.theme?.primary_color || '#0f172a';
  const isFashion = manifest.segment === 'FASHION';
  const isTech = manifest.segment === 'TECH';
  const isBooks = manifest.segment === 'BOOKS';

  const currentStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const isOutOfStock = currentStock <= 0;

  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    try {
      await addItem(product.id, selectedVariant?.id, quantity, {
        title: product.title,
        price: product.price,
        image_url: product.image_url,
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    } catch {
      // Handled
    } finally {
      setIsAdding(false);
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const imageAspect = isFashion ? 'aspect-[3/4]' : isBooks ? 'aspect-[2/3] max-h-[500px]' : 'aspect-[4/3]';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60">
      <StoreHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-slate-900 transition-colors">
            Início
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <Link to={`/loja/${manifest.store_slug}`} className="hover:text-slate-900 transition-colors">
            {manifest.store_name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-600 font-medium">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-900 font-bold truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Main Product Showcase Grid */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Left Column: Product Image */}
          <div className="space-y-4">
            <div className={`relative ${imageAspect} w-full rounded-2xl bg-slate-100 overflow-hidden border border-slate-200/80 flex items-center justify-center`}>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-400 text-sm">Sem imagem disponível</div>
              )}

              {/* Badges on image */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-white/95 backdrop-blur-md px-3 py-1 rounded-lg shadow-sm border border-slate-100 pointer-events-auto">
                  {product.category}
                </span>

                <div className="pointer-events-auto">
                  <FavoriteHeartButton
                    productId={product.id}
                    storeId={manifest.store_id}
                    isFeatureEnabled={hasFeature('favorites')}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions under Image (Segment Extensions) */}
            <div className="flex flex-wrap items-center gap-3">
              {isFashion && hasFeature('fashion_size_guide') && (
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Ruler className="w-3.5 h-3.5 text-slate-600" />
                  <span>Guia de Medidas</span>
                </button>
              )}

              {isBooks && hasFeature('book_preview') && product.preview_content && (
                <button
                  type="button"
                  onClick={() => setShowBookPreview(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ler Amostra do Livro</span>
                </button>
              )}

              {isTech && hasFeature('product_comparison') && (
                <button
                  type="button"
                  onClick={() => setShowCompareModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-colors flex items-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Comparar Especificações</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Title, Price, Variants, Actions & Description */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  {manifest.store_name}
                </span>
                <span>•</span>
                <span className="text-xs font-semibold text-slate-500">{product.category}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                {product.title}
              </h1>
            </div>

            {/* Price & Stock status */}
            <div className="flex items-baseline gap-4 pt-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {formatBRL(product.price)}
              </span>

              {isOutOfStock ? (
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  Esgotado
                </span>
              ) : currentStock <= 5 ? (
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Últimas {currentStock} unidades
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Em estoque
                </span>
              )}
            </div>

            {/* Fashion Variants Extension */}
            {isFashion && product.variants && product.variants.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <FashionVariantSelector
                  variants={product.variants}
                  hasSizeGrid={hasFeature('size_grid')}
                  hasColorVariants={hasFeature('color_variants')}
                  hasSkuDisplay={hasFeature('variant_sku')}
                  onVariantSelected={setSelectedVariant}
                />
              </div>
            )}

            {/* Quantity Selector & Purchase Action */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Quantity */}
                {!isOutOfStock && (
                  <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50/70 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="p-2 rounded-xl text-slate-600 hover:bg-white hover:shadow-2xs disabled:opacity-40 transition-all"
                      title="Diminuir quantidade"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 text-xs font-bold text-slate-900 min-w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                      disabled={quantity >= currentStock}
                      className="p-2 rounded-xl text-slate-600 hover:bg-white hover:shadow-2xs disabled:opacity-40 transition-all"
                      title="Aumentar quantidade"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Primary CTA */}
                {isOutOfStock ? (
                  hasFeature('back_in_stock_alert') ? (
                    <button
                      type="button"
                      onClick={() => setShowStockAlert(true)}
                      className="flex-1 py-3.5 px-6 rounded-2xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Bell className="w-4 h-4 text-amber-700" />
                      <span>Avise-me quando chegar</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-3.5 px-6 rounded-2xl text-xs font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
                    >
                      Produto Indisponível
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className={`flex-1 py-3.5 px-6 rounded-2xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 ${
                      justAdded ? 'bg-emerald-600' : 'hover:opacity-95'
                    }`}
                    style={!justAdded ? { backgroundColor: primaryColor } : undefined}
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Adicionado ao Carrinho!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Adicionar ao Carrinho</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sobre este item
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {product.description || 'Nenhuma descrição detalhada disponível.'}
              </p>
            </div>

            {/* Books Metadata Extension */}
            {isBooks && product.attributes && product.attributes.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <BookMetadataPanel attributes={product.attributes} />
              </div>
            )}

            {/* Tech Specifications Extension */}
            {isTech && product.attributes && product.attributes.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <TechnicalSpecificationsTable
                  attributes={product.attributes}
                  hasWarrantyInfo={hasFeature('warranty_info')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Supplementary Section: Recommendations */}
        {hasFeature('recommendations') && (
          <RecommendationCarousel
            storeId={manifest.store_id}
            storeSlug={manifest.store_slug}
            primaryColor={primaryColor}
          />
        )}

        {/* Supplementary Section: Recently Viewed Products */}
        {hasFeature('recently_viewed') && (
          <RecentlyViewedSection
            storeId={manifest.store_id}
            storeSlug={manifest.store_slug}
            primaryColor={primaryColor}
          />
        )}
      </main>

      {/* Extension Modals */}
      {showSizeGuide && (
        <FashionSizeGuideModal
          isOpen={showSizeGuide}
          onClose={() => setShowSizeGuide(false)}
          primaryColor={primaryColor}
        />
      )}

      {showBookPreview && (
        <BookPreviewModal
          product={product}
          isOpen={showBookPreview}
          onClose={() => setShowBookPreview(false)}
          primaryColor={primaryColor}
        />
      )}

      {showStockAlert && (
        <BackInStockAlertModal
          product={product}
          variant={selectedVariant}
          isOpen={showStockAlert}
          onClose={() => setShowStockAlert(false)}
          primaryColor={primaryColor}
        />
      )}

      {showCompareModal && (
        <ProductComparisonModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          storeId={manifest.store_id}
          selectedProductIds={[product.id]}
        />
      )}

      <StoreFooter />
    </div>
  );
};
