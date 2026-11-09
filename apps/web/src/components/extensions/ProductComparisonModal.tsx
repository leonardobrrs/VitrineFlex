import React, { useState, useEffect } from 'react';
import { X, Scale } from 'lucide-react';
import { Product } from '../../types';

interface ProductComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  selectedProductIds: string[];
}

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  isOpen,
  onClose,
  storeId,
  selectedProductIds,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || selectedProductIds.length < 2) return;

    const fetchComparison = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = selectedProductIds.join(',');
        const resp = await fetch(
          `http://localhost:8000/api/v1/catalog/products/compare?store_id=${storeId}&product_ids=${query}`
        );
        if (resp.ok) {
          const data = await resp.json();
          setProducts(data.products);
        } else {
          const errData = await resp.json();
          setError(errData.error?.message || 'Erro ao carregar comparação de produtos.');
        }
      } catch (e) {
        setError('Falha de conexão com o Gateway ao comparar produtos.');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [isOpen, storeId, selectedProductIds]);

  if (!isOpen) return null;

  // Extract all attribute names across products
  const attributeNames = Array.from(
    new Set(products.flatMap((p) => p.attributes?.map((a) => a.name) || []))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2 text-indigo-700">
            <Scale className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">
              Comparador de Produtos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="py-12 text-center text-sm text-gray-500">
              Carregando dados comparativos dos produtos...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="divide-x divide-gray-200">
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                      Especificação
                    </th>
                    {products.map((p) => (
                      <th
                        key={p.id}
                        className="px-4 py-3 bg-white text-left text-xs font-bold text-gray-900 w-1/3"
                      >
                        <div className="line-clamp-1">{p.title}</div>
                        <div className="text-sm font-extrabold text-indigo-600 mt-0.5">
                          R$ {p.price.toFixed(2)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-xs">
                  <tr className="divide-x divide-gray-100 bg-gray-50/40">
                    <td className="px-4 py-2.5 font-semibold text-gray-600">Categoria</td>
                    {products.map((p) => (
                      <td key={p.id} className="px-4 py-2.5 text-gray-700">
                        {p.category}
                      </td>
                    ))}
                  </tr>
                  <tr className="divide-x divide-gray-100">
                    <td className="px-4 py-2.5 font-semibold text-gray-600">Estoque Disponível</td>
                    {products.map((p) => (
                      <td key={p.id} className="px-4 py-2.5 font-bold text-emerald-700">
                        {p.stock_quantity} unidades
                      </td>
                    ))}
                  </tr>

                  {/* Attributes Comparison */}
                  {attributeNames.map((attrName, idx) => (
                    <tr
                      key={attrName}
                      className={`divide-x divide-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-2.5 font-semibold text-gray-700 capitalize">
                        {attrName.replace(/_/g, ' ')}
                      </td>
                      {products.map((p) => {
                        const val = p.attributes.find((a) => a.name === attrName)?.value || '—';
                        return (
                          <td key={p.id} className="px-4 py-2.5 text-gray-800">
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
