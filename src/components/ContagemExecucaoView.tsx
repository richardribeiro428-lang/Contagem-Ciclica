import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  PauseCircle,
  Package,
  ListOrdered,
  Smartphone,
  Monitor,
  Barcode,
  RotateCcw,
  MapPin,
  ScanLine
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

// Native Web Audio API beep feedback for collectors
function playBeep(type: 'success' | 'error') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio policy errors
  }
}

export const ContagemExecucaoView: React.FC<ContagemExecucaoViewProps> = ({
  session,
  skuConversions = {},
  onBack,
  onSaveCount,
}) => {
  // Working copy of items
  const [items, setItems] = useState<InventoryItem[]>(session.items || []);

  // Restore last paused position if available
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (session.lastPositionIndex !== undefined && session.lastPositionIndex < (session.items || []).length) {
      return session.lastPositionIndex;
    }
    const firstUncounted = (session.items || []).findIndex((it) => it.countedQty === 0 && it.status !== 'ok');
    return firstUncounted >= 0 ? firstUncounted : 0;
  });

  const [showItemList, setShowItemList] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'expanded'>('mobile');

  const isBoxMode = session.countUnit === 'caixas';
  const currentItem = items[currentIndex] || items[0];

  // Pieces per box factor for current SKU
  const piecesPerBox = isBoxMode
    ? (skuConversions[currentItem?.sku?.toLowerCase() || ''] || 1)
    : 1;

  // Input value: typed directly using collector hardware keyboard
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

  // Barcode scanning state
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [barcodeValidation, setBarcodeValidation] = useState<{
    rawScanned: string;
    extractedCode: string;
    isMatch: boolean;
    message: string;
  } | null>(null);

  const [inlineFeedback, setInlineFeedback] = useState<{
    message: string;
    type: 'error' | 'warning' | 'info';
  } | null>(null);

  // Track if operator actually modified/counted any item in this execution session
  const [hasModifiedAnyItem, setHasModifiedAnyItem] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input and clear scan validation when current item changes
  useEffect(() => {
    setInlineFeedback(null);
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

      setScannedBarcode('');
      setBarcodeValidation(null);

      // Focus barcode input first so operator can scan product immediately
      setTimeout(() => {
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      }, 60);
    }
  }, [currentIndex, currentItem, isBoxMode, piecesPerBox]);

  // Calculations
  const contadosCount = items.filter((it) => it.countedQty > 0 || it.boxesCounted !== undefined).length;
  const progressPercent = items.length > 0 ? Math.round(((currentIndex + 1) / items.length) * 100) : 0;

  // Real-time converted pieces calculation in box mode
  const parsedInputNumber = inputValue === '' ? 0 : Math.max(0, parseInt(inputValue, 10) || 0);
  const convertedPieces = isBoxMode ? parsedInputNumber * piecesPerBox : parsedInputNumber;

  // Rule: Lemos os 5 últimos dígitos do produto, menos o último (5 últimos menos o último)
  const extract5MinusLast = (raw: string) => {
    const cleanDigits = raw.replace(/[^0-9]/g, '');
    let last5 = '';
    let extracted = '';

    if (cleanDigits.length >= 5) {
      last5 = cleanDigits.slice(-5);
      extracted = last5.slice(0, 4); // 5 últimos menos o último
    } else if (cleanDigits.length >= 2) {
      extracted = cleanDigits.slice(0, -1);
      last5 = cleanDigits;
    } else {
      extracted = cleanDigits || raw.trim();
      last5 = cleanDigits;
    }

    return { raw: raw.trim(), cleanDigits, last5, extracted };
  };

  const handleValidateBarcode = (rawCode: string) => {
    if (!rawCode.trim() || !currentItem) return;

    const { raw, cleanDigits, last5, extracted } = extract5MinusLast(rawCode);
    const targetSku = (currentItem.sku || '').trim().toUpperCase();
    const targetSkuDigits = targetSku.replace(/[^0-9]/g, '');

    // Comparison logic:
    // Matches if:
    // 1. targetSku contains extracted (e.g. SKU '48060' contains '4806')
    // 2. targetSkuDigits contains or ends with extracted
    // 3. extracted is part of targetSkuDigits or equals targetSku
    // 4. last5 matches targetSkuDigits
    // 5. full raw code matches item barcode
    const isMatch = Boolean(
      (extracted && targetSku.includes(extracted)) ||
      (extracted && targetSkuDigits && (targetSkuDigits.endsWith(extracted) || targetSkuDigits.includes(extracted) || extracted.includes(targetSkuDigits))) ||
      (last5 && (targetSku.includes(last5) || targetSkuDigits.includes(last5))) ||
      (currentItem.barcode && currentItem.barcode.trim() === raw) ||
      targetSku === raw.toUpperCase()
    );

    if (isMatch) {
      playBeep('success');
      setBarcodeValidation({
        rawScanned: raw,
        extractedCode: extracted,
        isMatch: true,
        message: `✓ Código conferido! Código lido: ${raw} → Extraído: ${extracted} (confere com SKU ${currentItem.sku})`,
      });

      // Automatically move focus to quantity input so user can type on collector keyboard
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
    } else {
      playBeep('error');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      setBarcodeValidation({
        rawScanned: raw,
        extractedCode: extracted,
        isMatch: false,
        message: `⚠️ CÓDIGO ERRADO! O código bipado "${raw}" (extraído: "${extracted}") não confere com o item ${currentItem.sku}. Verifique o produto!`,
      });
    }
  };

  const handleSaveCurrentItem = (advance: boolean = true) => {
    // If operator has typed nothing in the input, do not mark as counted 0 / ok
    if (inputValue.trim() === '') {
      if (advance && currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
      return items;
    }

    setHasModifiedAnyItem(true);
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

  // Exit/Pause without concluding - maintains pending status if user didn't count
  const handleExitOrPause = () => {
    let updated = items;
    let didCountCurrent = false;

    // Only save the current item if the user actually typed a quantity
    if (inputValue.trim() !== '') {
      updated = handleSaveCurrentItem(false);
      didCountCurrent = true;
    }

    // Check if any items have actually been counted in this session
    const hasAnyCounted = updated.some(
      (it) => it.status === 'ok' || it.status === 'divergent' || (it.countedQty && it.countedQty > 0)
    );

    // If the operator hasn't counted or modified anything, it MUST stay 'Pendente'!
    // If the operator did count at least one item, it becomes 'Em Andamento' (em aberto).
    // It NEVER becomes 'Concluída' when exiting/pausing!
    const targetStatus: CountSession['status'] =
      (hasModifiedAnyItem || didCountCurrent || hasAnyCounted)
        ? 'Em Andamento'
        : 'Pendente';

    onSaveCount(session.id, updated, targetStatus, currentIndex);
    onBack();
  };

  // Finalize count - ALWAYS marks session as 'Concluída' so it appears in Concluídas
  const handleFinalizarContagem = () => {
    let updated = items;
    if (inputValue.trim() !== '') {
      const boxes = isBoxMode ? parsedInputNumber : undefined;
      const finalCountedPieces = convertedPieces;
      updated = items.map((it, idx) => {
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
    }

    // Finalize all items: any uncounted items default to 0 counted
    const finalizedItems = updated.map((it) => {
      if (it.status === 'pending' || !it.status) {
        const isOk = (it.expectedQty || 0) === (it.countedQty || 0);
        return {
          ...it,
          countedQty: it.countedQty || 0,
          status: (isOk ? 'ok' : 'divergent') as InventoryItem['status'],
        };
      }
      return it;
    });

    // CRITICAL: Status MUST be 'Concluída' so it appears immediately under Concluídas!
    const finalStatus: CountSession['status'] = 'Concluída';

    playBeep('success');
    onSaveCount(session.id, finalizedItems, finalStatus, currentIndex);
    onBack();
  };

  // Keyboard navigation for collector keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim() === '') {
        setInlineFeedback({
          message: '⚠️ Digite a quantidade contada do item antes de avançar, ou use "Sair / Pausar" para sair mantendo em aberto.',
          type: 'warning',
        });
        playBeep('error');
        return;
      }
      if (currentIndex < items.length - 1) {
        handleSaveCurrentItem(true);
      } else {
        handleFinalizarContagem();
      }
    }
  };

  if (!currentItem) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Nenhum item encontrado nesta contagem.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
        >
          Voltar
        </button>
      </div>
    );
  }

  const isLastItem = currentIndex === items.length - 1;

  return (
    <div className="min-h-screen bg-[#111c29] flex flex-col justify-between">
      {/* Top Bar (Visible on desktop) */}
      <div className="hidden md:flex bg-[#1b2838] border-b border-slate-700 px-4 py-2.5 items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white">CEVA Inventário</span>
          <span className="text-slate-500">•</span>
          <span>{session.name} ({session.code})</span>
          <span className="text-slate-500">•</span>
          <span>Operador: <strong>{session.responsible}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Modo Coletor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('expanded')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'expanded'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Modo Expandido</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
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
                onClick={handleExitOrPause}
                className="p-1.5 -ml-1 rounded-xl hover:bg-white/20 active:bg-white/30 transition-colors text-white cursor-pointer flex items-center gap-1.5"
                title="Sair / Pausar (mantém a contagem em aberto)"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-xs font-bold hidden sm:inline">Sair / Pausar</span>
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

              <button
                type="button"
                onClick={handleFinalizarContagem}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                title="Finalizar contagem e ir para Concluído"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Finalizar</span>
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

          {/* Scrollable Center Body */}
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
                {/* 1. Location Banner */}
                <div className="bg-[#213145] text-white p-4 rounded-2xl shadow-sm border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                        Posição / Endereço
                      </span>
                      <div className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
                        {currentItem.location || 'POSIÇÃO'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SKU Card (Apenas 1 vez, sem duplicar) */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Barcode className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Código do Produto
                      </span>
                      <div className="text-base sm:text-lg font-mono font-black text-slate-900 leading-tight">
                        SKU: {currentItem.sku}
                      </div>
                      {/* Mostrar nome somente se existir e NÃO repetir o SKU */}
                      {Boolean(
                        currentItem.name &&
                        !currentItem.name.toLowerCase().includes(currentItem.sku.toLowerCase()) &&
                        !currentItem.name.toLowerCase().startsWith('item sku')
                      ) && (
                        <p className="text-xs font-medium text-slate-600 mt-0.5">
                          {currentItem.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {isBoxMode && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1 shrink-0">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                      1 CX = {piecesPerBox} UN
                    </span>
                  )}
                </div>

                {/* 3. Barcode Scanner / Bipagem Section (5 últimos menos o último) */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ScanLine className="w-4 h-4 text-blue-600" />
                      <span>Bipar Código de Barras</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      5 últimos menos o último
                    </span>
                  </div>

                  {/* Input for barcode scanner / direct typing */}
                  <div className="relative">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={scannedBarcode}
                      onChange={(e) => setScannedBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleValidateBarcode(scannedBarcode);
                        }
                      }}
                      placeholder="Bipe com o leitor ou digite o código..."
                      className="w-full bg-slate-50 focus:bg-white pl-9 pr-20 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs font-mono font-bold text-slate-800 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleValidateBarcode(scannedBarcode)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Bipar
                    </button>
                  </div>

                  {/* Barcode Validation Feedback Message */}
                  {barcodeValidation && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                        barcodeValidation.isMatch
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-red-50 text-red-900 border-red-300'
                      }`}
                    >
                      {barcodeValidation.isMatch ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <div className="font-bold">
                          {barcodeValidation.isMatch ? 'CÓDIGO CONFERIDO' : 'ESTE CÓDIGO ESTÁ ERRADO!'}
                        </div>
                        <p className="leading-tight text-[11px]">
                          {barcodeValidation.message}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 4. Numbers Comparison (Sistêmica vs Contagem) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Sistêmica (Esperada) */}
                  <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between text-center">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Qtd Sistêmica
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

                  {/* Física (Contada - Digitação direta no teclado do coletor) */}
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

          {/* 5. Sticky Bottom Action Bar */}
          <footer className="bg-white border-t border-slate-200/90 p-3 shrink-0 shadow-lg space-y-2 z-20">
            {/* Inline Feedback / Warning */}
            {inlineFeedback && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start justify-between gap-2 animate-in fade-in duration-200">
                <span>{inlineFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setInlineFeedback(null)}
                  className="text-amber-700 hover:text-amber-900 font-bold text-xs shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            {!isLastItem ? (
              <button
                type="button"
                onClick={() => handleSaveCurrentItem(true)}
                className="w-full h-13 bg-[#0fa958] hover:bg-[#0c8a48] active:bg-[#0a753d] text-white rounded-2xl font-black text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>GRAVAR E PRÓXIMO ({items.length - 1 - currentIndex} restam)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizarContagem}
                className="w-full h-13 bg-[#0fa958] hover:bg-[#0c8a48] active:bg-[#0a753d] text-white rounded-2xl font-black text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
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
                  if (inputValue.trim() !== '') {
                    handleSaveCurrentItem(false);
                  }
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentIndex === 0}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={handleExitOrPause}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Sair mantendo a contagem em aberto"
              >
                <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Sair / Pausar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (inputValue.trim() !== '') {
                    handleSaveCurrentItem(false);
                  }
                  if (currentIndex < items.length - 1) {
                    setCurrentIndex((prev) => prev + 1);
                  }
                }}
                disabled={currentIndex >= items.length - 1}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleFinalizarContagem}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Concluir e finalizar contagem agora"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Concluir</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
