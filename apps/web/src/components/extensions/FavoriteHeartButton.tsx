import React, { useState, useRef } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FavoriteHeartButtonProps {
  productId: string;
  storeId: string;
  isFavoriteInitially?: boolean;
  isFeatureEnabled?: boolean;
  onToggled?: (newState: boolean) => void;
}

export const FavoriteHeartButton: React.FC<FavoriteHeartButtonProps> = ({
  productId,
  storeId,
  isFavoriteInitially = false,
  isFeatureEnabled = true,
  onToggled,
}) => {
  const { token, isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitially);
  const isPendingRef = useRef(false);

  if (!isFeatureEnabled) {
    return null;
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('Faça login para salvar seus produtos favoritos!');
      return;
    }

    if (isPendingRef.current) return;
    isPendingRef.current = true;

    // Resposta visual otimista imediata (0ms de latência percebida)
    const previousState = isFavorite;
    const optimisticState = !previousState;
    setIsFavorite(optimisticState);
    if (onToggled) onToggled(optimisticState);

    try {
      const resp = await fetch('http://localhost:8000/api/v1/catalog/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: storeId,
          product_id: productId,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setIsFavorite(data.is_favorite);
        if (onToggled && data.is_favorite !== optimisticState) {
          onToggled(data.is_favorite);
        }
      } else {
        // Rollback em caso de erro no servidor
        setIsFavorite(previousState);
        if (onToggled) onToggled(previousState);
      }
    } catch (err) {
      // Rollback em caso de falha de conexão
      setIsFavorite(previousState);
      if (onToggled) onToggled(previousState);
    } finally {
      isPendingRef.current = false;
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        isFavorite
          ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 shadow-sm focus:ring-rose-400'
          : 'bg-white/90 backdrop-blur-sm text-slate-400 border border-slate-200 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50 shadow-sm focus:ring-slate-300'
      }`}
    >
      <Heart
        className={`w-4 h-4 transition-transform duration-200 ${
          isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400 hover:scale-105'
        }`}
      />
    </button>
  );
};
