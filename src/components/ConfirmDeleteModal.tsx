import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { CountSession } from '../types';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  session: CountSession | null;
  onClose: () => void;
  onConfirm: (sessionId: string) => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  session,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Top visual warning header */}
        <div className="p-6 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <Trash2 className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            Excluir Contagem
          </h3>

          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Tem certeza que deseja remover permanentemente a contagem{' '}
            <strong className="text-slate-900 font-bold">"{session.name}"</strong>{' '}
            (<span className="font-mono text-xs font-semibold">{session.code}</span>)?
          </p>

          <div className="mt-3 py-2 px-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-200/80 w-full text-left flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Contém <strong>{session.itemsCount}</strong> posições/itens registrados. Esta ação não poderá ser desfeita.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(session.id);
              onClose();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sim, Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
