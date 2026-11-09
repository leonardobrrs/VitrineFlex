import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ShoppingBag, Package, Trash2, Plus, Minus, ArrowRight, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useStore } from '../../context/StoreContext';

export const CartDrawer: React.FC = () => {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeItem } = useCart();
  const { manifest } = useStore();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const storeSlug = manifest?.store_slug || 'vitrine-moda';
  const primaryColor = manifest?.theme?.primary_color || '#1e40af';

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    navigate(`/loja/${storeSlug}/checkout`);
  };

  const formatBRL = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Seu Carrinho
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {cart?.total_items || 0}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              aria-label="Fechar carrinho"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!cart || cart.items.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-base font-semibold text-slate-800">Seu carrinho está vazio</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Explore o catálogo da loja e selecione seus produtos favoritos.
                </p>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 p-3.5 border border-slate-200/80 rounded-xl hover:border-slate-300 transition bg-white"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                    <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                      {formatBRL(item.unit_price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-700 transition"
                        title="Diminuir quantidade"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-800 px-1.5">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-700 transition"
                        title="Aumentar quantidade"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between self-stretch py-0.5">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition"
                      title="Remover item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-slate-900">
                      {formatBRL(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout CTA */}
          {cart && cart.items.length > 0 && (
            <div className="border-t border-slate-100 p-6 bg-slate-50 space-y-4">
              <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                <span>Subtotal</span>
                <span className="text-xl font-black text-slate-900">
                  {formatBRL(cart.subtotal)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Opções de frete e modalidades de pagamento serão calculadas no checkout.
              </p>
              <button
                onClick={handleCheckoutClick}
                className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <span>Finalizar Compra</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
