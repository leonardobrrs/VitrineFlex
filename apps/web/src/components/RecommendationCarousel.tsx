import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShoppingBag, Tag, Check } from 'lucide-react';
import { RecommendationItem, RecommendationResponse } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface RecommendationCarouselProps {
  storeId: string;
  storeSlug?: string;
  primaryColor?: string;
}

export const RecommendationCarousel: React.FC<RecommendationCarouselProps> = ({
  storeId,
  storeSlug,
  primaryColor = '#2563eb',
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDegraded, setIsDegraded] = useState<boolean>(false);
  const [isColdStart, setIsColdStart] = useState<boolean>(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const { addItem } = useCart();
  const { token } = useAuth();

  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        headers['X-Store-ID'] = storeId;

        const res = await fetch(`http://localhost:8000/api/v1/recommendations?store_id=${storeId}&limit=4`, {
          headers,
        });

        if (res.ok) {
          const data: RecommendationResponse = await res.json();
          if (isMounted) {
            setRecommendations(data.items || []);
            setIsDegraded(Boolean(data.degraded));
            setIsColdStart(Boolean(data.cold_start));
          }
        } else {
          if (isMounted) setIsDegraded(true);
        }
      } catch (err) {
        if (isMounted) setIsDegraded(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecommendations();

    return () => {
      isMounted = false;
    };
  }, [storeId, token]);

  const handleAddToCart = async (item: RecommendationItem) => {
    try {
      await addItem(item.product_id, undefined, 1, {
        title: item.title,
        price: item.price,
        image_url: item.image_url,
      });
      setAddedProductId(item.product_id);
      setTimeout(() => setAddedProductId(null), 1800);
    } catch {
      // Handled in CartContext
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const sanitizeReason = (reason: string) => {
    if (!reason) return 'Popular nesta loja';
    // Remove technical terms from algorithmic explanations
    if (reason.toLowerCase().includes('cold start') || reason.toLowerCase().includes('popularidade geral')) {
      return 'Destaque mais buscado da loja';
    }
    if (reason.toLowerCase().includes('recente')) {
      return 'Baseado nos itens que você viu recentemente';
    }
    if (reason.toLowerCase().includes('afinidade')) {
      return 'Combina com seus interesses';
    }
    return reason;
  };

  if (loading) {
    return (
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/70 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-400 animate-spin" />
          <div className="h-4 bg-slate-200 rounded w-44 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 bg-white rounded-xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isDegraded || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {isColdStart ? 'Destaques e Mais Populares' : 'Recomendados para Você'}
            </h2>
            <p className="text-xs text-slate-500">
              Sugestões selecionadas para você nesta vitrine.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendations.map((item) => {
          const isAdded = addedProductId === item.product_id;
          return (
            <div
              key={item.product_id}
              className="bg-white rounded-xl p-3.5 border border-slate-200/70 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <Link
                  to={`/loja/${storeSlug || storeId}/produto/${item.product_id}`}
                  className="block relative aspect-[4/3] rounded-lg bg-slate-100 overflow-hidden mb-3 group/img"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      Sem imagem
                    </div>
                  )}
                </Link>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span className="font-medium truncate">{item.category}</span>
                </div>

                <Link
                  to={`/loja/${storeSlug || storeId}/produto/${item.product_id}`}
                  className="block group/title"
                >
                  <h3 className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2 mb-2 group-hover/title:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>
                </Link>

                <div className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 mb-3">
                  <p className="text-[11px] text-slate-600 font-medium leading-tight truncate">
                    {sanitizeReason(item.reason)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <span className="text-sm font-extrabold text-slate-900">
                  {formatBRL(item.price)}
                </span>

                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={isAdded}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    isAdded
                      ? 'bg-emerald-600 text-white'
                      : 'text-white hover:opacity-95 active:scale-95'
                  }`}
                  style={!isAdded ? { backgroundColor: primaryColor } : undefined}
                  title="Adicionar ao carrinho"
                >
                  {isAdded ? (
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
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
