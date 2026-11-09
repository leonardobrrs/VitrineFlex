import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle2, AlertCircle, Loader2, LogIn, UserPlus, Trash2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Product, ProductVariant, StockAlertResponse } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface BackInStockAlertModalProps {
  product: Product | null;
  variant?: ProductVariant | null;
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

export const BackInStockAlertModal: React.FC<BackInStockAlertModalProps> = ({
  product,
  variant,
  isOpen,
  onClose,
  primaryColor = '#0f172a',
}) => {
  const { user } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingAlert, setExistingAlert] = useState<StockAlertResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if current user already has an active alert for this product/variant
  useEffect(() => {
    if (!isOpen || !product || !user) {
      setExistingAlert(null);
      setSuccessMessage(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const checkAlert = async () => {
      setCheckingExisting(true);
      setError(null);
      try {
        const resp = await api.get<StockAlertResponse[]>(
          `/api/v1/catalog/alerts/stock?store_id=${product.store_id}`
        );
        if (isMounted && resp.data) {
          const match = resp.data.find((a) => {
            const sameProd = a.product_id === product.id;
            const sameVar = variant ? a.variant_id === variant.id : !a.variant_id;
            return sameProd && sameVar && a.status === 'PENDING';
          });
          setExistingAlert(match || null);
        }
      } catch {
        // Silently ignore check failure
      } finally {
        if (isMounted) setCheckingExisting(false);
      }
    };

    checkAlert();

    return () => {
      isMounted = false;
    };
  }, [isOpen, product, variant, user]);

  if (!isOpen || !product) return null;

  const handleSubscribe = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const resp = await api.post<StockAlertResponse>('/api/v1/catalog/alerts/stock', {
        store_id: product.store_id,
        product_id: product.id,
        variant_id: variant?.id || null,
      });

      setExistingAlert(resp.data);
      setSuccessMessage('Notificação ativada! Você receberá um aviso na sua conta assim que o item for reposto.');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Não foi possível registrar o alerta de reposição.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAlert = async () => {
    if (!existingAlert) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.delete(`/api/v1/catalog/alerts/stock/${existingAlert.id}`);
      setExistingAlert(null);
      setSuccessMessage('Aviso de reposição cancelado com sucesso.');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Não foi possível cancelar o alerta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Aviso de Reposição</h2>
              <p className="text-xs text-slate-500">Notificação interna de estoque</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Product preview */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-14 h-14 object-cover rounded-xl border border-slate-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs">
                Sem foto
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{product.title}</h4>
              {variant && (
                <p className="text-[11px] text-slate-500">
                  Opção: <span className="font-semibold text-slate-700">{variant.size} • {variant.color}</span>
                </p>
              )}
              <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full mt-1 border border-rose-100">
                Produto Esgotado
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Unauthenticated State */}
          {!user ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                <LogIn className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Identificação Necessária</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                As notificações de reposição de estoque são salvas diretamente na sua conta do VitrineFlex. Entre ou crie uma conta para continuar.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2.5">
                <Link
                  to="/login"
                  state={{
                    from: location.pathname + location.search,
                    openStockAlert: {
                      productId: product.id,
                      variantId: variant?.id || null,
                    },
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Fazer Login</span>
                </Link>

                <Link
                  to="/cadastro"
                  state={{
                    from: location.pathname + location.search,
                    openStockAlert: {
                      productId: product.id,
                      variantId: variant?.id || null,
                    },
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Criar Conta</span>
                </Link>
              </div>
            </div>
          ) : checkingExisting ? (
            <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span>Verificando status de alerta...</span>
            </div>
          ) : existingAlert ? (
            /* Already Subscribed State */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Você está inscrito neste alerta</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Uma notificação aparecerá automaticamente na sua conta assim que o estoque for reposto.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelAlert}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Cancelar Inscrição</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            /* Confirm Subscription Prompt */
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Deseja registrar um aviso interno na sua conta para quando este produto voltar a ter estoque disponível?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Agora Não
                </button>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-sm hover:opacity-95 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Ativando...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5" />
                      <span>Ativar Notificação</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
