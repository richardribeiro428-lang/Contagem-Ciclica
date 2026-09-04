import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Boxes,
  PauseCircle,
  Package,
  ListOrdered,
  Smartphone,
  Monitor,
  Barcode,
  RotateCcw,
  MapPin,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CountSession, InventoryItem } from '../types';

interface ContagemExecucaoViewProps {
  session: CountSession;
  skuConversions?: Record<string, number>;
  onBack: () => void;
  onSaveCount: (
    sessionId: string,
    updatedItems: InventoryItem[],
    newStatus: CountSession['status'],
    lastPositionIndex?: number
  ) => void;
}

export const ContagemExecucaoView: React.FC<ContagemExecucaoViewProps> = ({
  session,
  skuConversions = {},
  onBack,
  onSaveCount,
}) => {
  // Working copy of items
  const [items, setItems] = useState<InventoryItem[]>(session.items);
  // Restore last paused position if available
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (session.lastPositionIndex !== undefined && session.lastPositionIndex < session.items.length) {
      return session.lastPositionIndex;
    }
    const firstUncounted = session.items.findIndex((it) => it.countedQty === 0 && it.status !== 'ok');
    return firstUncounted >= 0 ? firstUncounted : 0;
  });

  const [showItemList, setShowItemList] = useState(false);
  // View mode toggle on desktop: 'mobile' (Phone / Coletor Frame) | 'expanded' (Wide Desktop Card)
  const [viewMode, setViewMode] = useState<'mobile' | 'expanded'>('mobile');

  const isBoxMode = session.countUnit === 'caixas';
  const currentItem = items[currentIndex] || items[0];

  // Pieces per box factor for current SKU
  const piecesPerBox = isBoxMode
    ? (skuConversions[currentItem?.sku?.toLowerCase() || ''] || 1)
    : 1;

  // Input value: in box mode it represents boxes; in piece mode it represents pieces
  const [inputValue, setInputValue] = useState<string>(() => {
    if (!currentItem) return '';
    if (isBoxMode) {
      return currentItem.boxesCounted !== undefined && currentItem.boxesCounted > 0
        ? String(currentItem.boxesCounted)
        : currentItem.countedQty > 0
        ? String(Math.floor(currentItem.countedQty / piecesPerBox))
        : '';
    }
    return currentItem.countedQty > 0 ? String(currentItem.countedQty) : '';
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input when index changes
  useEffect(() => {
    if (currentItem) {
      if (isBoxMode) {
        setInputValue(
          currentItem.boxesCounted !== undefined && currentItem.boxesCounted > 0
            ? String(currentItem.boxesCounted)
            : currentItem.countedQty > 0
            ? String(Math.floor(currentItem.countedQty / piecesPerBox))
            : ''
        );
      } else {
        setInputValue(currentItem.countedQty > 0 ? String(currentItem.countedQty) : '');
      }

      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [currentIndex, currentItem, isBoxMode, piecesPerBox]);

  // Calculations
  const contadosCount = items.filter((it) => it.countedQty > 0 || it.boxesCounted !== undefined).length;
  const pendentesCount = items.length - contadosCount;
  const progressPercent = items.length > 0 ? Math.round(((currentIndex + 1) / items.length) * 100) : 0;

  // Real-time converted pieces calculation in box mode
  const parsedInputNumber = inputValue === '' ? 0 : Math.max(0, parseInt(inputValue, 10) || 0);
  const convertedPieces = isBoxMode ? parsedInputNumber * piecesPerBox : parsedInputNumber;

  const handleSaveCurrentItem = (advance: boolean = true) => {
    const boxes = isBoxMode ? parsedInputNumber : undefined;
    const finalCountedPieces = convertedPieces;

    const updated = items.map((it, idx) => {
      if (idx === currentIndex) {
        const isOk = it.expectedQty > 0 ? finalCountedPieces === it.expectedQty : true;
        return {
          ...it,
          countedQty: finalCountedPieces,
          boxesCounted: boxes,
          status: (isOk ? 'ok' : 'divergent') as InventoryItem['status'],
        };
      }
      return it;
    });

    setItems(updated);

    if (advance && currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
    return updated;
  };

  // Quick increment helpers for mobile touch screen
  const handleQuickAdd = (delta: number) => {
    const current = parseInt(inputValue, 10) || 0;
    const next = Math.max(0, current + delta);
    setInputValue(String(next));
  };

  const handleQuickClear = () => {
    setInputValue('0');
  };

  // Pause and save progress to Firestore so operator can resume anytime
  const handlePauseAndReturn = () => {
    const updated = handleSaveCurrentItem(false);
    onSaveCount(session.id, updated, 'Em Andamento', currentIndex);
    onBack();
  };

  const handleFinalizarContagem = () => {
    const updated = handleSaveCurrentItem(false);
    const hasDivergence = updated.some(
      (it) => it.expectedQty > 0 && it.countedQty !== it.expectedQty
    );
    const finalStatus: CountSession['status'] = hasDivergence ? 'Divergência' : 'Concluída';

    onSaveCount(session.id, updated, finalStatus, currentIndex);
    onBack();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentIndex < items.length - 1) {
        handleSaveCurrentItem(true);
      } else {
        handleFinalizarContagem();
      }
    }
  };

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md border border-slate-200">
          <Boxes className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Nenhum item nesta contagem</h2>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold cursor-pointer"
          >
            Voltar para Contagens
          </button>
        </div>
      </div>
    );
  }

  const isLastItem = currentIndex === items.length - 1;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-900 flex flex-col antialiased">
      {/* View Switcher Toolbar (Visible on desktop to toggle Mobile Coletor vs Desktop mode) */}
      <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-300 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">CEVA Mobile WMS</span>
          <span className="text-slate-500">•</span>
          <span>{session.name} ({session.code})</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Modo de visualização:</span>
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Layout Celular / Coletor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('expanded')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'expanded'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Layout Expandido (PC)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container - Renders as phone layout on mobile or in mobile preview, or full screen */}
      <div className={`flex-1 flex flex-col justify-center items-center ${viewMode === 'mobile' ? 'p-0 md:py-6' : 'p-0'}`}>
        <div
          className={`w-full bg-[#f8faff] flex flex-col shadow-2xl transition-all ${
            viewMode === 'mobile'
              ? 'max-w-md min-h-[100dvh] md:min-h-[820px] md:max-h-[880px] md:rounded-[36px] md:border-8 md:border-slate-800 overflow-hidden relative'
              : 'min-h-screen'
          }`}
        >
          {/* Top Handheld Header */}
          <header className="bg-[#1976d2] text-white px-4 py-3 shadow-md shrink-0 flex items-center justify-between gap-2 z-20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePauseAndReturn}
                className="p-1.5 -ml-1 rounded-xl hover:bg-white/20 active:bg-white/30 transition-colors text-white cursor-pointer"
                title="Pausar e Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight truncate max-w-[200px]">
                  {session.name || 'Contagem'}
                </h1>
                <span className="text-[11px] text-blue-100 font-medium leading-none mt-0.5">
                  Resp: {session.responsible}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isBoxMode ? (
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-900 shadow-xs">
                  Caixas (CX)
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/20 text-white">
                  Peças (UN)
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowItemList(!showItemList)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Ver lista de posições"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Progress Bar Line */}
          <div className="w-full bg-blue-900/40 h-1.5 shrink-0 overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Item Drawer / Quick Picker */}
          {showItemList && (
            <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-md max-h-48 overflow-y-auto shrink-0 z-20 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-2 text-xs font-bold text-slate-600">
                <span>Pular para posição:</span>
                <span className="text-slate-400 font-normal">{items.length} itens</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((it, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isCounted = it.countedQty > 0 || it.boxesCounted !== undefined;
                  return (
                    <button
                      key={it.id || idx}
                      type="button"
                      onClick={() => {
                        handleSaveCurrentItem(false);
                        setCurrentIndex(idx);
                        setShowItemList(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                          : isCounted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {it.location || `#${idx + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scrollable Center Body - Optimized for Phone Screen */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-start">
            {/* Position and Progress Header */}
            <div className="flex items-center justify-between mb-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  Item {currentIndex + 1} de {items.length}
                </span>
                {currentItem.countedQty > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Já conferido
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCurrentItem(false);
                    setCurrentIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={currentIndex === 0}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Posição anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCurrentItem(false);
                    setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
                  }}
                  disabled={currentIndex === items.length - 1}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Próxima posição"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Animated Item Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem.id || currentIndex}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="space-y-3.5"
              >
                {/* 1. Location Banner (High Visibility for Warehouses) */}
                <div className="bg-[#213145] text-white p-4 rounded-2xl shadow-sm border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                        Posição WMS
                      </span>
                      <div className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
                        {currentItem.location || 'POSIÇÃO'}
                      </div>
                    </div>
                  </div>

                  {currentItem.batch && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Lote
                      </span>
                      <span className="text-xs font-bold text-slate-200 bg-white/10 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {currentItem.batch}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. SKU & Product Description Card */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900">
                      <Barcode className="w-4 h-4 text-slate-500" />
                      <span>{currentItem.sku}</span>
                    </div>
                    {isBoxMode && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-600" />
                        1 CX = {piecesPerBox} UN
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 leading-snug">
                    {currentItem.name || `Item SKU ${currentItem.sku}`}
                  </h3>
                </div>

                {/* 3. Numbers Comparison (Sistêmica vs Física) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Sistêmica (Esperado WMS) */}
                  <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between text-center">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Sistêmica (WMS)
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-800 my-1">
                      {currentItem.expectedQty}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {isBoxMode
                        ? `~${(currentItem.expectedQty / piecesPerBox).toFixed(1)} CX`
                        : 'Peças (UN)'}
                    </span>
                  </div>

                  {/* Física (Contada) */}
                  <div className="bg-white border-2 border-blue-600 rounded-2xl p-3 flex flex-col justify-between text-center shadow-xs">
                    <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                      {isBoxMode ? 'Contado (Caixas)' : 'Contado (Peças)'}
                    </span>
                    <div className="my-0.5">
                      <input
                        ref={inputRef}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="0"
                        className="w-full text-center font-black text-2xl sm:text-3xl text-slate-900 outline-none bg-transparent"
                      />
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase">
                      {isBoxMode ? 'Caixas (CX)' : 'Peças (UN)'}
                    </span>
                  </div>
                </div>

                {/* 4. Quick Stepper / Number Buttons for Mobile Handheld Thumb */}
                <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(1)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-blue-100 active:text-blue-700 text-xs font-extrabold text-slate-800 transition-colors cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(5)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-blue-100 active:text-blue-700 text-xs font-extrabold text-slate-800 transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(10)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-blue-100 active:text-blue-700 text-xs font-extrabold text-slate-800 transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(-1)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-red-100 active:text-red-700 text-xs font-extrabold text-slate-800 transition-colors cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickClear}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 text-xs font-bold transition-colors cursor-pointer"
                    title="Zerar"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Real-time Box conversion feedback */}
                {isBoxMode && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                    <span className="font-semibold">
                      Total: <strong>{convertedPieces} Peças</strong> ({parsedInputNumber} CX × {piecesPerBox})
                    </span>
                    {currentItem.expectedQty > 0 && (
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        convertedPieces === currentItem.expectedQty
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {convertedPieces === currentItem.expectedQty
                          ? '✓ OK'
                          : `${convertedPieces - currentItem.expectedQty > 0 ? '+' : ''}${convertedPieces - currentItem.expectedQty} UN`}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 5. Sticky Bottom Action Bar (Thumb-friendly for mobile collectors) */}
          <footer className="bg-white border-t border-slate-200/90 p-3 shrink-0 shadow-lg space-y-2 z-20">
            {/* Primary Action Button */}
            {!isLastItem ? (
              <button
                type="button"
                onClick={() => handleSaveCurrentItem(true)}
                className="w-full h-14 bg-[#0fa958] hover:bg-[#0c8a48] active:bg-[#0a753d] text-white rounded-2xl font-black text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>GRAVAR E PRÓXIMO ({items.length - 1 - currentIndex} restam)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizarContagem}
                className="w-full h-14 bg-[#0fa958] hover:bg-[#0c8a48] active:bg-[#0a753d] text-white rounded-2xl font-black text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Check className="w-6 h-6 stroke-[3]" />
                <span>FINALIZAR CONTAGEM</span>
              </button>
            )}

            {/* Secondary Controls Bar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveCurrentItem(false);
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentIndex === 0}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={handlePauseAndReturn}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Pausar</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizarContagem}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Concluir</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
