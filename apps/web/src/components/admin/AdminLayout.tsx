import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sliders,
  Sparkles,
  FileCode2,
  GitBranch,
  Activity,
  Server,
  Database,
  Terminal,
  Users,
  Settings,
  Store,
  ExternalLink,
  Menu,
  X,
  ChevronRight,
  BookOpen,
  Laptop,
  Shirt,
} from 'lucide-react';
import { applyStoreTheme } from '../../services/theme';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
}) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock admin theme on mount
  useEffect(() => {
    applyStoreTheme('admin');
  }, []);

  const navSections = [
    {
      label: 'VISÃO GERAL',
      items: [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      label: 'LINHA DE PRODUTO (LPS)',
      items: [
        { label: 'Gerenciar Lojas', path: '/admin/lojas', icon: Store },
        { label: 'Configurador', path: '/admin/configurador', icon: Sliders },
        { label: 'Catálogo de Features', path: '/admin/features', icon: Sparkles },
        { label: 'Manifestos de Vitrines', path: '/admin/manifestos', icon: FileCode2 },
        { label: 'Regras de Variabilidade', path: '/admin/regras', icon: GitBranch },
      ],
    },
    {
      label: 'SISTEMA & INFRA',
      items: [
        { label: 'Diagnóstico de Portas', path: '/admin/diagnostico', icon: Activity },
        { label: '9 Microsserviços', path: '/admin/microsservicos', icon: Server },
        { label: 'Bancos SQLite (WAL)', path: '/admin/bancos', icon: Database },
        { label: 'Logs & Diagnóstico', path: '/admin/logs', icon: Terminal },
      ],
    },
    {
      label: 'PLATAFORMA',
      items: [
        { label: 'Usuários & Acesso', path: '/admin/usuarios', icon: Users },
        { label: 'Configurações Globais', path: '/admin/configuracoes', icon: Settings },
      ],
    },
  ];

  const stores = [
    { name: 'Vitrine Moda', path: '/loja/vitrine-moda', icon: Shirt, color: 'text-rose-400' },
    { name: 'Vitrine Tech', path: '/loja/vitrine-tech', icon: Laptop, color: 'text-blue-400' },
    { name: 'Vitrine Books', path: '/loja/vitrine-books', icon: BookOpen, color: 'text-emerald-400' },
  ];

  const isCurrentPath = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#172334] text-[#E2E7EF] border-r border-[#24364B]">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#24364B] flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-md font-bold">
            VF
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              <span>VITRINEFLEX</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#24364B] text-blue-300">LPS</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Painel Administrativo</p>
          </div>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#24364B]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((sec) => (
          <div key={sec.label} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {sec.label}
            </h4>
            <div className="space-y-0.5 pt-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = isCurrentPath(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#2563EB] text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-[#24364B] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Vitrines Públicas */}
        <div className="space-y-1 pt-2 border-t border-[#24364B]">
          <h4 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
            <span>VITRINES DERIVADAS</span>
            <Store className="w-3 h-3 text-slate-500" />
          </h4>
          <div className="space-y-0.5 pt-1">
            {stores.map((st) => {
              const StoreIconComponent = st.icon;
              return (
                <Link
                  key={st.path}
                  to={st.path}
                  target="_blank"
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-[#24364B] hover:text-white transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIconComponent className={`w-3.5 h-3.5 ${st.color}`} />
                    <span>{st.name}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 opacity-60" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-[#24364B] bg-[#131E2D] flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="truncate">Core LPS v1.0.0</span>
        </div>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline shrink-0 text-[10px] font-mono"
        >
          API Docs
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#182230] flex">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full z-50">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#E2E7EF] h-16 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb & Path */}
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              <Link to="/admin" className="hover:text-slate-800 font-medium">
                Admin
              </Link>
              {breadcrumbs?.map((bc, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {bc.href ? (
                    <Link to={bc.href} className="hover:text-slate-800">
                      {bc.label}
                    </Link>
                  ) : (
                    <span className="text-slate-800 font-semibold truncate">{bc.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Operational Status Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistema Operacional</span>
            </div>

            {/* Context Actions */}
            {actions}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Page Title Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
            <div>
              <h1 className="text-2xl font-black text-[#182230] tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-[#667085] mt-1">{subtitle}</p>}
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
};
