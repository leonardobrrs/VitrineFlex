import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { resolveStoreTheme, StoreTheme } from '../../services/theme';
import {
  User as UserIcon,
  ShoppingCart,
  ShoppingBag,
  Search,
  Heart,
  BookOpen,
  Menu,
  X,
  Layers,
} from 'lucide-react';

export const StoreHeader: React.FC = () => {
  const { manifest, theme: contextTheme } = useStore();
  const { user, logout } = useAuth();
  const { cart, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isLanding = location.pathname === '/' || (!location.pathname.startsWith('/loja') && !manifest);
  const storeSlug = manifest?.store_slug || (manifest as any)?.store?.slug || (location.pathname.startsWith('/loja/') ? location.pathname.split('/')[2] : '');
  
  const effectiveTheme: StoreTheme = isLanding
    ? 'neutral'
    : (contextTheme !== 'neutral'
        ? contextTheme
        : resolveStoreTheme(storeSlug || location.pathname));

  const isFashion = !isLanding && effectiveTheme === 'fashion';
  const isTech = !isLanding && effectiveTheme === 'tech';
  const isBooks = !isLanding && effectiveTheme === 'books';
  const hasFavorites = manifest?.features?.favorites === true;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/loja/${storeSlug}?q=${encodeURIComponent(searchQuery.trim())}#catalogo`);
      setIsSearchOpen(false);
      setMobileMenuOpen(false);
      setTimeout(() => {
        const el = document.getElementById('catalogo');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleCatalogReset = (targetSlug: string) => {
    setSearchQuery('');
    setMobileMenuOpen(false);
    navigate(`/loja/${targetSlug}#catalogo`, { state: { resetCatalog: Date.now() } });
    if (location.pathname === `/loja/${targetSlug}`) {
      const el = document.getElementById('catalogo');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogoClick = (targetSlug: string) => {
    setSearchQuery('');
    setMobileMenuOpen(false);
    navigate(`/loja/${targetSlug}`);
    if (location.pathname === `/loja/${targetSlug}`) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* --------------------------------------------------------------------
          1. HEADER: VITRINE MODA (Contemporary, Editorial, Clean)
          -------------------------------------------------------------------- */}
      {isFashion && (
        <header className="sticky top-0 z-40 bg-[#F6F4F0]/95 backdrop-blur-md border-b border-[#DED9D1] transition-colors">
          {/* Top Announcement Bar */}
          <div className="bg-[#191918] text-[#F6F4F0] text-[11px] py-1.5 px-4 text-center tracking-[0.15em] uppercase font-medium flex items-center justify-center">
            <span>Nova Coleção 2026 — Frete Especial para todo o Brasil</span>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-[#191918] hover:bg-stone-200/50 rounded transition"
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Brand Logo */}
              <div className="flex items-center space-x-8">
                <Link
                  to="/loja/vitrine-moda"
                  onClick={() => handleLogoClick('vitrine-moda')}
                  className="flex flex-col group cursor-pointer"
                >
                  <span className="font-light tracking-[0.28em] text-lg sm:text-xl text-[#191918] uppercase group-hover:text-stone-600 transition">
                    Vitrine Moda
                  </span>
                  <span className="text-[9px] tracking-[0.3em] uppercase text-[#69655F]">
                    Atelier & Coleções
                  </span>
                </Link>

                {/* Editorial Navigation */}
                <nav className="hidden lg:flex items-center space-x-7 text-xs font-medium tracking-[0.12em] text-[#191918] uppercase">
                  <Link to="/loja/vitrine-moda?cat=Feminino" className="hover:text-stone-500 transition">Feminino</Link>
                  <Link to="/loja/vitrine-moda?cat=Masculino" className="hover:text-stone-500 transition">Masculino</Link>
                  <Link to="/loja/vitrine-moda?cat=Acessórios" className="hover:text-stone-500 transition">Acessórios</Link>
                  <Link
                    to="/loja/vitrine-moda#catalogo"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCatalogReset('vitrine-moda');
                    }}
                    className="hover:text-stone-500 transition text-[#69655F] cursor-pointer"
                  >
                    Catálogo Completo
                  </Link>
                </nav>
              </div>

              {/* Right Utility Icons */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-2 text-[#191918] hover:text-stone-600 transition rounded-full hover:bg-stone-200/50"
                  aria-label="Buscar produtos"
                  title="Buscar"
                >
                  <Search className="w-5 h-5 stroke-[1.5]" />
                </button>

                {hasFavorites && (
                  <Link
                    to="/loja/vitrine-moda?fav=true"
                    className="p-2 text-[#191918] hover:text-stone-600 transition rounded-full hover:bg-stone-200/50"
                    aria-label="Ver favoritos"
                    title="Favoritos"
                  >
                    <Heart className="w-5 h-5 stroke-[1.5]" />
                  </Link>
                )}

                {user ? (
                  <Link
                    to="/perfil"
                    className="flex items-center space-x-2 text-xs font-medium text-[#191918] px-2.5 py-1.5 rounded-full hover:bg-stone-200/50 transition"
                    title={`Perfil de ${user.name}`}
                  >
                    <UserIcon className="w-5 h-5 stroke-[1.5]" />
                    <span className="hidden md:inline max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="p-2 text-[#191918] hover:text-stone-600 transition rounded-full hover:bg-stone-200/50"
                    title="Entrar na conta"
                  >
                    <UserIcon className="w-5 h-5 stroke-[1.5]" />
                  </Link>
                )}

                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 text-[#191918] hover:text-stone-600 transition rounded-full hover:bg-stone-200/50"
                  aria-label="Abrir sacola de compras"
                  title="Sacola de Compras"
                >
                  <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                  {(cart?.total_items || 0) > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#191918] text-[#F6F4F0] text-[10px] font-semibold flex items-center justify-center">
                      {cart?.total_items}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible Search Bar */}
            {isSearchOpen && (
              <form onSubmit={handleSearchSubmit} className="py-3 pb-4 border-t border-[#DED9D1]/70 animate-fadeIn">
                <div className="relative max-w-xl mx-auto">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar vestido, camisa, alfaiataria, couro..."
                    className="w-full bg-white border border-[#DED9D1] px-4 py-2.5 text-xs text-[#191918] placeholder-stone-400 focus:outline-none focus:border-[#191918]"
                    autoFocus
                  />
                  <button type="submit" className="absolute right-2.5 top-2.5 text-stone-500 hover:text-stone-900">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </header>
      )}

      {/* --------------------------------------------------------------------
          2. HEADER: VITRINE TECH (Modern, Precise, Clean White with Blue)
          -------------------------------------------------------------------- */}
      {isTech && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DDE1E5] transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-18 py-3">
              {/* Brand Logo & Geometric Icon */}
              <div className="flex items-center space-x-8">
                <Link
                  to="/loja/vitrine-tech"
                  onClick={() => handleLogoClick('vitrine-tech')}
                  className="flex items-center space-x-2.5 group cursor-pointer"
                >
                  <div className="w-6 h-6 border-2 border-[#15181B] rounded-[3px] flex items-center justify-center group-hover:border-[#155EEF] transition">
                    <div className="w-2.5 h-2.5 bg-[#15181B] group-hover:bg-[#155EEF] transition"></div>
                  </div>
                  <span className="font-extrabold tracking-tight text-lg text-[#15181B] uppercase">
                    Vitrine Tech
                  </span>
                </Link>

                {/* Technical Category Navigation */}
                <nav className="hidden lg:flex items-center space-x-6 text-xs font-semibold text-[#626B75]">
                  <Link to="/loja/vitrine-tech?cat=Smartphones" className="hover:text-[#155EEF] transition">Smartphones</Link>
                  <Link to="/loja/vitrine-tech?cat=Notebooks" className="hover:text-[#155EEF] transition">Notebooks</Link>
                  <Link to="/loja/vitrine-tech?cat=Áudio" className="hover:text-[#155EEF] transition">Áudio</Link>
                  <Link to="/loja/vitrine-tech?cat=Acessórios" className="hover:text-[#155EEF] transition">Acessórios</Link>
                  <Link
                    to="/loja/vitrine-tech#catalogo"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCatalogReset('vitrine-tech');
                    }}
                    className="hover:text-[#15181B] transition font-bold text-[#15181B] cursor-pointer"
                  >
                    Todos os Produtos
                  </Link>
                </nav>
              </div>

              {/* Center Search Input */}
              <div className="hidden md:flex flex-1 max-w-sm mx-6">
                <form onSubmit={handleSearchSubmit} className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar hardware, notebooks, fones..."
                    className="w-full bg-[#F5F6F7] border border-[#DDE1E5] rounded-md px-3.5 py-2 pl-9 text-xs text-[#15181B] placeholder-[#626B75] focus:outline-none focus:border-[#155EEF] focus:bg-white transition"
                  />
                  <Search className="w-4 h-4 text-[#626B75] absolute left-3 top-2.5" />
                </form>
              </div>

              {/* Right Utility Icons */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="md:hidden p-2 text-[#15181B] hover:bg-slate-100 rounded-md"
                  aria-label="Buscar"
                >
                  <Search className="w-5 h-5" />
                </button>

                {hasFavorites && (
                  <Link
                    to="/loja/vitrine-tech?fav=true"
                    className="p-2 text-[#626B75] hover:text-[#15181B] hover:bg-slate-100 rounded-md transition"
                    title="Favoritos"
                  >
                    <Heart className="w-5 h-5" />
                  </Link>
                )}

                {user ? (
                  <Link
                    to="/perfil"
                    className="flex items-center space-x-1.5 text-xs font-semibold text-[#15181B] px-3 py-1.5 bg-[#F5F6F7] hover:bg-[#EEF0F2] rounded-md transition"
                  >
                    <UserIcon className="w-4 h-4 text-[#626B75]" />
                    <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="p-2 text-[#626B75] hover:text-[#15181B] hover:bg-slate-100 rounded-md transition"
                    title="Entrar"
                  >
                    <UserIcon className="w-5 h-5" />
                  </Link>
                )}

                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 text-[#15181B] hover:bg-slate-100 rounded-md transition"
                  title="Carrinho"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {(cart?.total_items || 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#155EEF] text-white text-[10px] font-bold flex items-center justify-center">
                      {cart?.total_items}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-[#15181B] hover:bg-slate-100 rounded-md"
                  aria-label="Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Search dropdown */}
            {isSearchOpen && (
              <form onSubmit={handleSearchSubmit} className="md:hidden py-2 pb-3 border-t border-slate-200">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar especificações, modelos..."
                  className="w-full bg-[#F5F6F7] border border-[#DDE1E5] rounded px-3 py-2 text-xs text-[#15181B]"
                  autoFocus
                />
              </form>
            )}
          </div>
        </header>
      )}

      {/* --------------------------------------------------------------------
          3. HEADER: VITRINE BOOKS (Deep Forest Green, Warm Paper, Book Reader)
          -------------------------------------------------------------------- */}
      {isBooks && (
        <header className="sticky top-0 z-40 bg-[#284B3B] text-white shadow-md transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Brand Logo & Editorial Subtitle */}
              <div className="flex items-center space-x-8">
                <Link
                  to="/loja/vitrine-books"
                  onClick={() => handleLogoClick('vitrine-books')}
                  className="flex items-center space-x-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-md border border-emerald-400/30 bg-emerald-950/40 flex items-center justify-center text-emerald-200 group-hover:border-emerald-300 transition">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-lg sm:text-xl text-white tracking-tight leading-none block">
                      Vitrine Books
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-200/70 block mt-0.5">
                      Livraria Online
                    </span>
                  </div>
                </Link>

                {/* Navigation: Livros, Autores, Gêneros, Coleções */}
                <nav className="hidden lg:flex items-center space-x-6 text-xs font-medium text-emerald-100/80">
                  <Link
                    to="/loja/vitrine-books#catalogo"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCatalogReset('vitrine-books');
                    }}
                    className="hover:text-white transition font-semibold text-white cursor-pointer"
                  >
                    Livros
                  </Link>
                  <Link to="/loja/vitrine-books?cat=Literatura" className="hover:text-white transition">Literatura</Link>
                  <Link to="/loja/vitrine-books?cat=Não-Ficção" className="hover:text-white transition">Gêneros</Link>
                  <Link to="/loja/vitrine-books?cat=Clássicos" className="hover:text-white transition">Coleções</Link>
                </nav>
              </div>

              {/* Search Bar Capsule in Header */}
              <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-6">
                <form onSubmit={handleSearchSubmit} className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar livros, autores ou temas..."
                    className="w-full bg-white text-[#211C18] rounded-full px-4 py-2 pl-9 text-xs placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-inner"
                  />
                  <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                </form>
              </div>

              {/* Utility Icons */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="md:hidden p-2 text-emerald-100 hover:text-white hover:bg-emerald-900/40 rounded-full"
                  aria-label="Buscar"
                >
                  <Search className="w-5 h-5" />
                </button>

                {hasFavorites && (
                  <Link
                    to="/loja/vitrine-books?fav=true"
                    className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-900/40 rounded-full transition"
                    title="Livros Salvos"
                  >
                    <Heart className="w-5 h-5" />
                  </Link>
                )}

                {user ? (
                  <Link
                    to="/perfil"
                    className="flex items-center space-x-2 text-xs text-white px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-900/80 rounded-full border border-emerald-700/50 transition"
                  >
                    <UserIcon className="w-4 h-4 text-emerald-200" />
                    <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="p-2 text-emerald-100 hover:text-white hover:bg-emerald-900/40 rounded-full transition"
                    title="Entrar"
                  >
                    <UserIcon className="w-5 h-5" />
                  </Link>
                )}

                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 text-emerald-100 hover:text-white hover:bg-emerald-900/40 rounded-full transition"
                  title="Sacola"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {(cart?.total_items || 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#743A3F] text-white text-[10px] font-bold flex items-center justify-center shadow">
                      {cart?.total_items}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-emerald-100 hover:text-white hover:bg-emerald-900/40 rounded-full"
                  aria-label="Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Search input */}
            {isSearchOpen && (
              <form onSubmit={handleSearchSubmit} className="md:hidden py-3 pb-4 border-t border-emerald-800/80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar títulos, autores..."
                  className="w-full bg-white text-stone-900 rounded-full px-4 py-2 text-xs"
                  autoFocus
                />
              </form>
            )}
          </div>
        </header>
      )}

      {/* --------------------------------------------------------------------
          4. HEADER: NEUTRAL / PORTAL (Multi-store Portal or Fallback)
          -------------------------------------------------------------------- */}
      {!isFashion && !isTech && !isBooks && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  VF
                </div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">VitrineFlex</span>
              </Link>

              <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600">
                <Link to="/loja/vitrine-moda" className="hover:text-purple-700 transition">Vitrine Moda</Link>
                <Link to="/loja/vitrine-tech" className="hover:text-sky-700 transition">Vitrine Tech</Link>
                <Link to="/loja/vitrine-books" className="hover:text-amber-800 transition">Vitrine Books</Link>
                <Link to="/admin/dashboard" className="text-blue-600 hover:underline flex items-center gap-1 font-bold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Painel Admin</span>
                </Link>
              </nav>

              <div className="flex items-center space-x-3">
                {user ? (
                  <Link to="/perfil" className="text-xs font-semibold text-slate-800 px-3 py-1.5 bg-slate-100 rounded-lg">
                    {user.name}
                  </Link>
                ) : (
                  <Link to="/login" className="text-xs font-semibold text-blue-600 px-3 py-1.5 hover:bg-slate-50 rounded-lg">
                    Entrar
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* --------------------------------------------------------------------
          MOBILE NAVIGATION DRAWER (Universal across themes)
          -------------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  Menu de Navegação
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Department links */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Departamentos
                </h4>
                {isFashion && (
                  <div className="flex flex-col space-y-2 text-sm text-stone-800">
                    <Link to="/loja/vitrine-moda?cat=Feminino" onClick={() => setMobileMenuOpen(false)}>Feminino</Link>
                    <Link to="/loja/vitrine-moda?cat=Masculino" onClick={() => setMobileMenuOpen(false)}>Masculino</Link>
                    <Link to="/loja/vitrine-moda?cat=Acessórios" onClick={() => setMobileMenuOpen(false)}>Acessórios</Link>
                    <Link
                      to="/loja/vitrine-moda#catalogo"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCatalogReset('vitrine-moda');
                      }}
                      className="font-bold text-stone-900"
                    >
                      Catálogo Completo
                    </Link>
                  </div>
                )}
                {isTech && (
                  <div className="flex flex-col space-y-2 text-sm text-slate-800">
                    <Link to="/loja/vitrine-tech?cat=Smartphones" onClick={() => setMobileMenuOpen(false)}>Smartphones</Link>
                    <Link to="/loja/vitrine-tech?cat=Notebooks" onClick={() => setMobileMenuOpen(false)}>Notebooks</Link>
                    <Link to="/loja/vitrine-tech?cat=Áudio" onClick={() => setMobileMenuOpen(false)}>Áudio</Link>
                    <Link to="/loja/vitrine-tech?cat=Acessórios" onClick={() => setMobileMenuOpen(false)}>Acessórios</Link>
                    <Link
                      to="/loja/vitrine-tech#catalogo"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCatalogReset('vitrine-tech');
                      }}
                      className="font-bold text-slate-900"
                    >
                      Todos os Produtos
                    </Link>
                  </div>
                )}
                {isBooks && (
                  <div className="flex flex-col space-y-2 text-sm text-stone-800">
                    <Link
                      to="/loja/vitrine-books#catalogo"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCatalogReset('vitrine-books');
                      }}
                      className="font-bold text-stone-900"
                    >
                      Catálogo de Livros
                    </Link>
                    <Link to="/loja/vitrine-books?cat=Literatura" onClick={() => setMobileMenuOpen(false)}>Literatura</Link>
                    <Link to="/loja/vitrine-books?cat=Não-Ficção" onClick={() => setMobileMenuOpen(false)}>Não-Ficção</Link>
                    <Link to="/loja/vitrine-books?cat=Clássicos" onClick={() => setMobileMenuOpen(false)}>Clássicos</Link>
                  </div>
                )}
              </div>

              {/* Vitrine Switcher */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Trocar de Vitrine
                </h4>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  <Link
                    to="/loja/vitrine-moda"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium"
                  >
                    Vitrine Moda
                  </Link>
                  <Link
                    to="/loja/vitrine-tech"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium"
                  >
                    Vitrine Tech
                  </Link>
                  <Link
                    to="/loja/vitrine-books"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-medium"
                  >
                    Vitrine Books
                  </Link>
                </div>
              </div>

              {/* Admin Portal link */}
              <div className="border-t border-slate-100 pt-4">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
                >
                  <Layers className="w-4 h-4" />
                  <span>Acessar Painel Administrativo</span>
                </Link>
              </div>
            </div>

            {/* User Session */}
            <div className="border-t border-slate-100 pt-4">
              {user ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">{user.name}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                  <div className="flex gap-2 pt-2">
                    <Link
                      to="/perfil"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded text-slate-700 hover:bg-slate-200"
                    >
                      Meu Perfil
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-xs font-semibold px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 bg-slate-900 text-white rounded text-xs font-bold"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/cadastro"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 bg-slate-100 text-slate-800 rounded text-xs font-bold"
                  >
                    Cadastre-se
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
