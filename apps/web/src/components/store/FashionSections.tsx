import React from 'react';
import { ArrowRight } from 'lucide-react';

export const FashionHero: React.FC<{ onScrollToCatalog: () => void }> = ({ onScrollToCatalog }) => {
  return (
    <section className="relative overflow-hidden bg-[#F6F4F0] border-b border-[#DED9D1]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Text Content */}
          <div className="lg:col-span-6 space-y-6 z-10">
            <div className="inline-block">
              <span className="text-[11px] font-semibold tracking-[0.25em] text-[#69655F] uppercase block">
                Nova Coleção
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-[#191918] tracking-tight leading-[1.08] uppercase">
              Essenciais <br />
              <span className="font-normal">Contemporâneos</span>
            </h1>

            <p className="text-sm sm:text-base text-[#69655F] max-w-md font-normal leading-relaxed">
              Peças atemporais para um guarda-roupa versátil. Materiais nobres, acabamento refinado e silhuetas que atravessam estações.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onScrollToCatalog}
                className="inline-flex items-center gap-3 px-7 py-4 bg-[#222220] hover:bg-[#3A3936] text-[#F6F4F0] text-xs font-semibold tracking-[0.18em] uppercase transition-all duration-200 shadow-sm"
              >
                <span>Descubra a Coleção</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Editorial Portrait Right */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none aspect-[3/4] overflow-hidden bg-[#ECE8E1] shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80"
                alt="Nova Coleção Moda"
                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const FashionSecondaryFeature: React.FC<{ onSelectCategory: (category: string) => void }> = ({
  onSelectCategory,
}) => {
  return (
    <section className="bg-white border-b border-[#DED9D1]/80 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Model Photo */}
          <div className="md:col-span-7 overflow-hidden aspect-[4/3] bg-[#ECE8E1]">
            <img
              src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80"
              alt="Alfaiataria Moderna"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>

          {/* Right Text Block */}
          <div className="md:col-span-5 md:pl-6 space-y-4">
            <span className="text-[10px] font-semibold tracking-[0.25em] text-[#69655F] uppercase block">
              Masculino
            </span>
            <h2 className="text-2xl sm:text-3xl font-light text-[#191918] tracking-tight">
              Alfaiataria moderna
            </h2>
            <p className="text-xs sm:text-sm text-[#69655F] leading-relaxed">
              Cortes precisos e materiais de alta qualidade para o dia a dia. Uma abordagem minimalista para quem valoriza caimento impecável.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSelectCategory('Alfaiataria moderna')}
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[#191918] border-b border-[#191918] pb-1 hover:text-stone-600 hover:border-stone-400 transition"
              >
                <span>Explorar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const FashionCategoriesSection: React.FC<{ onSelectCategory: (category: string) => void }> = ({
  onSelectCategory,
}) => {
  const categories = [
    {
      name: 'Feminino',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80',
    },
    {
      name: 'Masculino',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80',
    },
    {
      name: 'Acessórios',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=80',
    },
  ];

  return (
    <section className="bg-[#F6F4F0] py-16 px-4 sm:px-6 lg:px-8 border-b border-[#DED9D1]/80">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-[10px] font-semibold tracking-[0.22em] text-[#69655F] uppercase block mb-1">
              Categorias
            </span>
            <h2 className="text-2xl sm:text-3xl font-light text-[#191918] tracking-tight">
              Explore por departamento
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium tracking-[0.12em] uppercase text-[#69655F]">
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => onSelectCategory(c.name)}
                className="hover:text-[#191918] transition"
              >
                {c.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onSelectCategory(null as any)}
              className="hover:text-[#191918] transition font-bold text-stone-900 border-l border-stone-300 pl-4"
            >
              Catálogo Completo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {categories.map((c) => (
            <div
              key={c.name}
              onClick={() => onSelectCategory(c.name)}
              className="group relative aspect-[3/4] overflow-hidden bg-[#ECE8E1] cursor-pointer shadow-sm"
            >
              <img
                src={c.image}
                alt={c.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white">
                <span className="text-sm sm:text-base font-light tracking-[0.15em] uppercase">
                  {c.name}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
