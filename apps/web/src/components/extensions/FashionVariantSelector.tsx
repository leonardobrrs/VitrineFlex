import React, { useState, useEffect } from 'react';
import { ProductVariant } from '../../types';

interface FashionVariantSelectorProps {
  variants: ProductVariant[];
  hasSizeGrid?: boolean;
  hasColorVariants?: boolean;
  hasSkuDisplay?: boolean;
  onVariantSelected?: (variant: ProductVariant) => void;
}

export const FashionVariantSelector: React.FC<FashionVariantSelectorProps> = ({
  variants,
  hasSizeGrid = true,
  hasColorVariants = true,
  hasSkuDisplay = false,
  onVariantSelected,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>(variants[0]?.size || '');
  const [selectedColor, setSelectedColor] = useState<string>(variants[0]?.color || '');

  const sizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean)));
  const colors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean)));

  // Resolve matching variant based on current size and color selection
  useEffect(() => {
    let match = variants.find((v) => v.size === selectedSize && v.color === selectedColor);
    if (!match) {
      match = variants.find((v) => v.size === selectedSize) || variants[0];
    }
    if (match && onVariantSelected) {
      onVariantSelected(match);
    }
  }, [selectedSize, selectedColor, variants]);

  if (!variants || variants.length === 0) {
    return null;
  }

  const currentVariant = variants.find((v) => v.size === selectedSize && v.color === selectedColor) || variants[0];

  return (
    <div className="space-y-3 pt-2">
      {/* Grade de Tamanhos Comercial */}
      {hasSizeGrid && sizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">Tamanho</span>
            <span className="text-slate-500 font-medium">{selectedSize}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((s) => {
              const isSelected = selectedSize === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`min-w-[36px] px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cores Comerciais */}
      {hasColorVariants && colors.length > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700">Cor</span>
            <span className="text-slate-500 font-medium">{selectedColor}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => {
              const isSelected = selectedColor === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold ring-1 ring-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Código de Referência Comercial (Discreto) */}
      {hasSkuDisplay && currentVariant?.sku && (
        <div className="text-[10px] text-slate-400 pt-1">
          Ref: <span className="font-mono">{currentVariant.sku}</span>
        </div>
      )}
    </div>
  );
};
