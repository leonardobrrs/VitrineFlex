import React from 'react';
import {
  ArrowRight,
} from 'lucide-react';

export const TechHero: React.FC<{
  onScrollToCatalog: () => void;
}> = ({ onScrollToCatalog }) => {
  return (
    <section className="bg-white border-b border-[#DDE1E5] py-10 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text */}
          <div className="lg:col-span-5 space-y-5">
            <span className="text-xs font-mono font-bold text-[#155EEF] tracking-wider uppercase">
              [ Lançamento ]
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#15181B] tracking-tight uppercase leading-[1.1]">
              VTX Headphones 2
            </h1>

            <p className="text-xs sm:text-sm text-[#626B75] leading-relaxed max-w-md">
              Áudio imersivo, design icônico. Cancelamento de ruído ativo (ANC) adaptativo, drivers de alta precisão e até 40h de autonomia contínua.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onScrollToCatalog}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#155EEF] hover:bg-[#124CC4] text-white text-xs font-bold rounded-md transition shadow-sm"
              >
                <span>Conhecer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Product Image Isolate */}
          <div className="lg:col-span-4 flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"
                alt="VTX Headphones 2"
                className="max-h-full max-w-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Right Highlights Column */}
          <div className="lg:col-span-3 space-y-6 lg:border-l lg:border-[#DDE1E5] lg:pl-8">
            <div className="space-y-1">
              <span className="text-xl font-extrabold text-[#15181B] tracking-tight block">
                ANC
              </span>
              <p className="text-xs text-[#626B75]">Cancelamento ativo de ruído ambiente</p>
            </div>

            <div className="h-px bg-[#DDE1E5]" />

            <div className="space-y-1">
              <span className="text-xl font-extrabold text-[#15181B] tracking-tight block">
                40h
              </span>
              <p className="text-xs text-[#626B75]">Até 40 horas de bateria com recarga rápida</p>
            </div>

            <div className="h-px bg-[#DDE1E5]" />

            <div className="space-y-1">
              <span className="text-xl font-extrabold text-[#15181B] tracking-tight block">
                Hi-Res
              </span>
              <p className="text-xs text-[#626B75]">Áudio de alta resolução certificado</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const TechCategoryTiles: React.FC<{ onSelectCategory: (cat: string) => void }> = ({
  onSelectCategory,
}) => {
  const tiles = [
    {
      name: 'Smartphones',
      sub: '5G & Câmeras Pro',
      img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Notebooks',
      sub: 'Ultrabooks & Setup',
      img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Áudio',
      sub: 'Hi-Res & Fones',
      img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=500&q=80',
    },
    {
      name: 'Acessórios',
      sub: 'Hubs, Cabos & Carga',
      img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=500&q=80',
    },
  ];

  return (
    <section className="bg-[#F5F6F7] py-8 px-4 sm:px-6 lg:px-8 border-b border-[#DDE1E5]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiles.map((t) => (
            <div
              key={t.name}
              onClick={() => onSelectCategory(t.name)}
              className="bg-white border border-[#DDE1E5] rounded-lg p-3.5 flex items-center justify-between cursor-pointer hover:border-[#155EEF] hover:shadow-sm transition group"
            >
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#15181B] group-hover:text-[#155EEF] transition">
                  {t.name}
                </h4>
                <p className="text-[10px] text-[#626B75] mt-0.5">{t.sub}</p>
                <div className="mt-2 inline-flex items-center text-[10px] font-bold text-[#155EEF] group-hover:translate-x-1 transition-transform">
                  <span>Explorar</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </div>
              <div className="w-12 h-12 rounded bg-[#F5F6F7] p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={t.img} alt={t.name} className="w-full h-full object-contain" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const TechComparatorCallout: React.FC<{ onOpenCompare: () => void }> = ({ onOpenCompare }) => {
  return (
    <section className="bg-white border-b border-[#DDE1E5] py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-mono font-bold text-[#155EEF] tracking-wider uppercase">
              [ Comparador ]
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#15181B] tracking-tight">
              Compare e escolha o ideal para você.
            </h2>
            <p className="text-xs sm:text-sm text-[#626B75] leading-relaxed">
              Compare especificações, desempenho e recursos lado a lado e encontre o melhor produto para a sua rotina.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenCompare}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#15181B] hover:bg-[#155EEF] text-white text-xs font-bold rounded-md transition shadow-sm"
              >
                <span>Comparar produtos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Comparison Table Preview */}
          <div className="lg:col-span-7 bg-[#F5F6F7] border border-[#DDE1E5] rounded-xl p-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DDE1E5]">
                  <th className="pb-3 text-[#626B75] font-semibold text-[11px]">Especificação</th>
                  <th className="pb-3 text-[#15181B] font-bold">Dell XPS 15</th>
                  <th className="pb-3 text-[#155EEF] font-bold">MacBook Pro 16</th>
                  <th className="pb-3 text-[#15181B] font-bold">Lenovo Legion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE1E5]/60 text-[11px] text-[#15181B]">
                <tr>
                  <td className="py-2.5 font-semibold text-[#626B75]">Tela</td>
                  <td className="py-2.5">15.6" OLED 3.5K</td>
                  <td className="py-2.5 font-semibold text-[#155EEF]">16.2" Liquid Retina XDR</td>
                  <td className="py-2.5">16" QHD 165Hz</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-[#626B75]">Processador</td>
                  <td className="py-2.5">Intel Core i9 13ª</td>
                  <td className="py-2.5 font-semibold text-[#155EEF]">Apple M3 Max</td>
                  <td className="py-2.5">AMD Ryzen 7 7840HS</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-[#626B75]">Memória RAM</td>
                  <td className="py-2.5">32 GB DDR5</td>
                  <td className="py-2.5 font-semibold text-[#155EEF]">36 GB Unificada</td>
                  <td className="py-2.5">16 GB DDR5</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-[#626B75]">Armazenamento</td>
                  <td className="py-2.5">1 TB NVMe SSD</td>
                  <td className="py-2.5 font-semibold text-[#155EEF]">1 TB SSD ultra-rápido</td>
                  <td className="py-2.5">512 GB NVMe</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
