import React from 'react';
import { User, Building, BookMarked } from 'lucide-react';
import { ProductAttribute } from '../../types';

interface BookMetadataPanelProps {
  attributes: ProductAttribute[];
}

export const BookMetadataPanel: React.FC<BookMetadataPanelProps> = ({ attributes }) => {
  if (!attributes || attributes.length === 0) {
    return null;
  }

  const getAttr = (key: string) => {
    return attributes.find((a) => a.name.toLowerCase() === key.toLowerCase())?.value;
  };

  const isbn = getAttr('isbn');
  const author = getAttr('author');
  const publisher = getAttr('publisher');
  const genre = getAttr('literary_genre') || getAttr('genre');
  const edition = getAttr('edition');

  return (
    <div className="space-y-2 pt-2 text-xs">
      {author && (
        <div className="flex items-center gap-1.5 text-slate-700">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-500">Por:</span>
          <span className="font-semibold text-slate-900">{author}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
        {publisher && (
          <div className="flex items-center gap-1 truncate" title={publisher}>
            <Building className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">{publisher}</span>
          </div>
        )}
        {genre && (
          <div className="flex items-center gap-1 truncate" title={genre}>
            <BookMarked className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">{genre}</span>
          </div>
        )}
        {edition && (
          <div className="text-slate-500 col-span-2">
            Edição: <span className="font-medium text-slate-700">{edition}</span>
          </div>
        )}
        {isbn && (
          <div className="text-[10px] text-slate-400 font-mono col-span-2">
            ISBN: {isbn}
          </div>
        )}
      </div>
    </div>
  );
};
