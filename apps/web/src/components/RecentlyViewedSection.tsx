import React, { useEffect, useState } from 'react';
import { History, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface RecentlyViewedItem {
  id?: string;
  product_id?: string;
  title: string;
  category: string;
  price: number;
  image_url?: string;
}

interface RecentlyViewedSectionProps {
  storeId: string;
  storeSlug?: string;
  primaryColor?: string;
  className?: string;
}

export const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({
  storeId,
  storeSlug,
  primaryColor = '#0f172a',
  className = '',
}) => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedPid, setAddedPid] = useState<string | null>(null);

  const visitorId = localStorage.getItem('visitor_id') || 'anon-visitor';
  const effectiveUserId = user?.id || visitorId;

  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;
    const fetchRecentlyViewed = async () => {
      setLoading(true);
      try {
        const resp = await api.get(
          `/api/v1/recommendations/recently-viewed?store_id=${storeId}&user_id=${effectiveUserId}&limit=6`
        );
        if (isMounted) {
          const list = Array.isArray(resp.data) ? resp.data : (resp.data?.items || []);
          setItems(list);
        }
      } catch (err) {
        console.error('Falha ao carregar vistos recentemente:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecentlyViewed();

    return () => {
      isMounted = false;
    };
  }, [storeId, effectiveUserId]);

  if (!loading && items.length === 0) {
    return null;
  }

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAddToCart = async (e: React.MouseEvent, item: RecentlyViewedItem) => {
    e.preventDefault();
    e.stopPropagation();
    const pid = item.id || item.product_id;
    if (!pid) return;

    try {
      await addItem(pid, undefined, 1, {
        title: item.title,
        price: item.price,
        image_url: item.image_url,
      });
      setAddedPid(pid);
      setTimeout(() => setAddedPid(null), 1600);
    } catch {
      // Handled
    }
  };

  return (
    <section className={`bg-gradient-to-b from-slate-50 to-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
            style={{ backgroundColor: primaryColor }}
          >
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Vistos Recentemente</span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Produtos que você consultou nesta vitrine
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-3 border border-slate-200/60 animate-pulse space-y-2">
              <div className="aspect-square bg-slate-100 rounded-xl" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-3.5 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {items.map((item) => {
            const pid = item.id || item.product_id || '';
            const isJustAdded = addedPid === pid;

            return (
              <div
                key={pid}
                className="bg-white rounded-2xl p-3 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <Link
                    to={`/loja/${storeSlug || storeId}/produto/${pid}`}
                    className="block relative aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2.5"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Sem foto
                      </div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded text-slate-700 shadow-2xs">
                      {item.category}
                    </span>
                  </Link>

                  <Link
                    to={`/loja/${storeSlug || storeId}/produto/${pid}`}
                    className="block group/title"
                  >
                    <h3 className="text-xs font-bold text-slate-900 group-hover/title:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                  </Link>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <span className="text-xs font-black text-slate-900">
                    {formatBRL(item.price)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(e, item)}
                    className={`p-1.5 rounded-lg text-white shadow-2xs active:scale-95 transition-all ${
                      isJustAdded ? 'bg-emerald-600' : 'hover:opacity-90'
                    }`}
                    style={!isJustAdded ? { backgroundColor: primaryColor } : undefined}
                    title="Adicionar ao carrinho"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
