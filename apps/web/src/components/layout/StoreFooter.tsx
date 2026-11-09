import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { resolveStoreTheme, StoreTheme } from '../../services/theme';

export const StoreFooter: React.FC = () => {
  const { manifest, theme: contextTheme } = useStore();
  const location = useLocation();

  const storeSlug = manifest?.store_slug || (manifest as any)?.store?.slug || 'vitrine-moda';
  const effectiveTheme: StoreTheme = contextTheme !== 'neutral'
    ? contextTheme
    : resolveStoreTheme(storeSlug || location.pathname);

  const isFashion = effectiveTheme === 'fashion';
  const isTech = effectiveTheme === 'tech';
  const isBooks = effectiveTheme === 'books';

  return (
    <footer className="mt-auto transition-colors">
      {/* --------------------------------------------------------------------
          1. FOOTER: VITRINE MODA (Editorial, Minimalist, Refined)
          -------------------------------------------------------------------- */}
      {isFashion && (
        <div className="bg-[#191918] text-[#DED9D1] border-t border-[#3A3936] text-xs">
          {/* Trust points */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-[#3A3936]/60">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
              <div className="space-y-1">
                <h4 className="text-[#F6F4F0] font-medium tracking-[0.15em] uppercase text-xs">Alfaiataria & Caimento</h4>
                <p className="text-[11px] text-[#A6A29A]">Cortes autorais com tecidos de alta durabilidade e guia de medidas.</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-[#F6F4F0] font-medium tracking-[0.15em] uppercase text-xs">Envio Especial</h4>
                <p className="text-[11px] text-[#A6A29A]">Embalagens sustentáveis com rastreamento integral em todas as etapas.</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-[#F6F4F0] font-medium tracking-[0.15em] uppercase text-xs">Trocas Descomplicadas</h4>
                <p className="text-[11px] text-[#A6A29A]">Primeira troca gratuita em até 30 dias para qualquer peça do catálogo.</p>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              <div className="space-y-3">
                <span className="font-light tracking-[0.25em] text-sm text-[#F6F4F0] uppercase block">
                  Vitrine Moda
                </span>
                <p className="text-[11px] text-[#A6A29A] leading-relaxed">
                  Design contemporâneo, peças atemporais e curadoria de vestuário focada em versatilidade e estilo.
                </p>
              </div>

              <div>
                <h5 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F6F4F0] mb-3">Coleções</h5>
                <ul className="space-y-2 text-[11px] text-[#A6A29A]">
                  <li><Link to="/loja/vitrine-moda?cat=Feminino" className="hover:text-white transition">Feminino</Link></li>
                  <li><Link to="/loja/vitrine-moda?cat=Masculino" className="hover:text-white transition">Masculino</Link></li>
                  <li><Link to="/loja/vitrine-moda?cat=Acessórios" className="hover:text-white transition">Acessórios</Link></li>
                  <li><Link to="/loja/vitrine-moda" className="hover:text-white transition">Catálogo Geral</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F6F4F0] mb-3">Vitrines da Rede</h5>
                <ul className="space-y-2 text-[11px] text-[#A6A29A]">
                  <li><Link to="/loja/vitrine-tech" className="hover:text-white transition">Vitrine Tech (Hardware & Eletrônicos)</Link></li>
                  <li><Link to="/loja/vitrine-books" className="hover:text-white transition">Vitrine Books (Livraria Online)</Link></li>
                  <li><Link to="/" className="hover:text-white transition">Portal Multiloja</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F6F4F0] mb-3">Plataforma</h5>
                <ul className="space-y-2 text-[11px] text-[#A6A29A]">
                  <li><Link to="/perfil" className="hover:text-white transition">Minha Conta</Link></li>
                  <li><Link to="/loja/vitrine-moda/pedidos" className="hover:text-white transition">Meus Pedidos</Link></li>
                  <li><Link to="/admin/dashboard" className="text-stone-300 hover:text-white font-semibold transition">Painel Administrativo</Link></li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-[#3A3936]/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#A6A29A] gap-4">
              <p>© 2026 Vitrine Moda • Uma linha de produto VitrineFlex.</p>
              <p className="text-[10px] tracking-widest uppercase">UFAL — Engenharia de Software</p>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          2. FOOTER: VITRINE TECH (Modern Tech, Clean Specs, High Reliability)
          -------------------------------------------------------------------- */}
      {isTech && (
        <div className="bg-[#15181B] text-[#DDE1E5] border-t border-slate-800 text-xs">
          {/* Trust bar */}
          <div className="border-b border-slate-800 bg-[#1D2125]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-center space-x-3">
                  <Truck className="w-5 h-5 text-[#155EEF]" />
                  <div>
                    <h5 className="font-bold text-white text-xs">Entrega rápida</h5>
                    <p className="text-[11px] text-slate-400">Para todo o Brasil com rastreio</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <RotateCcw className="w-5 h-5 text-[#155EEF]" />
                  <div>
                    <h5 className="font-bold text-white text-xs">Troca fácil</h5>
                    <p className="text-[11px] text-slate-400">Até 7 dias sem burocracia</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-5 h-5 text-[#155EEF]" />
                  <div>
                    <h5 className="font-bold text-white text-xs">Compra segura</h5>
                    <p className="text-[11px] text-slate-400">Dados protegidos de ponta a ponta</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-[#155EEF]" />
                  <div>
                    <h5 className="font-bold text-white text-xs">Parcelamento</h5>
                    <p className="text-[11px] text-slate-400">Em até 12x sem juros no cartão</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-white font-bold text-sm tracking-tight uppercase">
                  <div className="w-4 h-4 border-2 border-white rounded-[2px] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white"></div>
                  </div>
                  <span>Vitrine Tech</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Dispositivos de alto rendimento, hardware especializado e comparativo técnico detalhado para decisões inteligentes.
                </p>
              </div>

              <div>
                <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Categorias Tech</h5>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li><Link to="/loja/vitrine-tech?cat=Smartphones" className="hover:text-white transition">Smartphones & 5G</Link></li>
                  <li><Link to="/loja/vitrine-tech?cat=Notebooks" className="hover:text-white transition">Notebooks & Ultrabooks</Link></li>
                  <li><Link to="/loja/vitrine-tech?cat=Áudio" className="hover:text-white transition">Áudio Hi-Res & Fones</Link></li>
                  <li><Link to="/loja/vitrine-tech?cat=Acessórios" className="hover:text-white transition">Periféricos & Acessórios</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Rede VitrineFlex</h5>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li><Link to="/loja/vitrine-moda" className="hover:text-white transition">Vitrine Moda (Vestuário)</Link></li>
                  <li><Link to="/loja/vitrine-books" className="hover:text-white transition">Vitrine Books (Livros)</Link></li>
                  <li><Link to="/admin/dashboard" className="text-[#155EEF] hover:underline font-bold transition">Acessar Painel da Plataforma</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Conta & Suporte</h5>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li><Link to="/perfil" className="hover:text-white transition">Minha Conta</Link></li>
                  <li><Link to="/loja/vitrine-tech/pedidos" className="hover:text-white transition">Histórico de Pedidos</Link></li>
                  <li><Link to="/loja/vitrine-tech?fav=true" className="hover:text-white transition">Produtos Favoritos</Link></li>
                </ul>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p>© 2026 Vitrine Tech • Plataforma VitrineFlex. Todos os direitos reservados.</p>
              <p>Segurança criptográfica via JWT e Saga Orquestrada.</p>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          3. FOOTER: VITRINE BOOKS (Warm Paper, Deep Forest Green, Literary)
          -------------------------------------------------------------------- */}
      {isBooks && (
        <div className="bg-[#1F3C2F] text-emerald-100/80 border-t border-emerald-900 text-xs">
          {/* Literary quote banner */}
          <div className="bg-[#172E24] border-b border-emerald-900/60 py-6 text-center px-4">
            <blockquote className="font-serif italic text-emerald-100 text-sm max-w-xl mx-auto">
              "Um livro é um dispositivo mágico que transporta a mente para infinitos tempos e mundos."
            </blockquote>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-white font-semibold text-base">
                  <BookOpen className="w-5 h-5 text-emerald-300" />
                  <span>Vitrine Books</span>
                </div>
                <p className="text-[11px] text-emerald-200/70 leading-relaxed">
                  Livraria online independente com curadoria de literatura clássica, contemporânea, não-ficção e edições especiais com prévia de leitura.
                </p>
              </div>

              <div>
                <h5 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Catálogo</h5>
                <ul className="space-y-2 text-xs text-emerald-200/70">
                  <li><Link to="/loja/vitrine-books?cat=Literatura" className="hover:text-white transition">Literatura Brasileira & Estrangeira</Link></li>
                  <li><Link to="/loja/vitrine-books?cat=Clássicos" className="hover:text-white transition">Clássicos Essenciais</Link></li>
                  <li><Link to="/loja/vitrine-books?cat=Não-Ficção" className="hover:text-white transition">Ensaios & Não-Ficção</Link></li>
                  <li><Link to="/loja/vitrine-books" className="hover:text-white transition">Todos os Títulos</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Outras Vitrines</h5>
                <ul className="space-y-2 text-xs text-emerald-200/70">
                  <li><Link to="/loja/vitrine-moda" className="hover:text-white transition">Vitrine Moda</Link></li>
                  <li><Link to="/loja/vitrine-tech" className="hover:text-white transition">Vitrine Tech</Link></li>
                  <li><Link to="/admin/dashboard" className="text-emerald-300 hover:underline font-bold transition">Painel Administrativo LPS</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Sua Estante</h5>
                <ul className="space-y-2 text-xs text-emerald-200/70">
                  <li><Link to="/perfil" className="hover:text-white transition">Conta de Leitor</Link></li>
                  <li><Link to="/loja/vitrine-books/pedidos" className="hover:text-white transition">Meus Pedidos de Livros</Link></li>
                  <li><Link to="/loja/vitrine-books?fav=true" className="hover:text-white transition">Livros Favoritados</Link></li>
                </ul>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-emerald-900/80 flex flex-col sm:flex-row justify-between items-center text-[11px] text-emerald-300/60 gap-3">
              <p>© 2026 Vitrine Books • Ficha catalográfica padronizada e ISBN oficial.</p>
              <p>LPS VitrineFlex — Engenharia de Software UFAL</p>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          4. FOOTER: NEUTRAL / PORTAL
          -------------------------------------------------------------------- */}
      {!isFashion && !isTech && !isBooks && (
        <div className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-white text-sm">VitrineFlex</span>
              <span className="text-slate-500">•</span>
              <span className="text-[11px]">Plataforma de Linha de Produto de Software</span>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <Link to="/loja/vitrine-moda" className="hover:text-white">Moda</Link>
              <Link to="/loja/vitrine-tech" className="hover:text-white">Tech</Link>
              <Link to="/loja/vitrine-books" className="hover:text-white">Livros</Link>
              <Link to="/admin/dashboard" className="text-blue-400 hover:underline font-bold">Painel Admin</Link>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
