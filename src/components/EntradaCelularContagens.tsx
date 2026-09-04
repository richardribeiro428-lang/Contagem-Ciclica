import React, { useState } from 'react';
import {
  Smartphone,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  RotateCcw,
  Package,
  Layers,
  MapPin,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Boxes,
  Lock,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CountSession } from '../types';
import { SYSTEM_IMAGES, mobileAppIconUrl } from '../mockData';

interface EntradaCelularContagensProps {
  sessions: CountSession[];
  currentOperator: string | null;
  onSetCurrentOperator: (name: string | null) => void;
  onStartCounting: (session: CountSession) => void;
  onNavigateToAdmin: () => void;
  onOpenDetailsModal?: (session: CountSession) => void;
}

export const EntradaCelularContagens: React.FC<EntradaCelularContagensProps> = ({
  sessions,
  currentOperator,
  onSetCurrentOperator,
  onStartCounting,
  onNavigateToAdmin,
  onOpenDetailsModal,
}) => {
  const [operatorInput, setOperatorInput] = useState('');
  const [showAllOverride, setShowAllOverride] = useState(false);
  const [isChangingOperator, setIsChangingOperator] = useState(!currentOperator);
  const [statusFilter, setStatusFilter] = useState<'pendente' | 'andamento' | 'concluida' | 'todas'>('pendente');
  const [searchTerm, setSearchTerm] = useState('');

  const cevaLogo = SYSTEM_IMAGES.find((img) => img.type === 'logo')?.url || '';

  // Collect unique operators from sessions to display as quick chips
  const knownOperators = Array.from(
    new Set(sessions.map((s) => s.responsible).filter(Boolean))
  ) as string[];

  const handleSelectSpecificOperator = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    onSetCurrentOperator(clean);
    setShowAllOverride(false);
    setIsChangingOperator(false);
    setOperatorInput('');
  };

  const handleShowAllSessions = () => {
    setShowAllOverride(true);
    setIsChangingOperator(false);
  };

  const handleResetOperator = () => {
    setIsChangingOperator(true);
    setShowAllOverride(false);
  };

  // Base list of sessions based on operator selection
  const baseSessions = sessions.filter((s) => {
    if (!showAllOverride && currentOperator) {
      return s.responsible.toLowerCase() === currentOperator.toLowerCase();
    }
    return true;
  });

  // Filtered by search
  const searchedSessions = baseSessions.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term) ||
      s.sector.toLowerCase().includes(term) ||
      s.responsible.toLowerCase().includes(term) ||
      (s.sapDocNumber && s.sapDocNumber.includes(term))
    );
  });

  // Tab counts
  const countPendentes = searchedSessions.filter((s) => s.status === 'Pendente').length;
  const countAndamento = searchedSessions.filter((s) => s.status === 'Em Andamento').length;
  const countConcluidas = searchedSessions.filter((s) => s.status === 'Concluída').length;
  const countTodas = searchedSessions.length;

  // Active filtered sessions
  const visibleSessions = searchedSessions.filter((s) => {
    if (statusFilter === 'pendente') return s.status === 'Pendente';
    if (statusFilter === 'andamento') return s.status === 'Em Andamento';
    if (statusFilter === 'concluida') return s.status === 'Concluída';
    return true; // 'todas'
  });

  // SCREEN 1: OPERATOR SELECTION (Entrada do celular solicitando nome ou ver todas)
  if (isChangingOperator) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col justify-between antialiased">
        {/* Top corporate accent */}
        <div className="h-1.5 w-full bg-[#b80014]"></div>

        <div className="max-w-md mx-auto w-full px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center">
          {/* CEVA & SAP Fiori Header with Drawing Mobile Icon */}
          <div className="text-center mb-6">
            <div className="inline-block relative mb-3">
              <img
                src={mobileAppIconUrl}
                alt="Ícone Desenho App Celular"
                className="w-16 h-16 rounded-2xl shadow-md border-2 border-white object-cover mx-auto"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-1.5">
              <img
                src={cevaLogo}
                alt="CEVA Logistics"
                className="h-6 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold mb-2">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Entrada de Contagem • Coletor / Celular</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Integrado com <strong>SAP Fiori Grupo Boticário</strong></span>
            </div>
          </div>

          {/* Login / Identification Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-200">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0b1c30] text-center mb-1">
              Identificação do Operador
            </h2>
            <p className="text-xs text-slate-500 text-center mb-5">
              Informe seu nome para carregar automaticamente as contagens vinculadas a você, ou visualize todas as contagens pendentes.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSelectSpecificOperator(operatorInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Seu Nome ou Matrícula
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={operatorInput}
                    onChange={(e) => setOperatorInput(e.target.value)}
                    placeholder="Ex: Mariana, Rogério, Carlos..."
                    className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick suggestions from known operators */}
              {knownOperators.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Ou selecione seu nome:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {knownOperators.map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => handleSelectSpecificOperator(op)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 transition-all text-slate-700 cursor-pointer"
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={!operatorInput.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Acessar Minhas Contagens</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Ou
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={handleShowAllSessions}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <Boxes className="w-4 h-4 text-slate-600" />
                  <span>Visualizar Todas as Contagens ({sessions.length})</span>
                </button>
              </div>
            </form>
          </div>

          {/* Link to PC Administration */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ir para Administração (PC / Criar Contagens)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 text-center text-[10px] text-slate-400 border-t border-slate-200 bg-white">
          CEVA Logistics • WMS Móvel • Conectado ao SAP Fiori S/4HANA Grupo Boticário
        </div>
      </div>
    );
  }

  // SCREEN 2: DEDICATED MOBILE CONTAGENS LIST
  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col antialiased">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-[#213145] text-white shadow-md border-b border-slate-700/60 px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Logo & title */}
          <div className="flex items-center gap-2.5">
            <img
              src={mobileAppIconUrl}
              alt="Ícone App Desenho"
              className="w-8 h-8 rounded-xl object-cover shadow-xs border border-white/20 shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-xs font-extrabold tracking-tight text-white leading-tight flex items-center gap-1.5">
                <span>Contagens Móveis</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/60">
                  SAP Fiori
                </span>
              </span>
              <span className="text-[10px] text-slate-300 font-medium leading-tight">
                CEVA Logistics • Coletor
              </span>
            </div>
          </div>

          {/* Admin PC Switcher link */}
          <button
            type="button"
            onClick={onNavigateToAdmin}
            className="text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Ir para o painel de administração no PC"
          >
            <span>Admin (PC)</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-3 sm:px-4 py-4 flex-1 flex flex-col gap-3">
        {/* Active Operator Card */}
        <div className="bg-white rounded-xl p-3.5 shadow-xs border border-blue-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Operador Ativo:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-900 truncate">
                  {showAllOverride ? 'Todas as Contagens' : currentOperator || 'Não Definido'}
                </span>
                {!showAllOverride && currentOperator && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    {baseSessions.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetOperator}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Trocar
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, setor, SKU..."
            className="w-full bg-white pl-9 pr-3 py-2 rounded-xl text-xs text-slate-800 outline-none border border-slate-200 shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Status Filter Tabs (Horizontal Scroll) with Animated Pill */}
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
              {statusFilter === 'pendente'
                ? 'Você não possui contagens pendentes. Todas foram finalizadas ou estão em andamento!'
                : 'Não foram encontradas contagens para este filtro ou operador.'}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={handleShowAllSessions}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
              >
                Ver Todas as Contagens
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            <AnimatePresence mode="popLayout">
              {visibleSessions.map((session) => {
                const isConcluida = session.status === 'Concluída';
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
                    {/* Top Row: Code, Unit, SAP Fiori badge & Status */}
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-extrabold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                          {session.code}
                        </span>
                        {isBoxMode ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md">
                            <Package className="w-3 h-3 text-amber-700" /> CX
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md">
                            <Layers className="w-3 h-3 text-slate-500" /> UN
                          </span>
                        )}
                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                          SAP #{sapDoc}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isConcluida
                            ? 'bg-emerald-100 text-emerald-800'
                            : isEmAndamento
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {session.status}
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
                          {countedItemsCount} de {totalItems} posições ({progressPct}%)
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
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Mobile Action Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-400">
                        Tipo: <strong className="text-slate-700">{session.type}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => onStartCounting(session)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                          isEmAndamento
                            ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-200'
                            : isConcluida
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#0fa958] hover:bg-[#0c8a48] text-white'
                        }`}
                      >
                        {isEmAndamento ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Continuar Contagem</span>
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
