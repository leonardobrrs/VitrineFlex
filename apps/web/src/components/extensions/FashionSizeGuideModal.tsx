import React from 'react';
import { X, Ruler, HelpCircle } from 'lucide-react';

interface FashionSizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

export const FashionSizeGuideModal: React.FC<FashionSizeGuideModalProps> = ({
  isOpen,
  onClose,
  primaryColor = '#0f172a',
}) => {
  if (!isOpen) return null;

  const sizeTable = [
    { size: 'P (36-38)', bust: '84 - 88 cm', waist: '66 - 70 cm', hips: '92 - 96 cm', length: '98 cm' },
    { size: 'M (40-42)', bust: '89 - 96 cm', waist: '71 - 78 cm', hips: '97 - 104 cm', length: '100 cm' },
    { size: 'G (44-46)', bust: '97 - 104 cm', waist: '79 - 86 cm', hips: '105 - 112 cm', length: '102 cm' },
    { size: 'GG (48)', bust: '105 - 112 cm', waist: '87 - 94 cm', hips: '113 - 120 cm', length: '104 cm' },
  ];

  const shoesTable = [
    { br: '36', us: '6', footLength: '24.0 cm' },
    { br: '37', us: '6.5', footLength: '24.7 cm' },
    { br: '38', us: '7.5', footLength: '25.3 cm' },
    { br: '39', us: '8.5', footLength: '26.0 cm' },
    { br: '40', us: '9', footLength: '26.7 cm' },
    { br: '41', us: '9.5', footLength: '27.3 cm' },
    { br: '42', us: '10.5', footLength: '28.0 cm' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Guia de Tamanhos e Medidas</h2>
              <p className="text-xs text-slate-500">Tabela de referência para confecções e calçados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Confecção */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
              Roupas e Alfaiataria (Feminino e Masculino)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Tamanho</th>
                    <th className="py-2.5 px-3">Busto / Tórax</th>
                    <th className="py-2.5 px-3">Cintura</th>
                    <th className="py-2.5 px-3">Quadril</th>
                    <th className="py-2.5 px-3">Comprimento Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sizeTable.map((row) => (
                    <tr key={row.size} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.size}</td>
                      <td className="py-2.5 px-3">{row.bust}</td>
                      <td className="py-2.5 px-3">{row.waist}</td>
                      <td className="py-2.5 px-3">{row.hips}</td>
                      <td className="py-2.5 px-3">{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calçados */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
              Calçados e Tênis
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Numeração BR</th>
                    <th className="py-2.5 px-3">Equivalente US</th>
                    <th className="py-2.5 px-3">Comprimento da Palmilha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shoesTable.map((row) => (
                    <tr key={row.br} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">BR {row.br}</td>
                      <td className="py-2.5 px-3">{row.us}</td>
                      <td className="py-2.5 px-3">{row.footLength}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Como medir o seu corpo:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li><strong>Busto/Tórax:</strong> Passe a fita métrica sob os braços e sobre a parte mais saliente do peito.</li>
                <li><strong>Cintura:</strong> Meça na parte mais estreita da cintura, cerca de dois dedos acima do umbigo.</li>
                <li><strong>Quadril:</strong> Contorne a parte mais larga dos quadris e glúteos com a fita nivelada.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            Entendi, fechar
          </button>
        </div>
      </div>
    </div>
  );
};
