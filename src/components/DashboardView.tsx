import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Play,
  Layers,
  Boxes
} from 'lucide-react';
import { CountSession } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DashboardViewProps {
  sessions: CountSession[];
  onOpenNewSessionModal: () => void;
  onOpenDetailsModal: (session: CountSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onStartCounting?: (session: CountSession) => void;
  onNavigateToContagens: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sessions,
  onOpenNewSessionModal,
  onOpenDetailsModal,
  onDeleteSession,
  onStartCounting,
  onNavigateToContagens,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<CountSession | null>(null);

  // Calculate dynamic KPIs from current sessions
  const totalItemsCounted = sessions.reduce((acc, s) => {
    return acc + s.items.reduce((sum, it) => sum + it.countedQty, 0);
  }, 0);

  const totalDivergentItems = sessions.reduce((acc, s) => {
    return acc + s.items.filter((it) => it.status === 'divergent').length;
  }, 0);

  const inProgressCount = sessions.filter((s) => s.status === 'Em Andamento').length;
  const pendingCount = sessions.filter((s) => s.status === 'Pendente').length;
  const completedCount = sessions.filter((s) => s.status === 'Concluída').length;

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.responsible.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'Todos' || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full px-4 sm:px-8 py-6 space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Acompanhamento de inventário físico e acurácia de estoque em tempo real
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onNavigateToContagens}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Boxes className="w-4 h-4 text-slate-600" />
            <span>Ver Todas as Contagens ({sessions.length})</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewSessionModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Contagem</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Em Andamento */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Em Andamento
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#e5eeff] flex items-center justify-center text-slate-600">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900">{inProgressCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              {inProgressCount === 0 ? 'Nenhuma contagem ativa' : `${inProgressCount} contagem(ns) ativa(s)`}
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${Math.min(inProgressCount * 25, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Concluídas OK */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Concluídas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900">{completedCount}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-flex items-center text-emerald-700 text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> {totalItemsCounted} itens
              </span>
              <span className="text-xs text-slate-500">auditados</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full w-[95%]"></div>
          </div>
        </div>

        {/* KPI 3: Divergentes */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Divergentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-600">
              {totalDivergentItems}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-red-600 text-xs font-bold">
                {totalDivergentItems === 0 ? 'Tolerância zero atingida' : 'Itens com saldo divergente'}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-red-500 h-full" style={{ width: `${Math.min(totalDivergentItems * 20, 100)}%` }}></div>
          </div>
        </div>

        {/* KPI 4: Pendentes */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pendentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#e5eeff] flex items-center justify-center text-slate-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900">{pendingCount}</div>
            <p className="text-xs text-slate-500 mt-1">Sessões aguardando início</p>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-slate-300 h-full w-0"></div>
          </div>
        </div>
      </div>

      {/* Contagens Recentes Section */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden flex flex-col">
        {/* Table Header Toolbar */}
        <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-900">Contagens Recentes</h2>
            <p className="text-xs text-slate-500">
              Últimas sessões de contagem criadas e gerenciadas no WMS
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou ID..."
                className="w-full bg-[#eff4ff]/60 pl-9 pr-3 py-1.5 rounded-lg text-xs text-slate-800 outline-none border border-slate-200 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>

            {/* Filter Status Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full sm:w-auto inline-flex items-center justify-between gap-2 px-3.5 py-1.5 bg-[#eff4ff]/60 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-[#e5eeff] transition-colors"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>{statusFilter === 'Todos' ? 'Todos os Status' : statusFilter}</span>
              </button>

              {showStatusDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20">
                  {['Todos', 'Concluída', 'Divergência', 'Em Andamento', 'Pendente'].map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setStatusFilter(st);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                          statusFilter === st ? 'font-bold text-red-600 bg-red-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span>{st === 'Todos' ? 'Todos os Status' : st}</span>
                        {statusFilter === st && <Check className="w-3.5 h-3.5 text-red-600" />}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Nova Contagem Button */}
            <button
              type="button"
              onClick={onOpenNewSessionModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#e21b23] hover:bg-[#b80014] text-white text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Contagem</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eff4ff]/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-5">Nome</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-center">Itens</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhuma contagem encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((sess) => {
                  const isConcluida = sess.status === 'Concluída';
                  const isDivergente = sess.status === 'Divergência';

                  return (
                    <tr
                      key={sess.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => onOpenDetailsModal(sess)}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{sess.name}</span>
                            <span className="text-[11px] text-slate-500">
                              Resp: {sess.responsible} • ID {sess.code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{sess.date}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px]">
                          {sess.itemsCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isConcluida
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDivergente
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isConcluida
                                ? 'bg-emerald-600'
                                : isDivergente
                                ? 'bg-red-600'
                                : 'bg-amber-600'
                            }`}
                          ></span>
                          {sess.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          {onStartCounting && (
                            <button
                              type="button"
                              onClick={() => onStartCounting(sess)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200 shadow-2xs"
                              title="Realizar Contagem Física"
                            >
                              <Play className="w-3 h-3 fill-current text-emerald-600" />
                              <span>Contar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenDetailsModal(sess)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Ver Detalhes da Contagem"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSessionToDelete(sess)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Excluir Contagem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination Controls */}
        <div className="px-5 py-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Mostrando <span className="font-bold text-slate-900">{filteredSessions.length}</span> de{' '}
            <span className="font-bold text-slate-900">{sessions.length}</span> contagens
          </span>
          <button
            type="button"
            onClick={onNavigateToContagens}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            Acessar Aba de Contagens Completa →
          </button>
        </div>
      </div>

      {/* Confirmation Modal to safely delete session */}
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
