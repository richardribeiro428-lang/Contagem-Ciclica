import React, { useState } from 'react';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Download,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  MapPin,
  Boxes,
  RotateCcw,
  Package,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CountSession } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ContagensViewProps {
  sessions: CountSession[];
  currentOperator: string | null;
  onSetCurrentOperator: (name: string | null) => void;
  onOpenNewSessionModal: () => void;
  onOpenDetailsModal: (session: CountSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateStatus?: (sessionId: string, newStatus: CountSession['status']) => void;
  onStartCounting?: (session: CountSession) => void;
}

export const ContagensView: React.FC<ContagensViewProps> = ({
  sessions,
  currentOperator,
  onSetCurrentOperator,
  onOpenNewSessionModal,
  onOpenDetailsModal,
  onDeleteSession,
  onUpdateStatus,
  onStartCounting,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'pendente' | 'concluida' | 'divergente'>('all');
  const [sessionToDelete, setSessionToDelete] = useState<CountSession | null>(null);

  // Base list of all sessions filtered by search query
  const baseSessions = sessions.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sector.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calculate real totals across all categories regardless of active tab
  const countAll = baseSessions.length;
  const countPendentes = baseSessions.filter(
    (s) => s.status === 'Pendente' || s.status === 'Em Andamento'
  ).length;
  const countConcluidas = baseSessions.filter((s) => s.status === 'Concluída').length;
  const countDivergentes = baseSessions.filter((s) => s.status === 'Divergência').length;

  // Filtered by selected tab: When session changes to 'Concluída', it immediately exits 'pendente' and enters 'concluida'
  const filteredSessions = baseSessions.filter((s) => {
    if (statusTab === 'all') return true;
    if (statusTab === 'pendente') return s.status === 'Pendente' || s.status === 'Em Andamento';
    if (statusTab === 'concluida') return s.status === 'Concluída';
    if (statusTab === 'divergente') return s.status === 'Divergência';
    return true;
  });

  const handleExportAll = () => {
    const header = 'Codigo;Nome;Responsavel;Unidade;Data;Status;Setor;TotalItens\n';
    const rows = sessions
      .map(
        (s) =>
          `"${s.code}";"${s.name}";"${s.responsible}";"${s.countUnit || 'pecas'}";"${s.date}";"${s.status}";"${s.sector}";${s.itemsCount}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contagens_ceva_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const tabsConfig = [
    { id: 'all' as const, label: 'Todas', count: countAll },
    { id: 'pendente' as const, label: 'Pendentes / Em Andamento', count: countPendentes },
    { id: 'concluida' as const, label: 'Concluídas', count: countConcluidas },
    { id: 'divergente' as const, label: 'Divergências', count: countDivergentes },
  ];

  return (
    <div className="w-full px-4 sm:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight flex items-center gap-3">
            <span>Contagens de Inventário</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200/80 text-slate-800">
              {sessions.length} cadastradas
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            Visão geral de todas as contagens cadastradas no depósito com suporte a peças e caixas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportAll}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewSessionModal}
            className="px-4 py-2 bg-[#0fa958] hover:bg-[#0c8a48] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Contagem (Colar do Excel)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs with Motion Pill */}
        <div className="relative flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
          {tabsConfig.map((tab) => {
            const isActive = statusTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 z-10 cursor-pointer ${
                  isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="contagensActiveTabIndicator"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span>
                  {tab.label} ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nome, responsável..."
            className="w-full bg-slate-50 pl-9 pr-3 py-1.5 rounded-lg text-xs text-slate-800 outline-none border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Grid of Sessions with AnimatePresence */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhuma contagem encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {statusTab === 'pendente'
              ? 'Não há contagens pendentes no momento. Todas foram concluídas ou estão em outra categoria!'
              : statusTab === 'concluida'
              ? 'Nenhuma contagem concluída ainda. Marque uma contagem como concluída para visualizá-la aqui.'
              : 'Clique em "Nova Contagem" acima para colar dados do Excel e iniciar uma contagem.'}
          </p>
          <div className="flex items-center gap-3 mt-4">
            {statusTab !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusTab('all')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Ver Todas as Contagens
              </button>
            )}
            <button
              type="button"
              onClick={onOpenNewSessionModal}
              className="px-4 py-2 bg-[#0fa958] hover:bg-[#0c8a48] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Contagem</span>
            </button>
          </div>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSessions.map((session) => {
              const isConcluida = session.status === 'Concluída';
              const isDivergente = session.status === 'Divergência';
              const isEmAndamento = session.status === 'Em Andamento' || session.status === 'Pendente';
              const isBoxMode = session.countUnit === 'caixas';
              const isMySession =
                currentOperator &&
                session.responsible.toLowerCase() === currentOperator.toLowerCase();

              // Counted stats
              const countedItemsCount = session.items.filter(
                (i) => i.countedQty > 0 || i.boxesCounted !== undefined
              ).length;
              const hasStarted = countedItemsCount > 0;

              return (
                <motion.div
                  layout
                  key={session.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onOpenDetailsModal(session)}
                  className={`bg-white rounded-2xl p-5 shadow-xs border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                    isMySession
                      ? 'ring-2 ring-blue-500/30 border-blue-400'
                      : isConcluida
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : isDivergente
                      ? 'border-red-200 hover:border-red-400'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Bar with Code, Unit and Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {session.code}
                        </span>
                        {isBoxMode ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                            <Package className="w-3 h-3 text-amber-700" /> CX
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            <Layers className="w-3 h-3 text-slate-500" /> UN
                          </span>
                        )}
                      </div>

                      {/* Status Selector dropdown */}
                      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                        <select
                          value={session.status}
                          onChange={(e) => {
                            if (onUpdateStatus) {
                              onUpdateStatus(session.id, e.target.value as CountSession['status']);
                            }
                          }}
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border cursor-pointer outline-none transition-colors ${
                            isConcluida
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isDivergente
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                          title="Alterar status (Mover para Concluída ou Pendente)"
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Concluída">✓ Concluída</option>
                          <option value="Divergência">⚠ Divergência</option>
                        </select>
                      </div>
                    </div>

                    {/* Name & Sector */}
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors leading-tight">
                      {session.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{session.sector}</span>
                    </p>

                    {/* Responsible & Date */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className={`w-3.5 h-3.5 ${isMySession ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className={`truncate font-medium ${isMySession ? 'font-bold text-blue-900' : ''}`}>
                          {session.responsible}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{session.date}</span>
                      </div>
                    </div>

                    {/* Progress info if counting has started */}
                    {hasStarted && (
                      <div className="mt-2 text-[11px] font-medium text-slate-500 flex items-center justify-between">
                        <span>Progresso: {countedItemsCount} de {session.items.length} posições</span>
                        <span className="text-blue-700 font-bold">
                          {Math.round((countedItemsCount / session.items.length) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer with Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">
                        {session.itemsCount} {session.itemsCount === 1 ? 'posição' : 'itens / posições'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Tipo: {session.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Quick Finish Button if not completed */}
                      {!isConcluida && onUpdateStatus && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(session.id, 'Concluída')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="Marcar como Concluída (sai do Pendente e vai para Concluídas)"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Concluir</span>
                        </button>
                      )}

                      {onStartCounting && (
                        <button
                          type="button"
                          onClick={() => onStartCounting(session)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                            isEmAndamento && hasStarted
                              ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-200'
                              : 'bg-[#0fa958] hover:bg-[#0c8a48] text-white'
                          }`}
                          title={isEmAndamento && hasStarted ? 'Voltar à contagem e retomar' : 'Iniciar Contagem'}
                        >
                          {isEmAndamento && hasStarted ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Voltar à Contagem</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Contar</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenDetailsModal(session)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSessionToDelete(session)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Excluir Contagem Permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Confirmation Modal to safely delete count */}
      <ConfirmDeleteModal
        isOpen={Boolean(sessionToDelete)}
        session={sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={(id) => {
          onDeleteSession(id);
          setSessionToDelete(null);
        }}
      />
    </div>
  );
};
