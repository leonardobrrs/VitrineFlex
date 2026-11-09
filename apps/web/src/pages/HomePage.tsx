import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/layout/LandingHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { applyStoreTheme } from '../services/theme';
import {
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Cpu,
  BookOpen,
  Truck,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  useEffect(() => {
    applyStoreTheme('neutral');
  }, []);

  const stores = [
    {
      slug: 'vitrine-moda',
      name: 'Vitrine Moda',
      tagline: 'Coleções Contemporâneas & Estilo Autêntico',
      description: 'Descubra peças de vestuário com acabamento premium, cortes modernos e variedade completa de tamanhos e cores.',
      icon: ShoppingBag,
      accentColor: '#9333ea',
      badge: 'Moda & Estilo',
      itemsCount: 'Catálogo de Roupas & Acessórios',
      link: '/loja/vitrine-moda',
    },
    {
      slug: 'vitrine-tech',
      name: 'Vitrine Tech',
      tagline: 'Dispositivos de Alto Desempenho & Setup Pro',
      description: 'Smartphones de última geração, notebooks de alto rendimento e periféricos profissionais com especificações técnicas completas.',
      icon: Cpu,
      accentColor: '#0284c7',
      badge: 'Eletrônicos & Hardware',
      itemsCount: 'Catálogo de Eletrônicos',
      link: '/loja/vitrine-tech',
    },
    {
      slug: 'vitrine-books',
      name: 'Vitrine Books',
      tagline: 'Literatura, Clássicos & Não-Ficção',
      description: 'Títulos selecionados de ficção, filosofia, ciência e arte com ficha catalográfica e edições de colecionador.',
      icon: BookOpen,
      accentColor: '#b45309',
      badge: 'Livros & Cultura',
      itemsCount: 'Catálogo Editorial',
      link: '/loja/vitrine-books',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <LandingHeader />

      <main className="flex-1">
        {/* Commercial Hero */}
        <section className="relative overflow-hidden bg-white border-b border-slate-200/80 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Experiência Multiloja Especializada</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Encontre o melhor em Moda, Tecnologia e Livros
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Três vitrines especializadas, desenvolvidas com foco na experiência de compra, catálogo dinâmico e checkout unificado e seguro.
            </p>

            <div className="mt-8 flex justify-center">
              <a
                href="#vitrines"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition text-sm cursor-pointer shadow-2xs"
              >
                <span>Conhecer as Vitrines</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Store Selection Cards */}
        <section id="vitrines" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Escolha uma Vitrine Especializada
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Cada ambiente adapta sua apresentação, especificações e navegação ao segmento de produtos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stores.map((store) => {
              const Icon = store.icon;
              return (
                <div
                  key={store.slug}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col p-6 sm:p-7 justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div
                        style={{ backgroundColor: `${store.accentColor}15`, color: store.accentColor }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {store.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {store.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mb-3">
                      {store.tagline}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">
                      {store.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Link
                      to={store.link}
                      style={{ backgroundColor: store.accentColor }}
                      className="w-full inline-flex items-center justify-center gap-2 text-white font-semibold py-3 px-4 rounded-xl shadow-xs hover:opacity-95 transition text-sm cursor-pointer"
                    >
                      <span>Entrar na {store.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits Bar */}
        <section className="bg-white border-y border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Entrega Rápida e Retirada</h4>
                <p className="text-xs text-slate-500 mt-0.5">Opções com cotação de frete por CEP ou retirada gratuita na loja física.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Checkout Seguro e Confiável</h4>
                <p className="text-xs text-slate-500 mt-0.5">Processamento com chave de segurança, estoque reservado e rastreio.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">PIX e Cartão de Crédito</h4>
                <p className="text-xs text-slate-500 mt-0.5">Aprovação imediata via PIX ou parcelamento no cartão com confirmação rápida.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  );
};
