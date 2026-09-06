import React, { useState } from 'react';
import {
  Smartphone,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Package,
  Layers,
  MapPin,
  ArrowLeft,
  Boxes,
  ChevronRight,
  Filter,
  X,
  Check,
  Copy,
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CountSession } from '../types';
import { SYSTEM_IMAGES, mobileAppIconUrl } from '../mockData';
import { CevaLogo } from './CevaLogo';

interface EntradaCelularContagensProps {
  sessions: CountSession[];
  currentOperator: string | null;
  onSetCurrentOperator: (name: string | null) => void;
  onStartCounting: (session: CountSession) => void;
  onBackToHome: () => void;
  onOpenDetailsModal?: (session: CountSession) => void;
  onUpdateStatus?: (sessionId: string, newStatus: CountSession['status']) => void;
  onRefresh?: () => Promise<void> | void;
  onReloadPage?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
}

export const EntradaCelularContagens: React.FC<EntradaCelularContagensProps> = ({
  sessions,
  currentOperator,
  onSetCurrentOperator,
  onStartCounting,
  onBackToHome,
  onUpdateStatus,
  onRefresh,
  onReloadPage,
  isSyncing = false,
  lastSyncTime,
}) => {
  // Starts directly on 'todas' so all counts are immediately visible on entrance
  const [statusFilter, setStatusFilter] = useState<'todas' | 'pendente' | 'andamento' | 'concluida'>('todas');
  // Operator filter: 'todos' or specific operator name
  const [selectedOperator, setSelectedOperator] = useState<string>(currentOperator || 'todos');
  const [operatorCustomInput, setOperatorCustomInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOperatorSearch, setShowOperatorSearch] = useState(false);

  // Collect unique operators from sessions to display as quick filter chips
  const knownOperators = Array.from(
    new Set(sessions.map((s) => s.responsible).filter(Boolean))
  ) as string[];

  const handleSelectOperator = (op: string) => {
    setSelectedOperator(op);
    if (op === 'todos') {
      onSetCurrentOperator(null);
    } else {
      onSetCurrentOperator(op);
    }
  };

  const handleApplyCustomOperator = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = operatorCustomInput.trim();
    if (clean) {
      setSelectedOperator(clean);
      onSetCurrentOperator(clean);
      setShowOperatorSearch(false);
    }
  };

  // 1. Filter by Operator (if 'todos', all sessions are included)
  const operatorFilteredSessions = sessions.filter((s) => {
    if (selectedOperator === 'todos' || !selectedOperator) {
      return true;
    }
    return s.responsible.toLowerCase().includes(selectedOperator.toLowerCase());
  });

  // 2. Filter by search term
  const searchedSessions = operatorFilteredSessions.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term) ||
      s.sector.toLowerCase().includes(term) ||
      s.responsible.toLowerCase().includes(term) ||
      (s.sapDocNumber && s.sapDocNumber.includes(term))
    );
  });

  // Tab counts based on active operator filter
  const countTodas = searchedSessions.length;
  const countPendentes = searchedSessions.filter((s) => s.status === 'Pendente').length;
  const countAndamento = searchedSessions.filter((s) => s.status === 'Em Andamento').length;
  const countConcluidas = searchedSessions.filter(
    (s) => s.status === 'Concluída' || s.status === 'Divergência'
  ).length;

  // 3. Final visible sessions according to status tab
  const visibleSessions = searchedSessions.filter((s) => {
    if (statusFilter === 'todas') return true;
    if (statusFilter === 'pendente') return s.status === 'Pendente';
    if (statusFilter === 'andamento') return s.status === 'Em Andamento';
    if (statusFilter === 'concluida') return s.status === 'Concluída' || s.status === 'Divergência';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col antialiased">
      {/* Top Mobile Bar - With back to home, NO admin link */}
      <header className="sticky top-0 z-30 bg-[#213145] text-white shadow-md border-b border-slate-700/60 px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <CevaLogo variant="light" size="sm" className="h-7 w-auto max-w-[130px] shrink-0" />
            <div className="h-6 w-px bg-slate-700/80 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold tracking-tight text-white leading-tight truncate">
                Contagens Móveis
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight truncate">
                Coletor / Celular
              </span>
            </div>
          </div>

          {/* Action Buttons: Recarregar + Início */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                if (onRefresh) {
                  await onRefresh();
                } else {
                  window.location.reload();
                }
              }}
              disabled={isSyncing}
              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-75 px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Recarregar contagens criadas no computador"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Buscando...' : 'Recarregar'}</span>
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 active:bg-white/30 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Voltar para a tela inicial"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Início</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-3 sm:px-4 py-3 flex-1 flex flex-col gap-3">
        {/* Status de Conexão com o Computador & Botão Recarregar Página */}
        <div className="bg-[#14202e] text-slate-300 rounded-xl px-3 py-2 text-[11px] flex items-center justify-between border border-slate-700/60 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">
              <strong>PC Conectado:</strong> Nuvem em tempo real {lastSyncTime ? `• ${lastSyncTime}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onReloadPage) {
                onReloadPage();
              } else {
                window.location.reload();
              }
            }}
            className="text-emerald-300 hover:text-white font-bold text-[10px] shrink-0 ml-2 cursor-pointer flex items-center gap-1 bg-emerald-600/30 hover:bg-emerald-600/50 px-2.5 py-1 rounded-lg border border-emerald-400/30 transition-colors"
            title="Recarregar a página inteira no navegador (F5)"
          >
            <RotateCw className="w-3 h-3 text-emerald-400" />
            <span>Recarregar Página</span>
          </button>
        </div>

        {/* Corporate Safe Notice */}
        <div className="bg-slate-100 text-slate-600 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2 border border-slate-200 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            <strong>Modo Corporativo:</strong> Ao segurar o dedo, aparece apenas <strong>Copiar</strong>.
          </span>
        </div>

        {/* Operator Filter Section: Quick chips so user can filter by their name */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Filtrar por Operador:</span>
            </div>
            {selectedOperator !== 'todos' ? (
              <button
                type="button"
                onClick={() => handleSelectOperator('todos')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Mostrar Todos</span>
                <X className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOperatorSearch(!showOperatorSearch)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <span>{showOperatorSearch ? 'Fechar' : '+ Outro Nome'}</span>
              </button>
            )}
          </div>

          {/* Quick Operator Chips (Horizontal Scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {knownOperators.map((opName) => {
              const isSelected = selectedOperator.toLowerCase() === opName.toLowerCase();
              const opCount = sessions.filter(
                (s) => s.responsible.toLowerCase() === opName.toLowerCase()
              ).length;

              return (
                <button
                  key={opName}
                  type="button"
                  onClick={() => handleSelectOperator(opName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opName} ({opCount})
                </button>
              );
            })}

            {/* 'Todas as Contagens' por último */}
            <button
              type="button"
              onClick={() => handleSelectOperator('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedOperator === 'todos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas as Contagens ({sessions.length})
            </button>
          </div>

          {/* Optional inline custom name search */}
          {showOperatorSearch && (
            <form
              onSubmit={handleApplyCustomOperator}
              className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100"
            >
              <input
                type="text"
                value={operatorCustomInput}
                onChange={(e) => setOperatorCustomInput(e.target.value)}
                placeholder="Digite seu nome ou matrícula..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
              >
                Filtrar
              </button>
            </form>
          )}
        </div>

        {/* Search Input for items / SKU / Positions */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, setor, SKU, posição..."
            className="w-full bg-white pl-9 pr-3 py-2 rounded-xl text-xs text-slate-800 outline-none border border-slate-200 shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Status Filter Tabs - 'Todas' por último */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl overflow-x-auto shadow-2xs">
          {[
            { id: 'pendente' as const, label: 'Pendentes', count: countPendentes },
            { id: 'andamento' as const, label: 'Em Andamento', count: countAndamento },
            { id: 'concluida' as const, label: 'Concluídas', count: countConcluidas },
            { id: 'todas' as const, label: 'Todas', count: countTodas },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 z-10 cursor-pointer ${
                  isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTabIndicator"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span>
                  {tab.label} ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* List of Sessions */}
        {visibleSessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center my-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <Boxes className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Nenhuma contagem encontrada</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              {selectedOperator !== 'todos'
                ? `Não há contagens para o operador "${selectedOperator}" nesta categoria.`
                : 'Não foram encontradas contagens para o filtro selecionado.'}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedOperator('todos');
                  setStatusFilter('todas');
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Ver Todas as Contagens
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            <AnimatePresence mode="popLayout">
              {visibleSessions.map((session) => {
                const isConcluida = session.status === 'Concluída' || session.status === 'Divergência';
                const isEmAndamento = session.status === 'Em Andamento';
                const isBoxMode = session.countUnit === 'caixas';
                const countedItemsCount = session.items.filter(
                  (i) => i.countedQty > 0 || i.boxesCounted !== undefined
                ).length;
                const totalItems = session.items.length || session.itemsCount;
                const progressPct = totalItems > 0 ? Math.round((countedItemsCount / totalItems) * 100) : 0;
                const sapDoc = session.sapDocNumber || '300049182';

                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className={`bg-white rounded-2xl p-4 shadow-xs border transition-all ${
                      isEmAndamento
                        ? 'border-blue-300 ring-2 ring-blue-500/10'
                        : isConcluida
                        ? 'border-emerald-200'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Top Row: Code, Unit & Status */}
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div
                          data-copyable={session.code}
                          data-copy-label="Código da Contagem"
                          className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                          title="Clique ou segure para copiar o código"
                        >
                          <span className="font-mono text-xs font-extrabold">{session.code}</span>
                          <Copy className="w-3 h-3 text-slate-400" />
                        </div>
                        {isBoxMode ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md">
                            <Package className="w-3 h-3 text-amber-700" /> CX
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
                            <Layers className="w-3 h-3 text-slate-500" /> UN
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isConcluida
                            ? 'bg-emerald-100 text-emerald-800'
                            : isEmAndamento
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isConcluida && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isConcluida ? 'Concluída' : session.status}
                      </span>
                    </div>

                    {/* Session Name & Sector */}
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">
                      {session.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {session.sector}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">
                        {session.responsible}
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                        <span>Progresso físico:</span>
                        <span className="font-bold text-slate-900">
                          {isConcluida ? totalItems : countedItemsCount} de {totalItems} posições ({isConcluida ? 100 : progressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isConcluida
                              ? 'bg-emerald-500'
                              : progressPct > 0
                              ? 'bg-blue-600'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${isConcluida ? 100 : progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-400">
                        Tipo: <strong className="text-slate-700">{session.type}</strong>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {onUpdateStatus && !isConcluida && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(session.id, 'Concluída');
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Finalizar contagem agora e ir para Concluído"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Finalizar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onStartCounting(session)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                            isEmAndamento
                              ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-200'
                              : isConcluida
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          }`}
                        >
                          {isEmAndamento ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Continuar</span>
                            </>
                          ) : isConcluida ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Revisar Contagem</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Iniciar Contagem</span>
                            </>
                          )}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};
