import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ProductAttribute } from '../../types';

interface TechnicalSpecificationsTableProps {
  attributes: ProductAttribute[];
  hasWarrantyInfo?: boolean;
}

export const TechnicalSpecificationsTable: React.FC<TechnicalSpecificationsTableProps> = ({
  attributes,
  hasWarrantyInfo = true,
}) => {
  if (!attributes || attributes.length === 0) {
    return null;
  }

  const warrantyAttr = attributes.find(
    (a) => a.name.toLowerCase().includes('warranty') || a.name.toLowerCase().includes('garantia')
  );
  const specAttrs = attributes.filter(
    (a) => !a.name.toLowerCase().includes('warranty') && !a.name.toLowerCase().includes('garantia')
  );

  return (
    <div className="space-y-2 pt-2">
      {hasWarrantyInfo && warrantyAttr && (
        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/90 px-2.5 py-1 rounded-md border border-emerald-200/80 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Garantia: {warrantyAttr.value}</span>
        </div>
      )}

      {specAttrs.length > 0 && (
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs space-y-1.5">
          {specAttrs.slice(0, 4).map((attr, idx) => (
            <div key={attr.id || idx} className="flex justify-between items-baseline gap-2">
              <span className="text-slate-500 font-medium capitalize text-[11px]">
                {attr.name.replace(/_/g, ' ')}
              </span>
              <span className="font-semibold text-slate-800 text-right truncate max-w-[60%]">
                {attr.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
