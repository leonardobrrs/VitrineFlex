import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { api } from '../../services/api';
import { TechnicalFilterGroup } from '../../types';

interface TechnicalFiltersBarProps {
  storeId: string;
  selectedFilters: Record<string, string[]>;
  onChangeFilters: (filters: Record<string, string[]>) => void;
  primaryColor?: string;
}

export const TechnicalFiltersBar: React.FC<TechnicalFiltersBarProps> = ({
  storeId,
  selectedFilters,
  onChangeFilters,
  primaryColor = '#0f172a',
}) => {
  const [filterGroups, setFilterGroups] = useState<TechnicalFilterGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchFilters = async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/api/v1/catalog/stores/${storeId}/filters`);
        if (isMounted && resp.data?.filters) {
          setFilterGroups(resp.data.filters);
          // Expand the first three groups by default
          const initialExpanded: Record<string, boolean> = {};
          resp.data.filters.forEach((g: TechnicalFilterGroup, idx: number) => {
            const gName = g.name || g.attribute_name || '';
            initialExpanded[gName] = idx < 3;
          });
          setExpandedGroups(initialExpanded);
        }
      } catch (err) {
        console.error('Falha ao carregar filtros técnicos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (storeId) {
      fetchFilters();
    }

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  if (filterGroups.length === 0 && !loading) {
    return null;
  }

  const toggleGroup = (attrName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [attrName]: !prev[attrName],
    }));
  };

  const handleCheckboxChange = (attrName: string, val: string) => {
    const current = selectedFilters[attrName] || [];
    let updated: string[];
    if (current.includes(val)) {
      updated = current.filter((v) => v !== val);
    } else {
      updated = [...current, val];
    }

    const nextFilters = { ...selectedFilters };
    if (updated.length > 0) {
      nextFilters[attrName] = updated;
    } else {
      delete nextFilters[attrName];
    }
    onChangeFilters(nextFilters);
  };

  const totalActive = Object.values(selectedFilters).reduce((acc, arr) => acc + arr.length, 0);

  const clearAllFilters = () => {
    onChangeFilters({});
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between text-xs font-bold text-slate-900"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filtros Técnicos</span>
            {totalActive > 0 && (
              <span
                className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              >
                {totalActive}
              </span>
            )}
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold">
            {isMobileOpen ? 'Ocultar' : 'Ver Filtros'}
          </span>
        </button>
      </div>

      {/* Main Sidebar Card with Single Outer Scroll Area */}
      <aside
        className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col min-h-0 ${
          isMobileOpen ? 'block' : 'hidden lg:flex'
        } lg:max-h-[calc(100vh-6.5rem)]`}
      >
        {/* Fixed Header */}
        <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-800" />
            <h3 className="text-sm font-bold text-slate-900">Filtros Técnicos</h3>
            {totalActive > 0 && (
              <span
                className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full shadow-2xs"
                style={{ backgroundColor: primaryColor }}
              >
                {totalActive}
              </span>
            )}
          </div>
          {totalActive > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="p-5 space-y-3 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-2/3" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-3/4" />
          </div>
        )}

        {/* Single Scrollable Container for all groups */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 pt-3 space-y-5 pr-4 scrollbar-thin">
          {filterGroups.map((group) => {
            const groupName = group.name || group.attribute_name || '';
            const groupOptions = group.options || group.values || [];
            const isExpanded = !!expandedGroups[groupName];
            const selectedInThisGroup = selectedFilters[groupName] || [];

            return (
              <div key={groupName} className="border-b border-slate-100 pb-3.5 last:border-b-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-slate-950 py-1 transition-colors group"
                >
                  <span className="group-hover:text-indigo-600 transition-colors">{groupName}</span>
                  <div className="flex items-center gap-1.5">
                    {selectedInThisGroup.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-full">
                        {selectedInThisGroup.length}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Natural flow for options without inner scrollbar */}
                {isExpanded && (
                  <div className="mt-2.5 space-y-1.5 pl-0.5">
                    {groupOptions.map((val) => {
                      const isChecked = selectedInThisGroup.includes(val);
                      return (
                        <label
                          key={val}
                          className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none py-1 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(groupName, val)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="truncate leading-tight">{val}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with sticky Clear button if filters are active */}
        {totalActive > 0 && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">
              {totalActive} {totalActive === 1 ? 'filtro ativo' : 'filtros ativos'}
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-bold text-rose-600 hover:underline underline-offset-2"
            >
              Limpar Todos
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
