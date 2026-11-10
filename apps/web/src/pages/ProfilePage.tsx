import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { StoreHeader } from '../components/layout/StoreHeader';
import { StoreFooter } from '../components/layout/StoreFooter';
import { Tag, Plus, X, Check, AlertCircle, PackagePlus, Layers, Store } from 'lucide-react';
import { getStoreDisplayName } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, token, loading: authLoading } = useAuth();
  const { manifest } = useStore();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const primaryColor = manifest?.theme_colors?.primary || manifest?.theme?.primary_color || '#1e40af';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (token) {
      fetch('/api/v1/auth/me/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.categories) {
            setCategories(data.categories);
          }
        })
        .catch(() => {});
    }
  }, [user, authLoading, token, navigate]);

  const handleAddCategory = () => {
    const val = newCategory.trim();
    if (val && !categories.includes(val)) {
      setCategories([...categories, val]);
      setNewCategory('');
      setErrorMsg(null);
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };

  const handleSavePreferences = async () => {
    setErrorMsg(null);
    setSaveStatus(null);

    // Client validation matching PB-05 Scenario 2
    if (categories.length === 0) {
      setErrorMsg('A lista de categorias de interesse não pode ser vazia.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/v1/auth/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ categories }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Falha ao salvar preferências.');
      }

      setSaveStatus('Preferências salvas com sucesso!');
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar preferências.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-theme-bg">
        <StoreHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 font-medium">Carregando perfil...</p>
        </div>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-theme-bg">
      <StoreHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                  Papel: {user.role}
                </span>
                {user.role === 'STORE_ADMIN' && user.store_id && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                    <Store className="w-3 h-3 text-blue-600" />
                    <span>Loja: {getStoreDisplayName(user.store_id)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Operational / Administrative Area for STORE_ADMIN & LPS_ADMIN */}
        {user.role === 'STORE_ADMIN' && (
          <div className="bg-blue-50/80 p-6 rounded-2xl border border-blue-200 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <PackagePlus className="w-5 h-5 text-blue-600" />
                <span>Gestão Operacional de Estoque</span>
              </div>
              <p className="text-xs text-blue-700">
                Você é o gestor responsável por <strong>{getStoreDisplayName(user.store_id)}</strong>. Acesse a área de inventário para repor e gerenciar o estoque.
              </p>
            </div>
            <Link
              to="/gestao-loja/estoque"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Estoque da minha loja</span>
            </Link>
          </div>
        )}

        {user.role === 'LPS_ADMIN' && (
          <div className="bg-purple-50/80 p-6 rounded-2xl border border-purple-200 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-base">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>Administração da Plataforma LPS</span>
              </div>
              <p className="text-xs text-purple-700">
                Acesso global para gerenciar lojas, manifestos, regras CTC, usuários e estoque de todos os domínios.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/admin/dashboard"
                className="px-3.5 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold hover:bg-purple-800 transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <Layers className="w-4 h-4" />
                <span>Painel Admin</span>
              </Link>
              <Link
                to="/gestao-loja/estoque"
                className="px-3.5 py-2 bg-white text-purple-900 border border-purple-300 rounded-xl text-xs font-bold hover:bg-purple-100 transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <PackagePlus className="w-4 h-4 text-purple-700" />
                <span>Gestão de Estoque</span>
              </Link>
            </div>
          </div>
        )}

        {/* Categories of Interest */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Categorias de Interesse & Preferências</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Adicione temas do seu interesse para personalizar as sugestões e produtos em destaque nas vitrines.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveStatus && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-emerald-700 text-sm">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{saveStatus}</span>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
              placeholder="Adicionar nova categoria (ex: hardware, livros, vestuário)"
              className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 min-h-[40px] p-3 bg-slate-50 rounded-xl border border-slate-100">
            {categories.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Nenhuma categoria cadastrada. Adicione ao menos uma acima.</span>
            ) : (
              categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-sm"
                >
                  <span>{cat}</span>
                  <button
                    onClick={() => handleRemoveCategory(cat)}
                    className="text-slate-400 hover:text-rose-500 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-white font-medium text-sm shadow-sm transition hover:opacity-95 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? 'Salvando...' : 'Salvar Preferências'}
          </button>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
};
