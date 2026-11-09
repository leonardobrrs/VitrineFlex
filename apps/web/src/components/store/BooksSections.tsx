import React from 'react';
import { ArrowRight } from 'lucide-react';

export const BooksHero: React.FC<{ onScrollToCatalog: () => void }> = ({ onScrollToCatalog }) => {
  return (
    <section className="bg-[#F5F0E6] border-b border-[#DED2C1] py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-6">
            <div className="w-12 h-0.5 bg-[#211C18]" />

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#211C18] tracking-tight leading-[1.15]">
              Livros que <br />
              <span className="italic font-normal">ampliam o mundo</span>
            </h1>

            <p className="text-sm sm:text-base text-[#685A4F] italic leading-relaxed max-w-md">
              Uma curadoria especial de obras que inspiram, informam e acompanham você em cada nova história.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onScrollToCatalog}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#743A3F] hover:bg-[#5E2E33] text-white text-xs font-semibold rounded transition shadow-sm"
              >
                <span>Explorar a curadoria</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Reading Scene Image */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-[4/3] rounded-md overflow-hidden shadow-xl border border-[#DED2C1]">
              <img
                src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1000&q=80"
                alt="Ambiente de leitura"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const BooksCollectionsSection: React.FC<{ onSelectCategory: (cat: string) => void }> = ({
  onSelectCategory,
}) => {
  const collections = [
    {
      title: 'Clássicos essenciais',
      cat: 'Clássicos',
      img: 'https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Literatura contemporânea',
      cat: 'Literatura',
      img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Vozes do mundo',
      cat: 'Não-Ficção',
      img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <section className="bg-[#FBF8F1] py-14 px-4 sm:px-6 lg:px-8 border-b border-[#DED2C1]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <span className="text-[10px] font-bold tracking-[0.22em] text-[#743A3F] uppercase block mb-1">
            Coleções Especiais
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#211C18] tracking-tight">
            Seleções curadas para leitores exigentes
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {collections.map((col) => (
            <div
              key={col.title}
              onClick={() => onSelectCategory(col.cat)}
              className="group relative aspect-[16/10] rounded-md overflow-hidden cursor-pointer shadow-sm border border-[#DED2C1]"
            >
              <img
                src={col.img}
                alt={col.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors" />
              <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
                <h3 className="font-serif text-lg leading-tight group-hover:text-amber-200 transition">
                  {col.title}
                </h3>
                <div className="mt-2 inline-flex items-center text-xs font-semibold text-emerald-200 group-hover:translate-x-1 transition-transform">
                  <span>Ver coleção</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const BooksAuthorFeature: React.FC<{ onSelectCategory: (cat: string) => void }> = ({
  onSelectCategory,
}) => {
  return (
    <section className="bg-[#EEE5D8] border-b border-[#DED2C1] py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Library photo */}
          <div className="md:col-span-5 aspect-[4/3] rounded overflow-hidden shadow-md">
            <img
              src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80"
              alt="Estante de livros"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Author info */}
          <div className="md:col-span-7 md:pl-6 space-y-4">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#743A3F] uppercase block">
              Autor em Destaque
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#211C18] tracking-tight">
              Clarice Lispector
            </h2>
            <p className="text-xs sm:text-sm text-[#685A4F] leading-relaxed">
              Uma das vozes mais singulares da literatura brasileira, Clarice Lispector explora com profundidade a condição humana, o cotidiano e o mistério de existir.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSelectCategory('Literatura')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#743A3F] hover:bg-[#5E2E33] text-white text-xs font-semibold rounded transition shadow-sm"
              >
                <span>Conhecer as obras</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const BooksGenreBar: React.FC<{
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
}> = ({ selectedGenre, onSelectGenre }) => {
  const genres = [
    'Todos',
    'Romance',
    'Contos',
    'Não Ficção',
    'Poesia',
    'Fantasia',
    'Ciência',
    'Biografia',
  ];

  return (
    <div className="bg-[#F5F0E6] border-b border-[#DED2C1] py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 sm:gap-4">
        <span className="text-xs font-serif font-bold text-[#211C18] mr-2">
          Explore por gênero:
        </span>
        {genres.map((g) => {
          const isSelected = (!selectedGenre && g === 'Todos') || selectedGenre === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onSelectGenre(g === 'Todos' ? null : g)}
              className={`text-xs px-3 py-1 rounded-full transition ${
                isSelected
                  ? 'bg-[#284B3B] text-white font-bold shadow-sm'
                  : 'text-[#685A4F] hover:text-[#211C18] hover:bg-[#DED2C1]/50'
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
};
