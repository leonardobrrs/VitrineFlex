import React, { useState } from 'react';
import { ShoppingBag, Cpu, BookOpen, Layers } from 'lucide-react';
import { StoreTheme } from '../services/theme';
import { resolveProductImage } from '../utils/imageResolver';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  theme?: StoreTheme | string;
  className?: string;
  aspect?: 'fashion' | 'tech' | 'books' | 'square' | 'auto';
  title?: string;
  subtitle?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  theme = 'neutral',
  className = '',
  aspect = 'auto',
  title,
  subtitle,
}) => {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = resolveProductImage(src);

  const isFashion = theme === 'fashion' || aspect === 'fashion';
  const isTech = theme === 'tech' || aspect === 'tech';
  const isBooks = theme === 'books' || aspect === 'books';

  // Render contextual fallback placeholder
  if (!resolvedSrc || hasError) {
    if (isFashion) {
      return (
        <div
          className={`w-full h-full min-h-[160px] bg-[#ECE8E1] flex flex-col items-center justify-center p-4 text-center select-none border border-[#DED9D1]/60 ${className}`}
          role="img"
          aria-label={alt}
        >
          <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center text-[#69655F] mb-2 shadow-xs">
            <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#69655F]">
            Coleção Moda
          </span>
          {title && (
            <span className="text-xs font-light text-[#191918] mt-1 line-clamp-1 max-w-[90%]">
              {title}
            </span>
          )}
        </div>
      );
    }

    if (isTech) {
      return (
        <div
          className={`w-full h-full min-h-[160px] bg-[#F5F6F7] flex flex-col items-center justify-center p-4 text-center select-none border border-[#DDE1E5] rounded-md ${className}`}
          role="img"
          aria-label={alt}
        >
          <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-[#155EEF] mb-2 shadow-xs border border-[#DDE1E5]">
            <Cpu className="w-6 h-6 stroke-[1.75]" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#626B75]">
            VTX Hardware
          </span>
          {title && (
            <span className="text-xs font-bold text-[#15181B] mt-1 line-clamp-1 max-w-[90%]">
              {title}
            </span>
          )}
        </div>
      );
    }

    if (isBooks) {
      return (
        <div
          className={`w-full h-full min-h-[180px] aspect-[2/3] bg-[#F4EFE6] border-2 border-[#DED2C1] rounded shadow-md flex flex-col justify-between p-4 text-center select-none relative overflow-hidden ${className}`}
          role="img"
          aria-label={alt}
        >
          {/* Faux book spine shadow */}
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/15 to-transparent pointer-events-none" />

          <div className="border border-[#743A3F]/30 p-2.5 h-full flex flex-col justify-between rounded-xs">
            <div className="flex items-center justify-center text-[#743A3F]">
              <BookOpen className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="font-serif text-xs font-semibold text-[#211C18] line-clamp-3 leading-tight block">
                {title || alt}
              </span>
              {subtitle && (
                <span className="font-serif italic text-[10px] text-[#685A4F] mt-1 line-clamp-1 block">
                  {subtitle}
                </span>
              )}
            </div>
            <span className="text-[9px] uppercase tracking-widest text-[#743A3F] font-semibold">
              Vitrine Books
            </span>
          </div>
        </div>
      );
    }

    // Default neutral fallback
    return (
      <div
        className={`w-full h-full min-h-[160px] bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-400 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <Layers className="w-8 h-8 mb-1 text-slate-300" />
        <span className="text-xs font-medium text-slate-500 line-clamp-1 max-w-[90%]">
          {title || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      onError={() => setHasError(true)}
      loading="lazy"
      className={className}
    />
  );
};
