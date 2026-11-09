import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check, Ruler, BookOpen, Bell } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { FashionVariantSelector } from './extensions/FashionVariantSelector';
import { TechnicalSpecificationsTable } from './extensions/TechnicalSpecificationsTable';
import { BookMetadataPanel } from './extensions/BookMetadataPanel';
import { FavoriteHeartButton } from './extensions/FavoriteHeartButton';
import { FashionSizeGuideModal } from './extensions/FashionSizeGuideModal';
import { BookPreviewModal } from './extensions/BookPreviewModal';
import { BackInStockAlertModal } from './extensions/BackInStockAlertModal';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  storeId: string;
  storeSlug?: string;
  segment: string;
  primaryColor: string;
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
      // Error handled in CartContext
    } finally {
      setIsAdding(false);
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const renderStockStatus = () => {
    const qty = selectedVariant?.stock_quantity ?? product.stock_quantity;
    if (qty <= 0) {
      return (
        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
          Indisponível
        </span>
      );
    }
    if (qty <= 5) {
      return (
        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
          Últimas {qty} unidades
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        Em estoque
      </span>
    );
  };

  const isFashion = segment === 'FASHION';
  const isTech = segment === 'TECH';
  const isBooks = segment === 'BOOKS';

  // Different image aspect ratios for different segments:
  // Fashion: taller 3:4 portrait
  // Tech: 16:10 or 4:3
  // Books: 2:3 book cover
  const imageAspect = isFashion ? 'aspect-[3/4]' : isBooks ? 'aspect-[2/3] max-h-64 mx-auto' : 'aspect-[4/3]';

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between group ${
        isSelectedForCompare
          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-lg'
      }`}
    >
      <div>
        {/* Product Image Area */}
        <div className="relative bg-slate-100 overflow-hidden">
          <Link
            to={`/loja/${storeSlug || storeId}/produto/${product.id}`}
            className="block overflow-hidden"
          >
            <div className={`${imageAspect} w-full overflow-hidden flex items-center justify-center`}>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  Sem imagem
                </div>
              )}
            </div>
          </Link>

          {/* Floating Actions: Category badge & Favorite Button */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md shadow-sm border border-slate-100 pointer-events-auto">
              {product.category}
            </span>

            <div className="pointer-events-auto">
              <FavoriteHeartButton
                productId={product.id}
                storeId={storeId}
                isFeatureEnabled={hasFavorites}
              />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3">
          <div>
            <Link
              to={`/loja/${storeSlug || storeId}/produto/${product.id}`}
              className="block group/title"
            >
              <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover/title:text-indigo-600 transition-colors leading-snug line-clamp-2">
                {product.title}
              </h3>
            </Link>
            {product.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Price & Action links */}
          <div className="pt-1 flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatBRL(product.price)}
            </span>

            {isFashion && hasFeature('fashion_size_guide') && (
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 underline underline-offset-2 transition-colors"
                title="Visualizar tabela de medidas"
              >
                <Ruler className="w-3 h-3" />
                <span>Guia de Medidas</span>
              </button>
            )}

            {isBooks && hasFeature('book_preview') && product.preview_content && (
              <button
                type="button"
                onClick={() => setShowBookPreview(true)}
                className="text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                title="Ler prévia dos primeiros capítulos"
              >
                <BookOpen className="w-3 h-3 text-amber-700" />
                <span>Ler Amostra</span>
              </button>
            )}
          </div>

          {/* Commercial Variant / Metadata Extensions */}
          {isFashion && product.variants && product.variants.length > 0 && (
            <FashionVariantSelector
              variants={product.variants}
              hasSizeGrid={hasFeature('size_grid')}
              hasColorVariants={hasFeature('color_variants')}
              hasSkuDisplay={hasFeature('variant_sku')}
              onVariantSelected={setSelectedVariant}
            />
          )}

          {isTech && product.attributes && product.attributes.length > 0 && (
            <TechnicalSpecificationsTable
              attributes={product.attributes}
              hasWarrantyInfo={hasFeature('warranty_info')}
            />
          )}

          {isBooks && product.attributes && product.attributes.length > 0 && (
            <BookMetadataPanel attributes={product.attributes} />
          )}
        </div>
      </div>

      {/* Footer: Stock indicator & Commercial Action Buttons */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {renderStockStatus()}

          {hasComparison && onToggleCompare && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer ml-1 select-none hover:text-slate-900">
              <input
                type="checkbox"
                checked={isSelectedForCompare}
                onChange={onToggleCompare}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span className="hidden sm:inline">Comparar</span>
            </label>
          )}
        </div>

        {isOutOfStock && hasFeature('back_in_stock_alert') ? (
          <button
            type="button"
            onClick={() => setShowStockAlert(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-xs"
            title="Receber aviso por e-mail quando este item voltar ao estoque"
          >
            <Bell className="w-3.5 h-3.5 text-amber-700" />
            <span>Avise-me</span>
          </button>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${
              justAdded
                ? 'bg-emerald-600 text-white'
                : 'text-white hover:opacity-95'
            }`}
            style={!justAdded ? { backgroundColor: primaryColor } : undefined}
            title="Adicionar produto ao carrinho"
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Adicionado</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

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
    </div>
  );
};
