import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, CreditCard, Sliders, Activity } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const StoreFooter: React.FC = () => {
  const { manifest } = useStore();
  const primaryColor = manifest?.theme?.primary_color || '#1e40af';

  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto border-t border-slate-800 text-xs">
      {/* Consumer Trust Banner */}
      <div className="border-b border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3 text-slate-300">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-xs">Entrega ou Retirada</h4>
                <p className="text-[11px] text-slate-400">Modalidades validadas por região</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-slate-300">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-xs">Compra 100% Segura</h4>
                <p className="text-[11px] text-slate-400">Autenticação com criptografia forte</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-slate-300">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-xs">Pagamento Flexível</h4>
                <p className="text-[11px] text-slate-400">PIX, Cartão de Crédito e Boleto</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-extrabold text-base">
              <span>VitrineFlex</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Plataforma de comércio eletrônico multissetorial com catálogos especializados em Moda, Tecnologia e Livros.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Vitrines</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/loja/vitrine-moda" className="hover:text-white transition">
                  Vitrine Moda (Vestuário & Calçados)
                </Link>
              </li>
              <li>
                <Link to="/loja/vitrine-tech" className="hover:text-white transition">
                  Vitrine Tech (Eletrônicos & Hardware)
                </Link>
              </li>
              <li>
                <Link to="/loja/vitrine-books" className="hover:text-white transition">
                  Vitrine Books (Livros & Literatura)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Minha Conta</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-white transition">
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition">
                  Cadastrar nova conta
                </Link>
              </li>
              <li>
                <Link to="/perfil" className="hover:text-white transition">
                  Preferências de compra
                </Link>
              </li>
              <li>
                <Link to="/pedidos" className="hover:text-white transition">
                  Histórico de pedidos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Ferramentas de Engenharia</h4>
            <div className="space-y-2">
              <Link
                to="/admin/configurador"
                className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-200 transition"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Configurador de Variabilidade LPS</span>
              </Link>
              <Link
                to="/admin/diagnostico"
                className="flex items-center space-x-1.5 text-slate-400 hover:text-emerald-400 transition"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Painel de Saúde dos Serviços</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-slate-500 text-[11px]">
          <span>&copy; 2026 VitrineFlex. Universidade Federal de Alagoas (UFAL).</span>
          <span className="mt-2 sm:mt-0 text-slate-500">
            Linha de Produto de Software Multissetorial
          </span>
        </div>
      </div>
    </footer>
  );
};
