import React from 'react';
import { X, CheckCircle, AlertTriangle, Clock, ExternalLink, Download, User, Calendar, MapPin, Tag } from 'lucide-react';
import { CountSession } from '../types';

interface DetalhesContagemModalProps {
  session: CountSession | null;
  onClose: () => void;
  onUpdateStatus: (sessionId: string, newStatus: CountSession['status']) => void;
}

export const DetalhesContagemModal: React.FC<DetalhesContagemModalProps> = ({
  session,
  onClose,
  onUpdateStatus,
}) => {
  if (!session) return null;

  const exportCSV = () => {
    const headers = 'SKU;Nome;Lote;Localizacao;Esperado;Contado;Divergencia;Status\n';
    const rows = session.items
      .map(
        (it) =>
          `"${it.sku}";"${it.name}";"${it.batch}";"${it.location}";${it.expectedQty};${it.countedQty};${
            it.countedQty - it.expectedQty
          };"${it.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contagem_${session.code.replace('#', '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalExpected = session.items.reduce((acc, it) => acc + it.expectedQty, 0);
  const totalCounted = session.items.reduce((acc, it) => acc + it.countedQty, 0);
  const divergentCount = session.items.filter((it) => it.status === 'divergent').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#213145] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs bg-white/20 px-2.5 py-1 rounded-md text-white font-bold">
              {session.code}
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg">{session.name}</h3>
              <p className="text-xs text-slate-300">Auditoria física de inventário WMS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" /> Responsável
              </span>
              <span className="font-bold text-slate-800">{session.responsible}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Data
              </span>
              <span className="font-bold text-slate-800">{session.date}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> Local / Setor
              </span>
              <span className="font-bold text-slate-800 truncate">{session.sector}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" /> Status
              </span>
              <span
                className={`font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] w-fit ${
                  session.status === 'Concluída'
                    ? 'bg-emerald-100 text-emerald-800'
                    : session.status === 'Divergência'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {session.status}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-center">
              <span className="text-[11px] text-blue-700 font-semibold uppercase">Esperado WMS</span>
              <div className="text-xl font-bold text-blue-950 mt-0.5">{totalExpected} UN</div>
            </div>
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-center">
              <span className="text-[11px] text-emerald-700 font-semibold uppercase">Contado Físico</span>
              <div className="text-xl font-bold text-emerald-950 mt-0.5">{totalCounted} UN</div>
            </div>
            <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl text-center">
              <span className="text-[11px] text-red-700 font-semibold uppercase">Divergências</span>
              <div className="text-xl font-bold text-red-600 mt-0.5">
                {divergentCount > 0 ? `${divergentCount} itens` : '0 (100% OK)'}
              </div>
            </div>
          </div>

          {/* Table of items */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Itens Auditados na Sessão ({session.items.length})
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item / Foto</th>
                    <th className="py-2.5 px-3">Local / Lote</th>
                    <th className="py-2.5 px-2 text-center">WMS</th>
                    <th className="py-2.5 px-2 text-center">Físico</th>
                    <th className="py-2.5 px-2 text-center">Dif.</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {session.items.map((item) => {
                    const diff = item.countedQty - item.expectedQty;
                    const isOk = diff === 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {item.imageUrl ? (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-mono text-[10px] font-bold shrink-0">
                                SKU
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">{item.name}</p>
                              <p className="text-[11px] font-mono text-slate-500">{item.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <p className="font-medium">{item.location}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.batch}</p>
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-700">
                          {item.expectedQty}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-900">
                          {item.countedQty}
                        </td>
                        <td className="py-3 px-2 text-center font-bold">
                          <span
                            className={
                              diff === 0
                                ? 'text-slate-400'
                                : diff > 0
                                ? 'text-blue-600'
                                : 'text-red-600'
                            }
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                              isOk
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isOk ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {isOk ? 'OK' : 'Divergente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCSV}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
            {session.status !== 'Concluída' ? (
              <button
                type="button"
                onClick={() => onUpdateStatus(session.id, 'Concluída')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Marcar como Concluída
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onUpdateStatus(session.id, 'Pendente')}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                Reabrir para Pendente
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
