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
  ShieldCheck,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { Product, ProductVariant } from '../types';
import { api } from '../services/api';
import { resolveStoreTheme, applyStoreTheme } from '../services/theme';
import { FavoriteHeartButton } from '../components/extensions/FavoriteHeartButton';
import { FashionVariantSelector } from '../components/extensions/FashionVariantSelector';
import { TechnicalSpecificationsTable } from '../components/extensions/TechnicalSpecificationsTable';
import { BookMetadataPanel } from '../components/extensions/BookMetadataPanel';
import { ProductImage } from '../components/ProductImage';
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

  // Set theme immediately based on slug or segment
  useEffect(() => {
    if (slug) {
      const theme = resolveStoreTheme(slug);
      applyStoreTheme(theme);
    }
  }, [slug]);

  // Load store manifest if not loaded
  useEffect(() => {
    if (slug) {
      loadStoreBySlug(slug);
    }
  }, [slug]);

  // Ensure theme sync when manifest loads
  useEffect(() => {
    if (manifest?.segment) {
      const theme = resolveStoreTheme(manifest.segment);
      applyStoreTheme(theme);
    }
  }, [manifest?.segment]);

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
      <div className="flex flex-col min-h-screen bg-theme-bg">
        <StoreHeader />
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-theme-muted font-medium text-xs">Carregando detalhes do produto...</p>
          </div>
        </div>
        <StoreFooter />
      </div>
    );
  }

  if (productNotFound || !product || !manifest) {
    return (
      <div className="flex flex-col min-h-screen bg-theme-bg">
        <StoreHeader />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex items-center justify-center">
          <div className="max-w-md bg-theme-surface p-8 rounded-2xl border border-rose-200 text-center shadow-sm space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-theme-text">Produto Não Encontrado</h2>
              <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                O produto solicitado não existe ou não pertence ao catálogo da vitrine {manifest?.store_name || 'atual'}.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to={`/loja/${slug || manifest?.store_slug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-theme-primary hover:opacity-90 transition-opacity shadow-sm"
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

  // Segment-specific image container aspect ratios
  const imageAspect = isFashion ? 'aspect-[3/4] max-h-[600px]' : isBooks ? 'aspect-[2/3] max-h-[520px]' : 'aspect-square max-h-[480px]';

  return (
    <div className="flex flex-col min-h-screen bg-theme-bg">
      <StoreHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-theme-muted overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-theme-text transition-colors">
            Início
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <Link to={`/loja/${manifest.store_slug}`} className="hover:text-theme-text transition-colors">
            {manifest.store_name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <span className="font-medium text-theme-muted">{product.category}</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <span className="text-theme-text font-bold truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Main Product Showcase Grid */}
        <div className={`p-6 sm:p-10 border transition-all grid grid-cols-1 lg:grid-cols-2 gap-10 items-start ${
          isFashion
            ? 'bg-[#FBF9F6] border-[#E8E4DD] rounded-2xl shadow-xs'
            : isBooks
            ? 'bg-[#FAF7F0] border-[#E4DDD0] rounded-2xl shadow-xs'
            : 'bg-white border-[#E4E7EC] rounded-2xl shadow-xs'
        }`}>
          {/* Left Column: Product Image */}
          <div className="space-y-4">
            <div className={`relative ${imageAspect} w-full mx-auto overflow-hidden flex items-center justify-center ${
              isFashion
                ? 'rounded-xl bg-[#F0EDE8] border border-[#E5E0D8]'
                : isBooks
                ? 'rounded-lg bg-[#ECE6D9] p-4 shadow-md'
                : 'rounded-xl bg-white border border-[#E4E7EC] p-4'
            }`}>
              <ProductImage
                src={product.image_url}
                alt={product.title}
                theme={manifest.segment.toLowerCase()}
                aspect={isFashion ? 'fashion' : isBooks ? 'books' : 'tech'}
                title={product.title}
                className={`w-full h-full ${
                  isFashion
                    ? 'object-cover'
                    : isBooks
                    ? 'object-contain shadow-lg rounded-sm ring-1 ring-black/10'
                    : 'object-contain p-2'
                }`}
              />

              {/* Badges on image */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className={`text-[11px] font-bold tracking-wider px-3 py-1 rounded-md shadow-xs pointer-events-auto ${
                  isFashion
                    ? 'bg-white/95 text-slate-800 uppercase tracking-widest text-[10px]'
                    : isBooks
                    ? 'bg-[#284B3B] text-white uppercase text-[10px]'
                    : 'bg-[#155EEF] text-white uppercase text-[10px]'
                }`}>
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
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {isFashion && hasFeature('fashion_size_guide') && (
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-slate-800 bg-[#F0EDE8] hover:bg-[#E5E0D8] border border-[#DDD6CC] transition-colors flex items-center gap-1.5"
                >
                  <Ruler className="w-3.5 h-3.5 text-slate-700" />
                  <span>Tabela de Medidas</span>
                </button>
              )}

              {isBooks && hasFeature('book_preview') && product.preview_content && (
                <button
                  type="button"
                  onClick={() => setShowBookPreview(true)}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-[#284B3B] bg-[#E8EFEA] hover:bg-[#D5E3D8] border border-[#C5D8C9] transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#284B3B]" />
                  <span>Degustação / Ler Amostra</span>
                </button>
              )}

              {isTech && hasFeature('product_comparison') && (
                <button
                  type="button"
                  onClick={() => setShowCompareModal(true)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#155EEF] bg-[#EFF4FF] hover:bg-[#D1E0FF] border border-[#B2CCFF] transition-colors flex items-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5 text-[#155EEF]" />
                  <span>Comparar Especificações</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Title, Price, Variants, Actions & Description */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isFashion ? 'text-slate-400 tracking-widest text-[10px]' : isBooks ? 'text-[#743A3F]' : 'text-[#155EEF]'
                }`}>
                  {manifest.store_name}
                </span>
                <span className="text-theme-border">•</span>
                <span className="text-xs font-medium text-theme-muted">{product.category}</span>
              </div>
              <h1 className={`font-black text-theme-text tracking-tight leading-snug ${
                isFashion ? 'text-2xl sm:text-3xl font-serif' : 'text-2xl sm:text-3xl'
              }`}>
                {product.title}
              </h1>
            </div>

            {/* Price & Stock status */}
            <div className="flex items-baseline gap-4 pt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-theme-text tracking-tight">
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
              <div className="pt-2 border-t border-[#E8E4DD]">
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
            <div className="pt-4 border-t border-theme-border space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Quantity */}
                {!isOutOfStock && (
                  <div className="flex items-center border border-theme-border rounded-lg bg-theme-surface p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="p-2 rounded-md text-theme-muted hover:bg-black/5 disabled:opacity-40 transition-all"
                      title="Diminuir quantidade"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 text-xs font-bold text-theme-text min-w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                      disabled={quantity >= currentStock}
                      className="p-2 rounded-md text-theme-muted hover:bg-black/5 disabled:opacity-40 transition-all"
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
                      className="flex-1 py-3.5 px-6 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Bell className="w-4 h-4 text-amber-700" />
                      <span>Avise-me quando chegar</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-3.5 px-6 rounded-lg text-xs font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
                    >
                      Produto Indisponível
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className={`flex-1 py-3.5 px-6 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-xs active:scale-98 ${
                      justAdded
                        ? 'bg-emerald-600'
                        : isFashion
                        ? 'bg-slate-900 hover:bg-black'
                        : isBooks
                        ? 'bg-[#284B3B] hover:bg-[#1E372B]'
                        : 'bg-[#155EEF] hover:bg-[#1048B8]'
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Adicionado à Sacola!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>{isFashion ? 'Adicionar à Sacola' : isBooks ? 'Comprar Livro' : 'Adicionar ao Carrinho'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-3 text-[11px] text-theme-muted border-t border-theme-border/60">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 opacity-70" />
                  <span>Envio Rápido</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 opacity-70" />
                  <span>Compra Segura</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 opacity-70" />
                  <span>Troca Fácil</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-theme-border space-y-2">
              <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider">
                {isBooks ? 'Sinopse & Apresentação' : isTech ? 'Visão Geral do Produto' : 'Detalhes da Peça'}
              </h3>
              <p className="text-xs text-theme-muted leading-relaxed">
                {product.description || 'Nenhuma descrição detalhada disponível.'}
              </p>
            </div>

            {/* Books Metadata Extension */}
            {isBooks && product.attributes && product.attributes.length > 0 && (
              <div className="pt-4 border-t border-[#E4DDD0]">
                <BookMetadataPanel attributes={product.attributes} />
              </div>
            )}

            {/* Tech Specifications Extension */}
            {isTech && product.attributes && product.attributes.length > 0 && (
              <div className="pt-4 border-t border-[#E4E7EC]">
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
