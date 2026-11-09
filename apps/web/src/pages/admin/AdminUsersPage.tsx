import React from 'react';
import { Shield, Key, UserCheck } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <AdminLayout
      title="Gestão de Usuários e Controle de Acesso"
      subtitle="Identidades registradas, sessões autenticadas e papéis administrativos"
      breadcrumbs={[{ label: 'Usuários' }]}
    >
      <div className="space-y-6">
        {/* Active Session Card */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Sessão Atual Autenticada</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
              JWT Bearer
            </span>
          </div>

          {user ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Usuário / E-mail:</span>
                <div className="font-semibold text-slate-900 mt-0.5">{user.email}</div>
              </div>
              <div>
                <span className="text-slate-400">Identificador (ID):</span>
                <div className="font-mono text-slate-700 mt-0.5">{user.id}</div>
              </div>
              <div>
                <span className="text-slate-400">Perfil de Acesso:</span>
                <div className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Autenticado (Consumidor / Admin)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-2">
              Nenhuma sessão de usuário ativa no navegador no momento. O painel está em modo de inspeção de infraestrutura.
            </div>
          )}
        </div>

        {/* Security Policy Card */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs space-y-2 text-xs text-slate-600">
          <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-amber-600" />
            <span>Mecanismo de Autenticação Segura (Auth Service :8001)</span>
          </h3>
          <p className="leading-relaxed">
            As credenciais são validadas com hash seguro via Argon2/Bcrypt no Auth Service. O token JWT emitido é assinado
            com algoritmo HS256 e transmitido no cabeçalho <code className="font-mono text-slate-800">Authorization: Bearer</code>. O API Gateway (:8000) valida a integridade do token antes de rotear as requisições privadas para os microsserviços internos.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};
