import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Package,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  CheckCircle2,
  Layers,
  ArrowRight,
  Database,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SkuConversion } from '../types';

interface ConversaoCaixasViewProps {
  skuConversions: Record<string, number>;
  onSaveSkuConversions: (conversions: SkuConversion[]) => Promise<void>;
  onClearAllConversions?: () => Promise<void>;
  onDeleteConversion?: (sku: string) => Promise<void>;
  showToast: (msg: string) => void;
}

interface ParsedRow {
  sku: string;
  piecesPerBox: number;
  isValid: boolean;
  error?: string;
}

export const ConversaoCaixasView: React.FC<ConversaoCaixasViewProps> = ({
  skuConversions,
  onSaveSkuConversions,
  onClearAllConversions,
  onDeleteConversion,
  showToast,
}) => {
  // Local list of conversions
  const [items, setItems] = useState<SkuConversion[]>(() => {
    return Object.entries(skuConversions).map(([sku, piecesPerBox]) => ({
      sku: sku.toUpperCase(),
      piecesPerBox,
    }));
  });

  // Keep in sync with parent props
  React.useEffect(() => {
    setItems(
      Object.entries(skuConversions).map(([sku, piecesPerBox]) => ({
        sku: sku.toUpperCase(),
        piecesPerBox,
      }))
    );
  }, [skuConversions]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Clear All Modal State
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [replaceExistingOnImport, setReplaceExistingOnImport] = useState(false);

  // Manual Add Form State
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [manualPieces, setManualPieces] = useState('');

  // Editing row state
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingPieces, setEditingPieces] = useState<string>('');

  // Quick interactive simulation state
  const [simSku, setSimSku] = useState<string>('');
  const [simBoxes, setSimBoxes] = useState<string>('5');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metrics
  const stats = useMemo(() => {
    const totalCount = items.length;
    if (totalCount === 0) {
      return { totalCount: 0, avgPieces: 0, maxPieces: 0, minPieces: 0 };
    }
    const factors = items.map((it) => it.piecesPerBox).filter((p) => p > 0);
    const avgPieces = factors.length > 0 ? factors.reduce((a, b) => a + b, 0) / factors.length : 0;
    const maxPieces = factors.length > 0 ? Math.max(...factors) : 0;
    const minPieces = factors.length > 0 ? Math.min(...factors) : 0;

    return { totalCount, avgPieces: Math.round(avgPieces), maxPieces, minPieces };
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((it) => it.sku.toLowerCase().includes(q));
  }, [items, searchTerm]);

  // Simulation calculation
  const simResult = useMemo(() => {
    const boxes = parseInt(simBoxes, 10);
    if (isNaN(boxes) || boxes <= 0) return 0;
    const factor = skuConversions[simSku.toLowerCase()] || 1;
    return boxes * factor;
  }, [simSku, simBoxes, skuConversions]);

  // Set default simulation SKU once items load
  React.useEffect(() => {
    if (!simSku && items.length > 0) {
      setSimSku(items[0].sku);
    }
  }, [items, simSku]);

  // Download Sample Template
  const handleDownloadSample = () => {
    const csvContent =
      'SKU;PecasPorCaixa\n' +
      'PP-48-5055-458;50\n' +
      '48060;24\n' +
      '48061;12\n' +
      '48062;10\n' +
      'AUTO-9921;25\n' +
      'AUTO-4412;15\n' +
      'LOG-8820;100\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_conversao_caixas_pecas_ceva.csv';
    a.click();
    showToast('Modelo de planilha para conversão baixado com sucesso!');
  };

  // Process Excel/CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rows || rows.length === 0) {
          showToast('A planilha selecionada está vazia.');
          setIsProcessing(false);
          return;
        }

        const parsed: ParsedRow[] = [];
        let startIndex = 0;

        // Check if row 0 is header
        const row0 = (rows[0] || []).map((c: any) => String(c).toLowerCase());
        if (
          row0.some((c: string) =>
            c.includes('sku') || c.includes('codigo') || c.includes('peça') || c.includes('peca') || c.includes('caixa') || c.includes('fator')
          )
        ) {
          startIndex = 1;
        }

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawSku = String(row[0] || '').trim();
          if (!rawSku) continue;

          let rawVal = row[1];
          let numVal = 0;
          if (typeof rawVal === 'number') {
            numVal = Math.round(rawVal);
          } else if (typeof rawVal === 'string') {
            const clean = rawVal.replace(/\D/g, '');
            numVal = parseInt(clean, 10);
          }

          const isValid = !isNaN(numVal) && numVal > 0;
          parsed.push({
            sku: rawSku.toUpperCase(),
            piecesPerBox: isValid ? numVal : 1,
            isValid,
            error: isValid ? undefined : 'Quantidade de peças inválida (deve ser > 0)',
          });
        }

        setPreviewRows(parsed);
        showToast(`${parsed.length} itens identificados na planilha!`);
      } catch (err) {
        console.error('Erro ao ler planilha Excel/CSV:', err);
        showToast('Erro ao ler a planilha. Verifique o formato do arquivo.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Process Pasted Text
  const handleProcessPastedText = () => {
    if (!pasteText.trim()) {
      showToast('Cole o conteúdo da planilha no campo de texto.');
      return;
    }

    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: ParsedRow[] = [];

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (
        index === 0 &&
        (lower.includes('sku') || lower.includes('codigo') || lower.includes('peça') || lower.includes('peca') || lower.includes('caixa'))
      ) {
        return;
      }

      let parts: string[] = [];
      if (line.includes('\t')) parts = line.split('\t');
      else if (line.includes(';')) parts = line.split(';');
      else if (line.includes(',')) parts = line.split(',');
      else parts = line.split(/\s+/);

      parts = parts.map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const rawSku = parts[0];
        const numVal = parseInt(parts[1].replace(/\D/g, ''), 10);
        const isValid = !isNaN(numVal) && numVal > 0;

        parsed.push({
          sku: rawSku.toUpperCase(),
          piecesPerBox: isValid ? numVal : 1,
          isValid,
          error: isValid ? undefined : 'Quantidade inválida',
        });
      }
    });

    if (parsed.length === 0) {
      showToast('Nenhum dado válido reconhecido no texto colado.');
      return;
    }

    setPreviewRows(parsed);
    showToast(`${parsed.length} linhas reconhecidas do texto colado!`);
  };

  // Confirm and Save Imported Rows
  const handleApplyImport = async () => {
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast('Nenhum item válido para importar.');
      return;
    }

    setIsSaving(true);
    try {
      let updatedList: SkuConversion[] = [];
      if (replaceExistingOnImport) {
        if (onClearAllConversions) {
          await onClearAllConversions();
        }
        const map = new Map<string, number>();
        validRows.forEach((r) => map.set(r.sku.toUpperCase(), r.piecesPerBox));
        updatedList = Array.from(map.entries()).map(([sku, piecesPerBox]) => ({
          sku,
          piecesPerBox,
        }));
      } else {
        const map = new Map<string, number>();
        items.forEach((it) => map.set(it.sku.toUpperCase(), it.piecesPerBox));
        validRows.forEach((r) => map.set(r.sku.toUpperCase(), r.piecesPerBox));
        updatedList = Array.from(map.entries()).map(([sku, piecesPerBox]) => ({
          sku,
          piecesPerBox,
        }));
      }

      await onSaveSkuConversions(updatedList);
      setItems(updatedList);
      setPreviewRows([]);
      setFileName(null);
      setPasteText('');
      setIsImportOpen(false);
      showToast(
        replaceExistingOnImport
          ? `Base anterior limpa! ${validRows.length} novas regras de conversão salvas com sucesso!`
          : `Sucesso! ${validRows.length} fatores de conversão salvos no banco!`
      );
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar conversões no banco de dados.');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Clear All Conversions
  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    try {
      if (onClearAllConversions) {
        await onClearAllConversions();
      }
      setItems([]);
      setIsClearConfirmOpen(false);
      showToast('Todas as regras de caixas foram apagadas! Você pode inserir ou importar as novas agora.');
    } catch (e) {
      console.error(e);
      showToast('Erro ao apagar regras de conversão.');
    } finally {
      setIsClearing(false);
    }
  };

  // Add Manual Item
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = manualSku.trim().toUpperCase();
    const piecesNum = parseInt(manualPieces.trim(), 10);

    if (!cleanSku) {
      showToast('Digite o código do SKU.');
      return;
    }
    if (isNaN(piecesNum) || piecesNum <= 0) {
      showToast('Digite um número de peças maior que zero.');
      return;
    }

    setIsSaving(true);
    try {
      const existingIndex = items.findIndex((it) => it.sku.toUpperCase() === cleanSku);
      let updatedList: SkuConversion[] = [];
      if (existingIndex >= 0) {
        updatedList = items.map((it, idx) =>
          idx === existingIndex ? { sku: cleanSku, piecesPerBox: piecesNum } : it
        );
      } else {
        updatedList = [{ sku: cleanSku, piecesPerBox: piecesNum }, ...items];
      }

      await onSaveSkuConversions(updatedList);
      setItems(updatedList);
      setManualSku('');
      setManualPieces('');
      setIsAddingManual(false);
      showToast(`Conversão de "${cleanSku}" salva com ${piecesNum} peças/caixa!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar conversão.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Single Item
  const handleDeleteItem = async (skuToDelete: string) => {
    const updated = items.filter((it) => it.sku.toUpperCase() !== skuToDelete.toUpperCase());
    setItems(updated);
    try {
      if (onDeleteConversion) {
        await onDeleteConversion(skuToDelete);
      } else {
        await onSaveSkuConversions(updated);
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao atualizar banco de dados.');
    }
  };

  // Inline Edit Save
  const handleSaveInlineEdit = async (sku: string) => {
    const num = parseInt(editingPieces.trim(), 10);
    if (isNaN(num) || num <= 0) {
      showToast('Digite uma quantidade de peças válida (> 0).');
      return;
    }

    const updated = items.map((it) =>
      it.sku.toUpperCase() === sku.toUpperCase() ? { ...it, piecesPerBox: num } : it
    );
    setItems(updated);
    setEditingSku(null);
    try {
      await onSaveSkuConversions(updated);
      showToast(`Conversão de ${sku} atualizada para ${num} peças/caixa.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full px-4 sm:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Package className="w-5 h-5 stroke-[2.5]" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
              Conversão Caixas / Peças
            </h1>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Defina a quantidade de peças por caixa de cada SKU. Quando o operador selecionar contagem
            em Caixas (CX) no coletor, o sistema multiplicará automaticamente para peças (UN).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Baixar planilha modelo CSV para preenchimento"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Baixar Modelo CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportOpen(!isImportOpen)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isImportOpen ? 'Fechar Importador' : 'Importar Planilha / Colar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingManual(!isAddingManual)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0b1c30] hover:bg-slate-800 text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Manual</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={items.length === 0}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Apagar todas as regras de caixas cadastradas para inserir novas"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>Limpar Todas as Conversões</span>
          </button>
        </div>
      </div>

      {/* KPI Cards + Interactive Simulator */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            SKUs Configurados
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.totalCount}</span>
            <span className="text-xs text-slate-400 font-medium">fatores ativos</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Média de Peças / Caixa
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">
              {stats.avgPieces} <span className="text-xs font-bold text-slate-500">peças/CX</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Maior Volume por Caixa
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {stats.maxPieces} <span className="text-xs font-bold text-slate-500">peças</span>
            </span>
          </div>
        </div>

        {/* Quick Simulator Card */}
        <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl p-3.5 border border-amber-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs mb-1">
            <Calculator className="w-3.5 h-3.5 text-amber-700" />
            <span>Simulador Rápido CX ➔ UN:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={simBoxes}
              onChange={(e) => setSimBoxes(e.target.value)}
              className="w-14 px-2 py-1 text-xs font-bold rounded-lg border border-amber-300 bg-white text-slate-900 text-center"
              placeholder="Caixas"
              title="Quantidade de Caixas"
            />
            <span className="text-xs font-bold text-amber-900">CX =</span>
            <div className="bg-white px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
              <span className="text-sm font-black text-amber-800">{simResult}</span>
              <span className="text-[10px] font-bold text-amber-600">UN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Quick Add Form */}
      <AnimatePresence>
        {isAddingManual && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleAddManual}
              className="bg-slate-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-end gap-3"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código do SKU:
                </label>
                <input
                  type="text"
                  placeholder="Ex: PP-48-5055-458 ou AUTO-9921"
                  value={manualSku}
                  onChange={(e) => setManualSku(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="w-full md:w-64">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantidade de Peças por Caixa:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ex: 50"
                    value={manualPieces}
                    onChange={(e) => setManualPieces(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    UN / CX
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Conversão</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingManual(false)}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Container (Upload or Paste) */}
      <AnimatePresence>
        {isImportOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Importar Conversão Peças por Caixa (Excel / CSV ou Copiar e Colar)
                </h3>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImportMode('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importMode === 'upload'
                      ? 'bg-white text-amber-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Subir Arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importMode === 'paste'
                      ? 'bg-white text-amber-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Colar da Planilha
                </button>
              </div>
            </div>

            {/* Upload File Mode */}
            {importMode === 'upload' && (
              <div className="flex flex-col items-center justify-center p-6 bg-amber-50/50 rounded-2xl border border-amber-100 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-amber-600 mb-2" />
                <p className="font-bold text-slate-900 text-sm mb-1">
                  Arraste seu arquivo Excel (.xlsx, .xls) ou CSV aqui
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Colunas esperadas: <strong>Coluna 1: SKU</strong> | <strong>Coluna 2: Peças por Caixa (Número)</strong>
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {isProcessing ? 'Processando...' : 'Selecionar Arquivo do Computador'}
                </button>
                {fileName && (
                  <span className="text-xs font-semibold text-amber-800 mt-2">
                    Arquivo carregado: {fileName}
                  </span>
                )}
              </div>
            )}

            {/* Paste Text Mode */}
            {importMode === 'paste' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Copie as linhas com <strong>SKU</strong> e <strong>PeçasPorCaixa</strong> no Excel e cole diretamente abaixo:
                </p>
                <textarea
                  rows={5}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Exemplo:\nPP-48-5055-458\t50\n48060\t24\nAUTO-9921\t25`}
                  className="w-full p-3.5 font-mono text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  Reconhecer Linhas Coladas
                </button>
              </div>
            )}

            {/* Preview of Parsed Rows */}
            {previewRows.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Pré-visualização: {previewRows.filter((r) => r.isValid).length} válidos de {previewRows.length} linhas
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={replaceExistingOnImport}
                        onChange={(e) => setReplaceExistingOnImport(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-slate-600">Substituir base existente (apagar regras antigas)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewRows([])}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Descartar
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyImport}
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded-lg text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Salvando...' : 'Gravar no Banco de Dados'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Peças por Caixa</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                          <td className="px-3 py-1.5 font-mono font-bold text-slate-900">{row.sku}</td>
                          <td className="px-3 py-1.5 font-bold text-amber-800">
                            {row.piecesPerBox} UN/CX
                          </td>
                          <td className="px-3 py-1.5">
                            {row.isValid ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                Pronto para gravar
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                {row.error || 'Erro'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por SKU configurado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Exibindo <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> SKUs
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Código SKU</th>
                <th className="px-4 py-3.5">Peças por Caixa</th>
                <th className="px-4 py-3.5">Simulação de Exemplo</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">Nenhum fator de conversão encontrado</p>
                    <p className="text-xs mt-1">
                      Importe uma planilha ou adicione manualmente no botão acima.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isEditing = editingSku === item.sku;
                  return (
                    <tr key={item.sku} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {item.sku}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={editingPieces}
                              onChange={(e) => setEditingPieces(e.target.value)}
                              className="w-20 px-2 py-1 rounded-lg border border-amber-400 text-xs font-bold text-slate-900 focus:outline-none"
                              autoFocus
                            />
                            <span className="text-xs text-slate-500 font-medium">UN/CX</span>
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(item.sku)}
                              className="p-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                              title="Salvar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSku(null)}
                              className="p-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-black text-sm text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                            {item.piecesPerBox} peças / caixa
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold text-slate-600">
                          1 CX = <strong>{item.piecesPerBox} UN</strong> &nbsp;|&nbsp; 5 CX = <strong>{item.piecesPerBox * 5} UN</strong>
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSku(item.sku);
                                setEditingPieces(String(item.piecesPerBox));
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Editar fator de conversão"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.sku)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Excluir fator de conversão deste SKU"
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
      </div>

      {/* Modal de Confirmação para Limpar Todas as Conversões */}
      <AnimatePresence>
        {isClearConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Limpar Todas as Regras de Caixas?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Esta ação excluirá permanentemente todos os <b>{items.length}</b> fatores de conversão (peças por caixa) salvos no banco de dados.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                ⚠️ Use esta opção quando quiser apagar todas as regras de caixas existentes para inserir ou importar uma nova planilha com dados atualizados.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => setIsClearConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={handleConfirmClearAll}
                  className="px-4 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Apagando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sim, Limpar Todas as Conversões</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
