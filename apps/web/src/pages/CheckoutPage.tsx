import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { resolveStoreTheme, applyStoreTheme } from '../services/theme';
import { ShippingOption } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Truck,
  CreditCard,
  Zap,
  FileText,
  Package,
  ShoppingCart,
  Lock,
  Check,
  SlidersHorizontal,
} from 'lucide-react';

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const CheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { token, user } = useAuth();
  const { manifest } = useStore();
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  // Checkout Stepper State (1: Items, 2: Shipping, 3: Payment, 4: Review)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Shipping State
  const [zipCode, setZipCode] = useState<string>('57000-000');
  const [address, setAddress] = useState<string>('Av. Fernandes Lima, 1000 - Farol, Maceió - AL');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedOptionCode, setSelectedOptionCode] = useState<string>('STANDARD_DELIVERY');
  const [selectedModality, setSelectedModality] = useState<string>('DELIVERY');
  const [shippingCost, setShippingCost] = useState<number>(19.9);
  const [loadingShipping, setLoadingShipping] = useState<boolean>(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [cardNumber, setCardNumber] = useState<string>('4111111111111111');
  const [simulationScenario, setSimulationScenario] = useState<string>('NORMAL');
  const [showSimControls, setShowSimControls] = useState<boolean>(false);

  // Execution & Idempotency Key
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize unique stable idempotency key for this checkout attempt
  useEffect(() => {
    setIdempotencyKey(`idemp-web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  // Sync active theme
  useEffect(() => {
    if (slug) {
      applyStoreTheme(resolveStoreTheme(slug));
    } else if (manifest?.segment) {
      applyStoreTheme(resolveStoreTheme(manifest.segment));
    }
  }, [slug, manifest]);

  // Fetch Shipping Options
  const calculateShipping = async (zip: string) => {
    setLoadingShipping(true);
    setErrorMessage(null);
    const storeId = manifest?.store_id || manifest?.store_slug || slug || 'vitrine-tech';

    try {
      const res = await fetch('http://localhost:8000/api/v1/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, zip_code: zip }),
      });

      if (res.ok) {
        const data = await res.json();
        setShippingOptions(data.options);
        if (data.options.length > 0) {
          const first = data.options[0];
          setSelectedOptionCode(first.code);
          setSelectedModality(first.modality);
          setShippingCost(first.cost);
        }
      }
    } catch {
      // Fallback local shipping options based on store manifest
      const fallbackOptions: ShippingOption[] = [
        { code: 'STANDARD_DELIVERY', modality: 'DELIVERY', name: 'Entrega Padrão', cost: 19.9, estimated_days: 5 },
        { code: 'EXPRESS_DELIVERY', modality: 'DELIVERY', name: 'Entrega Expressa', cost: 34.9, estimated_days: 2 },
      ];
      if (manifest?.fulfillment_modes?.includes('PICKUP')) {
        fallbackOptions.push({ code: 'STORE_PICKUP', modality: 'PICKUP', name: 'Retirada na Loja', cost: 0.0, estimated_days: 1 });
      }
      setShippingOptions(fallbackOptions);
    } finally {
      setLoadingShipping(false);
    }
  };

  useEffect(() => {
    calculateShipping(zipCode);
  }, [manifest]);

  // Set default payment method according to manifest
  useEffect(() => {
    if (manifest?.payment_methods && manifest.payment_methods.length > 0) {
      if (!manifest.payment_methods.includes(paymentMethod)) {
        setPaymentMethod(manifest.payment_methods[0]);
      }
    }
  }, [manifest]);

  const handleOptionChange = (code: string) => {
    const opt = shippingOptions.find((o) => o.code === code);
    if (opt) {
      setSelectedOptionCode(opt.code);
      setSelectedModality(opt.modality);
      setShippingCost(opt.cost);
    }
  };

  const handleFinalizeCheckout = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    const storeId = manifest?.store_id || manifest?.store_slug || slug || 'vitrine-tech';

    const payload = {
      store_id: storeId,
      shipping_zip_code: zipCode,
      shipping_address: address,
      fulfillment_mode: selectedModality,
      shipping_option_code: selectedOptionCode,
      payment_method: paymentMethod,
      card_number: paymentMethod === 'CARD' ? cardNumber : undefined,
      simulation_scenario: simulationScenario !== 'NORMAL' ? simulationScenario : undefined,
      items: cart?.items?.map((it) => ({
        product_id: it.product_id,
        variant_id: it.variant_id || null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        title: it.title,
      })),
    };

    try {
      const res = await fetch('http://localhost:8000/api/v1/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Falha ao processar o checkout');
      }

      setCheckoutResult(data);
      if (data.saga_status === 'COMPLETED') {
        clearCart();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const primaryColor = manifest?.theme_colors?.primary || '#1e40af';

  if (!checkoutResult && (!cart || cart.items.length === 0)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Seu carrinho está vazio</h2>
        <p className="text-slate-500 mt-2 mb-6 text-sm">
          Adicione produtos ao seu carrinho antes de prosseguir para o checkout.
        </p>
        <Link
          to={`/loja/${slug || 'vitrine-tech'}`}
          style={{ backgroundColor: primaryColor }}
          className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-lg shadow-sm hover:opacity-90 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar às Compras
        </Link>
      </div>
    );
  }

  // Result Screen after Checkout Execution
  if (checkoutResult) {
    const isSuccess = checkoutResult.saga_status === 'COMPLETED';
    const isPending = checkoutResult.saga_status === 'PAYMENT_PENDING_CONFIRMATION';
    const isFailed = checkoutResult.saga_status === 'FAILED';

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div
          className={`p-8 rounded-2xl border shadow-sm ${
            isSuccess
              ? 'bg-emerald-50/50 border-emerald-200'
              : isPending
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-rose-50/50 border-rose-200'
          }`}
        >
          <div className="text-center mb-6">
            <div
              className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isSuccess
                  ? 'bg-emerald-100 text-emerald-600'
                  : isPending
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-9 h-9" />}
              {isPending && <Clock className="w-9 h-9" />}
              {isFailed && <AlertTriangle className="w-9 h-9" />}
            </div>
            <h2
              className={`text-2xl font-bold ${
                isSuccess
                  ? 'text-emerald-900'
                  : isPending
                  ? 'text-amber-900'
                  : 'text-rose-900'
              }`}
            >
              {isSuccess && 'Pedido Confirmado com Sucesso!'}
              {isPending && 'Pagamento em Processamento'}
              {isFailed && 'Não Foi Possível Concluir o Pedido'}
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              {checkoutResult.message}
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-3 mb-6 shadow-sm">
            {checkoutResult.order && (
              <>
                <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Número do Pedido</span>
                  <span className="font-mono font-bold text-slate-900">{checkoutResult.order.id}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      isSuccess
                        ? 'bg-emerald-100 text-emerald-800'
                        : isPending
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isSuccess && <Check className="w-3.5 h-3.5" />}
                    {isPending && <Clock className="w-3.5 h-3.5" />}
                    {isFailed && <AlertTriangle className="w-3.5 h-3.5" />}
                    {checkoutResult.order.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-slate-500 font-medium">Total do Pedido</span>
                  <span className="font-bold text-slate-900 text-base">
                    {formatBRL(checkoutResult.order.total_amount)}
                  </span>
                </div>
              </>
            )}

            {/* PIX instructions if applicable */}
            {paymentMethod === 'PIX' && checkoutResult.payment?.qr_code_pix && (
              <div className="mt-4 p-4 bg-sky-50 border border-sky-200 rounded-lg text-center">
                <span className="text-xs font-bold text-sky-900 uppercase tracking-wider block mb-2">
                  Código PIX para Pagamento:
                </span>
                <code className="text-xs bg-white p-3 rounded-lg block break-all font-mono border border-sky-100 text-slate-800 select-all">
                  {checkoutResult.payment.qr_code_pix}
                </code>
              </div>
            )}
          </div>

          {isPending && (
            <div className="p-4 bg-amber-100/70 border border-amber-200 rounded-lg text-sm text-amber-900 mb-6 flex items-start gap-3">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Aguardando compensação:</strong> O estoque dos seus itens permanece reservado. Você pode acompanhar a atualização do status na aba <em>Meus Pedidos</em>.
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to={`/loja/${slug || 'vitrine-tech'}/pedidos`}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-center font-semibold py-3 px-4 rounded-lg transition"
            >
              Ver Meus Pedidos
            </Link>
            <Link
              to={`/loja/${slug || 'vitrine-tech'}`}
              className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-center font-semibold py-3 px-4 rounded-lg transition"
            >
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart) return null;

  const subtotal = cart.subtotal;
  const total = subtotal + shippingCost;

  return (
    <div className="flex flex-col min-h-screen bg-theme-bg">
      <StoreHeader />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
      {/* Stepper Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Finalização de Compra
              </h1>
              <p className="text-xs text-slate-500">
                {manifest?.store_name || 'VitrineFlex'} — Ambiente 100% Seguro
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
            <Lock className="w-3.5 h-3.5" />
            Pagamento Criptografado
          </span>
        </div>

        {/* Stepper Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between relative max-w-xl mx-auto">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-0 -translate-y-1/2" />
            {[
              { num: 1, label: 'Itens' },
              { num: 2, label: 'Entrega' },
              { num: 3, label: 'Pagamento' },
              { num: 4, label: 'Revisão' },
            ].map((st) => {
              const isCurrent = st.num === currentStep;
              const isDone = st.num < currentStep;

              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => isDone && setCurrentStep(st.num)}
                  disabled={!isDone}
                  className={`flex flex-col items-center z-10 transition ${
                    isDone ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    style={
                      isCurrent
                        ? { backgroundColor: primaryColor, borderColor: primaryColor }
                        : isDone
                        ? { backgroundColor: '#10b981', borderColor: '#10b981' }
                        : undefined
                    }
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition ${
                      isCurrent || isDone
                        ? 'text-white shadow-sm'
                        : 'bg-white text-slate-400 border-slate-300'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : st.num}
                  </div>
                  <span
                    className={`text-xs font-medium mt-1.5 ${
                      isCurrent
                        ? 'text-slate-900 font-bold'
                        : isDone
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {st.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Ocorreu um erro:</strong> {errorMessage}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Step Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: ITENS */}
          {currentStep === 1 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-600" />
                  1. Itens no Pedido ({cart.total_items})
                </h2>
                <Link
                  to={`/loja/${slug || 'vitrine-tech'}`}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Adicionar mais produtos
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {cart.items.map((item) => (
                  <div key={item.id} className="py-3.5 flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-800 line-clamp-1">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'} × {formatBRL(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-slate-900 whitespace-nowrap">
                      {formatBRL(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{ backgroundColor: primaryColor }}
                className="w-full mt-4 text-white font-bold py-3.5 rounded-xl shadow-sm hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                Continuar para Entrega
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: SHIPPING & FULFILLMENT */}
          {currentStep === 2 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-slate-600" />
                  2. Endereço e Opção de Entrega
                </h2>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  CEP de Destino
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="00000-000"
                    className="border border-slate-300 rounded-lg px-3 py-2 flex-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => calculateShipping(zipCode)}
                    disabled={loadingShipping}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    {loadingShipping ? 'Calculando...' : 'Calcular'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Modalidades Disponíveis
                </label>
                <div className="space-y-2">
                  {shippingOptions.map((opt) => {
                    const isSelected = selectedOptionCode === opt.code;
                    return (
                      <label
                        key={opt.code}
                        onClick={() => handleOptionChange(opt.code)}
                        className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 font-medium shadow-xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping_opt"
                            checked={isSelected}
                            onChange={() => handleOptionChange(opt.code)}
                            className="text-slate-900 focus:ring-slate-900"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{opt.name}</p>
                            <p className="text-xs text-slate-500">
                              {opt.estimated_days} {opt.estimated_days === 1 ? 'dia útil' : 'dias úteis'}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          {opt.cost === 0 ? 'Grátis' : formatBRL(opt.cost)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{ backgroundColor: primaryColor }}
                  className="w-2/3 text-white font-bold py-3 rounded-xl shadow-sm hover:opacity-95 transition flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                >
                  Continuar para Pagamento
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {currentStep === 3 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  3. Forma de Pagamento
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione a forma de pagamento de sua preferência.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'PIX', label: 'PIX', icon: Zap, subtitle: 'Aprovação imediata' },
                  { id: 'CARD', label: 'Cartão de Crédito', icon: CreditCard, subtitle: 'Em até 12x' },
                  { id: 'BOLETO', label: 'Boleto', icon: FileText, subtitle: '1-3 dias úteis' },
                ].map((method) => {
                  const isEnabled = manifest?.payment_methods?.includes(method.id) ?? true;
                  const isSelected = paymentMethod === method.id;
                  const Icon = method.icon;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      disabled={!isEnabled}
                      onClick={() => isEnabled && setPaymentMethod(method.id)}
                      className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition text-center ${
                        !isEnabled
                          ? 'opacity-40 bg-slate-50 cursor-not-allowed border-slate-200'
                          : isSelected
                          ? 'border-slate-900 bg-slate-50 text-slate-900 font-semibold shadow-xs ring-1 ring-slate-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <Icon className="w-6 h-6 text-slate-700" />
                      <span className="text-xs font-bold">{method.label}</span>
                      <span className="text-2xs text-slate-400">
                        {isEnabled ? method.subtitle : 'Indisponível'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {paymentMethod === 'CARD' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Número do Cartão Simulado
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="4111 1111 1111 1111"
                  />
                  <p className="text-2xs text-slate-500">
                    Dica de teste: cartões com final '0002' simulam recusa de crédito.
                  </p>
                </div>
              )}

              {/* Discreet Simulation Controls for Technical Evaluation */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimControls(!showSimControls)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {showSimControls ? 'Ocultar opções de simulação técnica' : 'Opções de simulação técnica'}
                </button>

                {showSimControls && (
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <label className="block font-semibold text-slate-700">
                      Cenário de Teste da Transação:
                    </label>
                    <select
                      value={simulationScenario}
                      onChange={(e) => setSimulationScenario(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-800"
                    >
                      <option value="NORMAL">Normal (Pagamento aprovado)</option>
                      <option value="CARD_DECLINED">Recusa de Cartão (Compensação automática)</option>
                      <option value="TIMEOUT">Timeout / Pendência (Retém reserva)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  style={{ backgroundColor: primaryColor }}
                  className="w-2/3 text-white font-bold py-3 rounded-xl shadow-sm hover:opacity-95 transition flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                >
                  Revisar Pedido
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {currentStep === 4 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  4. Revisão e Confirmação da Compra
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Confira todos os dados antes de finalizar seu pedido.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Loja</span>
                  <span className="font-semibold text-slate-800">{manifest?.store_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Destino</span>
                  <span className="font-semibold text-slate-800 text-right max-w-xs truncate">
                    {address} ({zipCode})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Frete</span>
                  <span className="font-semibold text-slate-800">
                    {shippingCost === 0 ? 'Grátis' : formatBRL(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Forma de Pagamento</span>
                  <span className="font-semibold text-slate-800">{paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Comprador</span>
                  <span className="font-semibold text-slate-800">{user?.email || 'Cliente Identificado'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinalizeCheckout}
                disabled={processing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-base disabled:opacity-50 cursor-pointer"
              >
                {processing ? (
                  <>
                    <Clock className="w-5 h-5 animate-spin" />
                    <span>Processando Pagamento com Segurança...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Confirmar e Finalizar Pedido • {formatBRL(total)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
              >
                Alterar forma de pagamento ou entrega
              </button>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 text-sm uppercase tracking-wider">
            Resumo do Pedido
          </h3>
          <div className="space-y-2.5 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal ({cart.total_items} {cart.total_items === 1 ? 'item' : 'itens'})</span>
              <span className="font-semibold text-slate-800">{formatBRL(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Frete</span>
              <span className="font-semibold text-slate-800">
                {shippingCost === 0 ? 'Grátis' : formatBRL(shippingCost)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between font-extrabold text-base text-slate-900">
              <span>Total</span>
              <span style={{ color: primaryColor }}>{formatBRL(total)}</span>
            </div>
          </div>

          <div className="pt-2 text-2xs text-slate-400 border-t border-slate-100 space-y-1">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Compra 100% protegida e segura
            </p>
            <p className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              Rastreamento disponível após envio
            </p>
          </div>
        </div>
      </div>
      </main>
      <StoreFooter />
    </div>
  );
};
