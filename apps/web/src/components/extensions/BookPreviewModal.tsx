import React from 'react';
import { X, BookOpen, ShoppingBag, Check } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface BookPreviewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

export const BookPreviewModal: React.FC<BookPreviewModalProps> = ({
  product,
  isOpen,
  onClose,
  primaryColor = '#0f172a',
}) => {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = React.useState(false);

  if (!isOpen || !product) return null;

  const authorAttr = product.attributes?.find((a) => a.name.toLowerCase().includes('autor'))?.value;
  const publisherAttr = product.attributes?.find((a) => a.name.toLowerCase().includes('editora'))?.value;
  const isbnAttr = product.attributes?.find((a) => a.name.toLowerCase().includes('isbn'))?.value;

  const handleAddToCart = async () => {
    if (product.stock_quantity <= 0) return;
    try {
      await addItem(product.id, undefined, 1, {
        title: product.title,
        price: product.price,
        image_url: product.image_url,
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1600);
    } catch {
      // Handled
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Amostra de Leitura
              </span>
              <h2 className="text-base font-bold text-slate-900 line-clamp-1">{product.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reader Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-amber-50/30">
          <div className="max-w-xl mx-auto space-y-6">
            {/* Book Meta Header */}
            <div className="text-center pb-6 border-b border-amber-200/50">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{product.title}</h1>
              {authorAttr && <p className="text-sm font-medium text-slate-600">Por {authorAttr}</p>}
              <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-500">
                {publisherAttr && <span>Editora: {publisherAttr}</span>}
                {isbnAttr && <span>• ISBN: {isbnAttr}</span>}
              </div>
            </div>

            {/* Content text */}
            <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-sm sm:text-base space-y-4">
              {product.preview_content ? (
                product.preview_content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-justify first-letter:text-2xl first-letter:font-bold">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-slate-500 italic text-center py-8">
                  Nenhuma amostra de texto cadastrada para esta obra.
                </p>
              )}
            </div>

            {/* Notice */}
            <div className="mt-8 pt-6 border-t border-amber-200/50 text-center">
              <p className="text-xs text-slate-500">
                Fim da amostra gratuita. Adquira o exemplar completo para continuar a leitura.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 block">Preço do exemplar</span>
            <span className="text-lg font-bold text-slate-900">{formatBRL(product.price)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleAddToCart}
              disabled={product.stock_quantity <= 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm ${
                justAdded ? 'bg-emerald-600' : 'hover:opacity-95'
              }`}
              style={!justAdded ? { backgroundColor: primaryColor } : undefined}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Adicionado!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Comprar Obra</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
