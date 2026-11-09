import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  ShoppingCart,
  Check,
  BookOpen,
  Bell,
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { FashionVariantSelector } from './extensions/FashionVariantSelector';
import { FavoriteHeartButton } from './extensions/FavoriteHeartButton';
import { FashionSizeGuideModal } from './extensions/FashionSizeGuideModal';
import { BookPreviewModal } from './extensions/BookPreviewModal';
import { BackInStockAlertModal } from './extensions/BackInStockAlertModal';
import { useCart } from '../context/CartContext';
import { resolveStoreTheme, StoreTheme } from '../services/theme';

interface ProductCardProps {
  product: Product;
  storeId: string;
  storeSlug?: string;
  segment: string;
  primaryColor?: string;
  hasFavorites: boolean;
  hasComparison?: boolean;
  isSelectedForCompare?: boolean;
  onToggleCompare?: () => void;
  hasFeature: (name: string) => boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  storeId,
  storeSlug,
  segment,
  primaryColor,
  hasFavorites,
  hasComparison,
  isSelectedForCompare,
  onToggleCompare,
  hasFeature,
}) => {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  );
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showBookPreview, setShowBookPreview] = useState(false);
  const [showStockAlert, setShowStockAlert] = useState(false);

  const currentStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const isOutOfStock = currentStock <= 0;

  const currentTheme: StoreTheme = resolveStoreTheme(segment || storeSlug);
  const isFashion = currentTheme === 'fashion';
  const isTech = currentTheme === 'tech';
  const isBooks = currentTheme === 'books';

  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    try {
      await addItem(product.id, selectedVariant?.id, 1, {
        title: product.title,
        price: product.price,
        image_url: product.image_url,
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1600);
    } catch {
      // Handled in CartContext
    } finally {
      setIsAdding(false);
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const productDetailPath = `/loja/${storeSlug || 'vitrine-moda'}/produto/${product.id}`;

  // Extract author if books
  const authorAttr = product.attributes?.find((a) => a.name.toLowerCase() === 'autor')?.value;

  // Extract key technical spec summary if tech
  const techSpecsSummary = product.attributes
    ?.slice(0, 3)
    .map((a) => a.value)
    .join(' · ');

  return (
    <>
      {/* --------------------------------------------------------------------
          1. CARD: VITRINE MODA (Editorial, 3:4 portrait, clean minimal text)
          -------------------------------------------------------------------- */}
      {isFashion && (
        <div className="group relative flex flex-col bg-white border border-[#DED9D1]/80 hover:border-[#191918]/60 transition-all duration-300">
          {/* Image 3:4 */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#ECE8E1]">
            <Link to={productDetailPath} className="block w-full h-full">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                  Sem foto
                </div>
              )}
            </Link>

            {/* Favorite button */}
            {hasFavorites && (
              <div className="absolute top-2.5 right-2.5 z-10">
                <FavoriteHeartButton
                  storeId={storeId}
                  productId={product.id}
                />
              </div>
            )}

            {/* Out of stock badge */}
            {isOutOfStock && (
              <div className="absolute top-2.5 left-2.5 bg-[#191918]/90 text-white text-[10px] font-medium tracking-widest uppercase px-2 py-0.5">
                Esgotado
              </div>
            )}

            {/* Quick add button on hover */}
            {!isOutOfStock && (
              <button
                onClick={handleAddToCart}
                disabled={isAdding}
                className="absolute bottom-2.5 inset-x-2.5 bg-white/95 hover:bg-black text-[#191918] hover:text-white text-xs font-semibold py-2.5 tracking-wider uppercase transition-colors shadow-sm opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5"
              >
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Adicionado</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Adicionar à Sacola</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Details */}
          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#69655F] block mb-0.5">
                {product.category || 'Atelier'}
              </span>
              <Link to={productDetailPath}>
                <h3 className="text-xs sm:text-sm font-medium text-[#191918] line-clamp-1 hover:text-stone-600 transition">
                  {product.title}
                </h3>
              </Link>
            </div>

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && hasFeature('color_size_variants') && (
              <div className="pt-1">
                <FashionVariantSelector
                  variants={product.variants}
                  onVariantSelected={setSelectedVariant}
                />
              </div>
            )}

            {/* Price & Actions */}
            <div className="pt-1 flex items-center justify-between border-t border-[#DED9D1]/50">
              <span className="text-xs sm:text-sm font-semibold text-[#191918]">
                {formatBRL(product.price)}
              </span>

              {isOutOfStock && hasFeature('back_in_stock_alert') && (
                <button
                  type="button"
                  onClick={() => setShowStockAlert(true)}
                  className="text-[10px] text-stone-800 underline font-medium hover:text-stone-600 flex items-center gap-1"
                >
                  <Bell className="w-3 h-3" />
                  <span>Avise-me</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          2. CARD: VITRINE TECH (Modern Tech, Clean isolate, Key specs, Blue action)
          -------------------------------------------------------------------- */}
      {isTech && (
        <div className="group relative flex flex-col bg-white border border-[#DDE1E5] rounded-lg hover:border-[#155EEF]/70 hover:shadow-md transition-all duration-300">
          {/* Top Header: Compare Checkbox & Favorite */}
          <div className="p-2.5 pb-0 flex items-center justify-between">
            {hasComparison && onToggleCompare ? (
              <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#626B75] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSelectedForCompare}
                  onChange={onToggleCompare}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#155EEF] focus:ring-[#155EEF]"
                />
                <span className="text-[10px] tracking-tight">Comparar</span>
              </label>
            ) : <div />}

            {hasFavorites && (
              <FavoriteHeartButton
                storeId={storeId}
                productId={product.id}
              />
            )}
          </div>

          {/* Product Image: Clean 1:1 Isolate */}
          <div className="relative aspect-square w-full p-4 overflow-hidden bg-white">
            <Link to={productDetailPath} className="block w-full h-full flex items-center justify-center">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                  Sem foto
                </div>
              )}
            </Link>

            {isOutOfStock && (
              <div className="absolute top-2 left-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                Esgotado
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-3.5 pt-0 flex-1 flex flex-col justify-between space-y-2">
            <div>
              <Link to={productDetailPath}>
                <h3 className="text-xs sm:text-sm font-bold text-[#15181B] line-clamp-1 hover:text-[#155EEF] transition">
                  {product.title}
                </h3>
              </Link>

              {/* Technical specs highlight pill */}
              {techSpecsSummary && (
                <p className="text-[11px] text-[#626B75] line-clamp-1 mt-0.5">
                  {techSpecsSummary}
                </p>
              )}
            </div>

            {/* Price & Commercial Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-sm sm:text-base font-extrabold text-[#15181B] block">
                  {formatBRL(product.price)}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  Em até 12x sem juros
                </span>
              </div>

              {isOutOfStock ? (
                hasFeature('back_in_stock_alert') ? (
                  <button
                    type="button"
                    onClick={() => setShowStockAlert(true)}
                    className="p-2 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1 border border-amber-200"
                    title="Avise-me quando repor estoque"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                ) : null
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="p-2 sm:px-3 sm:py-2 rounded-md bg-[#155EEF] hover:bg-[#124CC4] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  title="Adicionar ao Carrinho"
                >
                  {justAdded ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Comprar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          3. CARD: VITRINE BOOKS (Editorial, 2:3 Cover Aspect, Author, Paper Feel)
          -------------------------------------------------------------------- */}
      {isBooks && (
        <div className="group relative flex flex-col bg-[#FBF8F1] border border-[#DED2C1] rounded-md hover:border-[#284B3B] hover:shadow-lg transition-all duration-300">
          {/* Top Actions: Favorite & Preview */}
          <div className="p-2.5 pb-0 flex items-center justify-between">
            {hasFeature('reading_preview') && product.preview_content ? (
              <button
                type="button"
                onClick={() => setShowBookPreview(true)}
                className="text-[10px] font-semibold text-[#284B3B] hover:underline flex items-center gap-1"
                title="Ler prévia do capítulo"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Prévia</span>
              </button>
            ) : <div />}

            {hasFavorites && (
              <FavoriteHeartButton
                storeId={storeId}
                productId={product.id}
              />
            )}
          </div>

          {/* Book Cover 2:3 */}
          <div className="relative aspect-[2/3] w-full p-4 overflow-hidden flex items-center justify-center">
            <Link to={productDetailPath} className="block h-full max-w-full">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-full object-contain shadow-md rounded-sm group-hover:scale-105 group-hover:shadow-xl transition-all duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="h-full aspect-[2/3] bg-[#EEE5D8] flex items-center justify-center text-stone-400 text-xs border border-[#DED2C1]">
                  Sem capa
                </div>
              )}
            </Link>

            {isOutOfStock && (
              <div className="absolute top-2 left-2 bg-[#743A3F] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                Esgotado
              </div>
            )}
          </div>

          {/* Book Details */}
          <div className="p-3.5 pt-0 flex-1 flex flex-col justify-between space-y-2">
            <div>
              <Link to={productDetailPath}>
                <h3 className="text-xs sm:text-sm font-semibold text-[#211C18] line-clamp-1 hover:text-[#284B3B] transition">
                  {product.title}
                </h3>
              </Link>
              {authorAttr ? (
                <p className="text-[11px] text-[#685A4F] italic line-clamp-1 mt-0.5">
                  {authorAttr}
                </p>
              ) : (
                <p className="text-[11px] text-[#685A4F] line-clamp-1 mt-0.5">
                  {product.category || 'Literatura'}
                </p>
              )}
            </div>

            {/* Price & Commercial Action */}
            <div className="pt-2 border-t border-[#DED2C1]/60 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-[#211C18]">
                {formatBRL(product.price)}
              </span>

              {isOutOfStock ? (
                hasFeature('back_in_stock_alert') ? (
                  <button
                    type="button"
                    onClick={() => setShowStockAlert(true)}
                    className="p-1.5 text-xs text-[#743A3F] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Avise-me</span>
                  </button>
                ) : null
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="px-3 py-1.5 rounded bg-[#284B3B] hover:bg-[#1F3C2F] text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                  title="Comprar Livro"
                >
                  {justAdded ? (
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Comprar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          4. FALLBACK / NEUTRAL CARD
          -------------------------------------------------------------------- */}
      {!isFashion && !isTech && !isBooks && (
        <div className="group relative flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition">
          <div className="relative aspect-square w-full bg-slate-100">
            <Link to={productDetailPath}>
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
            </Link>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <Link to={productDetailPath}>
              <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{product.title}</h3>
            </Link>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-extrabold text-slate-900">{formatBRL(product.price)}</span>
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Comprar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals associated with card */}
      {showSizeGuide && hasFeature('fashion_size_guide') && (
        <FashionSizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
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
    </>
  );
};
