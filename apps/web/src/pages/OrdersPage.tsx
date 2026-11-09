import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { Order } from '../types';
import {
  Package,
  Lock,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
} from 'lucide-react';

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const OrdersPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();
  const { manifest } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const storeId = manifest?.store_id || manifest?.store_slug || slug || 'vitrine-tech';
  const primaryColor = manifest?.theme_colors?.primary || '#1e40af';

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/api/v1/orders?store_id=${storeId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        } else {
          throw new Error('Falha ao consultar histórico de pedidos');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [storeId, token]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pagamento Aprovado
          </span>
        );
      case 'PAYMENT_PENDING_CONFIRMATION':
      case 'INVENTORY_RESERVED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            Aguardando Confirmação
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-2.5 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" />
            Pagamento Recusado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold px-2.5 py-1 rounded-full">
            <Package className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Acesso Restrito</h2>
        <p className="text-slate-500 mt-2 mb-6 text-sm">
          Faça login para acompanhar e visualizar seus pedidos nesta loja.
        </p>
        <Link
          to="/login"
          style={{ backgroundColor: primaryColor }}
          className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-lg shadow-sm hover:opacity-90 transition"
        >
          Entrar na Minha Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-slate-700" />
            Meus Pedidos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Histórico de pedidos na loja <strong>{manifest?.store_name || 'VitrineFlex'}</strong>
          </p>
        </div>
        <Link
          to={`/loja/${slug || 'vitrine-tech'}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar às Compras
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-slate-500">Consultando seus pedidos...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Você ainda não tem pedidos nesta loja</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Navegue pelo nosso catálogo e aproveite as melhores ofertas!
          </p>
          <Link
            to={`/loja/${slug || 'vitrine-tech'}`}
            style={{ backgroundColor: primaryColor }}
            className="inline-flex items-center gap-2 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm hover:opacity-90 text-sm transition"
          >
            Explorar Produtos
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Order Header */}
              <div className="p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Número do Pedido</span>
                    <span className="font-mono text-sm font-bold text-slate-800">{order.id}</span>
                  </div>
                  <div>
                    <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Data da Compra</span>
                    <span className="text-xs text-slate-600 flex items-center gap-1 font-medium mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(order.created_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(order.status)}
                  <span className="text-base font-extrabold text-slate-900">
                    {formatBRL(order.total_amount)}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-6 divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500">
                        {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'} × {formatBRL(item.unit_price)}
                      </p>

                      {item.snapshot_attributes && Object.keys(item.snapshot_attributes).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {Object.entries(item.snapshot_attributes).map(([k, v]) => (
                            <span
                              key={k}
                              className="bg-slate-100 text-slate-700 text-2xs px-2 py-0.5 rounded-md font-medium border border-slate-200/60"
                            >
                              <strong className="capitalize">{k}:</strong> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-sm text-slate-900 whitespace-nowrap">
                      {formatBRL(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Status History */}
              {order.history && order.history.length > 0 && (
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-xs space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-2xs mb-1.5">
                    Atualizações do Pedido:
                  </span>
                  {order.history.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-slate-600">
                      <span className="font-mono text-slate-400 text-2xs">
                        {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-semibold text-slate-700">[{h.to_status}]</span>
                      <span className="text-slate-500">— {h.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
