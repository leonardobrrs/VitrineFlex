import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Shield,
  UserCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  History,
  Lock,
  UserX,
  ShieldAlert,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'STORE_ADMIN' | 'LPS_ADMIN';
  store_id?: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  target_user_id: string;
  actor_id: string;
  details: string;
  created_at: string;
}

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form states - Create
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CUSTOMER' as 'CUSTOMER' | 'STORE_ADMIN' | 'LPS_ADMIN',
    store_id: 'store-tech',
  });

  // Form states - Edit
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'CUSTOMER' as 'CUSTOMER' | 'STORE_ADMIN' | 'LPS_ADMIN',
    store_id: '',
    is_active: true,
    password: '',
  });

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (roleFilter !== 'ALL') params.set('role', roleFilter);

      const url = `/api/v1/auth/admin/users${params.toString() ? `?${params.toString()}` : ''}`;
      const resp = await api.get<AdminUser[]>(url);
      setUsers(resp.data);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const resp = await api.get<AuditLog[]>('/api/v1/auth/admin/audit-logs');
      setAuditLogs(resp.data);
    } catch (err) {
      console.error('Falha ao carregar auditoria de usuários:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (createForm.password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }
    if (createForm.role === 'STORE_ADMIN' && !createForm.store_id) {
      setError('Usuários com papel STORE_ADMIN devem estar associados a uma loja.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const payload: any = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
      };
      if (createForm.role === 'STORE_ADMIN') {
        payload.store_id = createForm.store_id;
      }
      await api.post('/api/v1/auth/admin/users', payload);
      setSuccessMsg(`Usuário "${createForm.name}" criado com sucesso com papel ${createForm.role}.`);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', role: 'CUSTOMER', store_id: 'store-tech' });
      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar usuário.');
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (target: AdminUser) => {
    setUserToEdit(target);
    setEditForm({
      name: target.name,
      email: target.email,
      role: target.role,
      store_id: target.store_id || 'store-tech',
      is_active: target.is_active,
      password: '',
    });
    setError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    if (editForm.role === 'STORE_ADMIN' && !editForm.store_id) {
      setError('Usuários com papel STORE_ADMIN devem estar associados a uma loja.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.role === 'STORE_ADMIN') {
        payload.store_id = editForm.store_id;
      } else {
        payload.store_id = null;
      }
      if (editForm.password.trim()) {
        if (editForm.password.trim().length < 8) {
          setError('A nova senha deve ter no mínimo 8 caracteres.');
          setProcessing(false);
          return;
        }
        payload.password = editForm.password.trim();
      }

      await api.patch(`/api/v1/auth/admin/users/${userToEdit.id}`, payload);
      setSuccessMsg(`Usuário "${editForm.name}" atualizado com sucesso.`);
      setUserToEdit(null);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar usuário.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setProcessing(true);
    setError(null);
    try {
      await api.delete(`/api/v1/auth/admin/users/${userToDelete.id}`);
      setSuccessMsg(`Usuário excluído logicamente com anonimização.`);
      setUserToDelete(null);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir usuário.');
    } finally {
      setProcessing(false);
    }
  };

  const activeCount = users.filter((u) => u.is_active && !u.is_deleted).length;
  const adminCount = users.filter((u) => (u.role === 'LPS_ADMIN' || u.role === 'STORE_ADMIN') && !u.is_deleted).length;
  const customerCount = users.filter((u) => u.role === 'CUSTOMER' && !u.is_deleted).length;

  return (
    <AdminLayout
      title="Gestão de Usuários & Controle de Permissões"
      subtitle="Gerenciamento de identidades, perfis RBAC, credenciais seguras e histórico de auditoria"
      breadcrumbs={[{ label: 'Usuários' }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E7EF] hover:bg-slate-50 transition text-slate-700 shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>{showLogs ? 'Ocultar Auditoria' : 'Auditoria'}</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#172334] text-white hover:bg-slate-800 transition shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Usuário</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Current Auth Session Card */}
        {currentUser && (
          <div className="bg-white p-5 rounded-xl border border-[#E2E7EF] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>Sessão Atual Autenticada: {currentUser.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    JWT Ativo
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{currentUser.email}</span>
                  <span>•</span>
                  <span>ID: {currentUser.id}</span>
                  <span>•</span>
                  <span className="font-semibold text-purple-700">{currentUser.role || 'LPS_ADMIN'}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Proteções Ativas: Auto-rebaixamento e exclusão do último admin bloqueados</span>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E2E7EF] shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total de Contas</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Registradas no Auth Service</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2E7EF] shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Usuários Ativos</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Capazes de realizar login</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2E7EF] shadow-2xs">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Administradores</span>
            <div className="text-2xl font-black text-purple-700 mt-1">{adminCount}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">LPS_ADMIN ou STORE_ADMIN</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2E7EF] shadow-2xs">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Clientes (Customer)</span>
            <div className="text-2xl font-black text-blue-700 mt-1">{customerCount}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Acesso às vitrines de consumo</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E7EF] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Filtrar Papel:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none"
              >
                <option value="ALL">Todos os Papéis</option>
                <option value="LPS_ADMIN">LPS_ADMIN (Plataforma)</option>
                <option value="STORE_ADMIN">STORE_ADMIN (Lojas)</option>
                <option value="CUSTOMER">CUSTOMER (Consumidor)</option>
              </select>
            </div>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Recarregar usuários"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-[#E2E7EF]">
                <tr>
                  <th className="py-3 px-4">Nome & Identificador</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Papel (RBAC)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data de Criação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                          ID: {u.id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            u.role === 'LPS_ADMIN'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : u.role === 'STORE_ADMIN'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            <Shield className="w-3 h-3" />
                            <span>{u.role}</span>
                          </span>
                          {u.role === 'STORE_ADMIN' && u.store_id && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              Loja: {u.store_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.is_deleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-500 line-through">
                            Excluído
                          </span>
                        ) : u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Editar usuário e credenciais"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setUserToDelete(u)}
                            disabled={u.is_deleted}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
                            title="Excluir usuário (Soft Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Panel */}
        {showLogs && (
          <div className="bg-white rounded-xl border border-[#E2E7EF] shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Auditoria de Gestão de Usuários (Sem Senhas / Tokens)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {auditLogs.length} eventos registrados
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum evento registrado até o momento.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg text-xs flex items-center justify-between border border-slate-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800">
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-800">Alvo: {log.target_user_id}</span>
                        <span className="text-slate-400 text-[11px]">por {log.actor_id}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">{log.details}</div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Create User */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Cadastrar Novo Usuário</h3>
                    <p className="text-[11px] text-slate-500">Criação administrativa com papel explícito</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Ex: Ana Clara Souza"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="exemplo@vitrineflex.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Senha Inicial (mínimo 8 caracteres)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Papel de Acesso (RBAC)</label>
                  <select
                    value={createForm.role}
                    onChange={(e: any) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none"
                  >
                    <option value="CUSTOMER">CUSTOMER — Cliente das vitrines (sem acesso admin)</option>
                    <option value="STORE_ADMIN">STORE_ADMIN — Gestor operacional de vitrines</option>
                    <option value="LPS_ADMIN">LPS_ADMIN — Administrador total da LPS e usuários</option>
                  </select>
                </div>

                {createForm.role === 'STORE_ADMIN' && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5 animate-fadeIn">
                    <label className="font-bold text-blue-900 block text-[11px]">
                      Loja Vinculada Obrigatória (STORE_ADMIN)
                    </label>
                    <select
                      value={createForm.store_id}
                      onChange={(e) => setCreateForm({ ...createForm, store_id: e.target.value })}
                      className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-xs text-blue-950 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="store-fashion">Vitrine Moda (store-fashion)</option>
                      <option value="store-tech">Vitrine Tech (store-tech)</option>
                      <option value="store-books">Vitrine Books (store-books)</option>
                    </select>
                    <p className="text-[10px] text-blue-700">
                      O gestor terá acesso restrito às operações e estoque da loja selecionada.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1.5"
                  >
                    {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Salvar Usuário</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit User */}
        {userToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Editar Usuário</h3>
                    <p className="text-[11px] text-slate-500 font-mono">ID: {userToEdit.id}</p>
                  </div>
                </div>
                <button onClick={() => setUserToEdit(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Papel de Acesso (RBAC)</label>
                  <select
                    value={editForm.role}
                    onChange={(e: any) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none"
                  >
                    <option value="CUSTOMER">CUSTOMER — Cliente</option>
                    <option value="STORE_ADMIN">STORE_ADMIN — Gestor Operacional</option>
                    <option value="LPS_ADMIN">LPS_ADMIN — Administrador da Plataforma</option>
                  </select>
                </div>

                {editForm.role === 'STORE_ADMIN' && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5 animate-fadeIn">
                    <label className="font-bold text-blue-900 block text-[11px]">
                      Loja Vinculada Obrigatória (STORE_ADMIN)
                    </label>
                    <select
                      value={editForm.store_id}
                      onChange={(e) => setEditForm({ ...editForm, store_id: e.target.value })}
                      className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-xs text-blue-950 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="store-fashion">Vitrine Moda (store-fashion)</option>
                      <option value="store-tech">Vitrine Tech (store-tech)</option>
                      <option value="store-books">Vitrine Books (store-books)</option>
                    </select>
                    <p className="text-[10px] text-blue-700">
                      Alterar a loja associada restringe imediatamente a gestão operacional de estoque deste usuário.
                    </p>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Redefinir Senha (opcional, deixe em branco para manter)
                  </label>
                  <input
                    type="password"
                    minLength={8}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Nova senha (mínimo 8 caracteres)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActiveToggle" className="font-semibold text-slate-800 cursor-pointer">
                    Conta Ativa (Permite login na plataforma)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setUserToEdit(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1.5"
                  >
                    {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete User */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 flex-shrink-0">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Excluir Usuário "{userToDelete.name}"?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{userToDelete.email}</p>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-2">
                <p className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Exclusão Lógica e Anonimização:</span>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>O usuário será desativado e não poderá mais realizar autenticação.</li>
                  <li>O e-mail e o nome serão anonimizados para cumprimento de privacidade.</li>
                  <li>O histórico de pedidos e auditoria permanece referenciado com integridade.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={processing}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={processing}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-sm flex items-center gap-1.5"
                >
                  {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
