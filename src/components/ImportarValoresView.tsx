import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  DollarSign,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  TrendingUp,
  Boxes,
  Database,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductPrice } from '../types';

interface ImportarValoresViewProps {
  productPrices: Record<string, number>;
  onSaveProductPrices: (prices: ProductPrice[]) => Promise<void>;
  onClearAllPrices?: () => Promise<void>;
  onDeletePrice?: (sku: string) => Promise<void>;
  showToast: (msg: string) => void;
}

interface ParsedRow {
  sku: string;
  unitPrice: number;
  isValid: boolean;
  error?: string;
}

export const ImportarValoresView: React.FC<ImportarValoresViewProps> = ({
  productPrices,
  onSaveProductPrices,
  onClearAllPrices,
  onDeletePrice,
  showToast,
}) => {
  // Local list representation of product prices
  const [items, setItems] = useState<ProductPrice[]>(() => {
    return Object.entries(productPrices).map(([sku, unitPrice]) => ({
      sku: sku.toUpperCase(),
      unitPrice,
    }));
  });

  // Sync state if parent updates
  React.useEffect(() => {
    setItems(
      Object.entries(productPrices).map(([sku, unitPrice]) => ({
        sku: sku.toUpperCase(),
        unitPrice,
      }))
    );
  }, [productPrices]);

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
  const [manualPrice, setManualPrice] = useState('');

  // Editing row state
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate Metrics
  const stats = useMemo(() => {
    const totalCount = items.length;
    if (totalCount === 0) {
      return { totalCount: 0, avgPrice: 0, maxPrice: 0, minPrice: 0 };
    }
    const prices = items.map((it) => it.unitPrice).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return { totalCount, avgPrice, maxPrice, minPrice };
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((it) => it.sku.toLowerCase().includes(q));
  }, [items, searchTerm]);

  // Download Sample Template
  const handleDownloadSample = () => {
    const csvContent =
      'SKU;ValorUnitario\n' +
      'PP-48-5055-458;42.50\n' +
      '48060;18.90\n' +
      '48061;24.50\n' +
      '48062;110.00\n' +
      'AUTO-9921;85.00\n' +
      'AUTO-4412;140.20\n' +
      'LOG-8820;32.00\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_valores_ceva.csv';
    a.click();
    showToast('Modelo de planilha para valores baixado com sucesso!');
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
            c.includes('sku') || c.includes('codigo') || c.includes('código') || c.includes('valor') || c.includes('preço') || c.includes('preco')
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
            numVal = rawVal;
          } else if (typeof rawVal === 'string') {
            const clean = rawVal.replace('R$', '').replace(/\s+/g, '').replace(',', '.');
            numVal = parseFloat(clean);
          }

          const isValid = !isNaN(numVal) && numVal >= 0;
          parsed.push({
            sku: rawSku.toUpperCase(),
            unitPrice: isValid ? numVal : 0,
            isValid,
            error: isValid ? undefined : 'Valor monetário inválido',
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
        (lower.includes('sku') || lower.includes('codigo') || lower.includes('código') || lower.includes('valor') || lower.includes('preço'))
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
        const rawVal = parts[1].replace('R$', '').replace(/\s+/g, '').replace(',', '.');
        const numVal = parseFloat(rawVal);
        const isValid = !isNaN(numVal) && numVal >= 0;

        parsed.push({
          sku: rawSku.toUpperCase(),
          unitPrice: isValid ? numVal : 0,
          isValid,
          error: isValid ? undefined : 'Valor inválido',
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
      let updatedList: ProductPrice[] = [];
      if (replaceExistingOnImport) {
        if (onClearAllPrices) {
          await onClearAllPrices();
        }
        const map = new Map<string, number>();
        validRows.forEach((r) => map.set(r.sku.toUpperCase(), r.unitPrice));
        updatedList = Array.from(map.entries()).map(([sku, unitPrice]) => ({
          sku,
          unitPrice,
        }));
      } else {
        const map = new Map<string, number>();
        items.forEach((it) => map.set(it.sku.toUpperCase(), it.unitPrice));
        validRows.forEach((r) => map.set(r.sku.toUpperCase(), r.unitPrice));
        updatedList = Array.from(map.entries()).map(([sku, unitPrice]) => ({
          sku,
          unitPrice,
        }));
      }

      await onSaveProductPrices(updatedList);
      setItems(updatedList);
      setPreviewRows([]);
      setFileName(null);
      setPasteText('');
      setIsImportOpen(false);
      showToast(
        replaceExistingOnImport
          ? `Base anterior limpa! ${validRows.length} novos valores de SKUs foram importados com sucesso!`
          : `Sucesso! ${validRows.length} valores de SKUs foram importados e salvos no banco!`
      );
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar valores no banco de dados.');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Clear All Items
  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    try {
      if (onClearAllPrices) {
        await onClearAllPrices();
      }
      setItems([]);
      setIsClearConfirmOpen(false);
      showToast('Todos os valores foram apagados! Você pode inserir ou importar os novos agora.');
    } catch (e) {
      console.error(e);
      showToast('Erro ao apagar valores.');
    } finally {
      setIsClearing(false);
    }
  };

  // Add Manual Item
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = manualSku.trim().toUpperCase();
    const priceNum = parseFloat(manualPrice.replace(',', '.'));

    if (!cleanSku) {
      showToast('Digite o código do SKU.');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Digite um valor unitário válido.');
      return;
    }

    setIsSaving(true);
    try {
      const existingIndex = items.findIndex((it) => it.sku.toUpperCase() === cleanSku);
      let updatedList: ProductPrice[] = [];
      if (existingIndex >= 0) {
        updatedList = items.map((it, idx) =>
          idx === existingIndex ? { sku: cleanSku, unitPrice: priceNum } : it
        );
      } else {
        updatedList = [{ sku: cleanSku, unitPrice: priceNum }, ...items];
      }

      await onSaveProductPrices(updatedList);
      setItems(updatedList);
      setManualSku('');
      setManualPrice('');
      setIsAddingManual(false);
      showToast(`Valor do SKU "${cleanSku}" salvo com sucesso!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar valor.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Single Item
  const handleDeleteItem = async (skuToDelete: string) => {
    const updated = items.filter((it) => it.sku.toUpperCase() !== skuToDelete.toUpperCase());
    setItems(updated);
    try {
      if (onDeletePrice) {
        await onDeletePrice(skuToDelete);
      } else {
        await onSaveProductPrices(updated);
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao atualizar banco de dados.');
    }
  };

  // Inline Edit Save
  const handleSaveInlineEdit = async (sku: string) => {
    const num = parseFloat(editingPrice.replace(',', '.'));
    if (isNaN(num) || num < 0) {
      showToast('Digite um valor numérico válido.');
      return;
    }

    const updated = items.map((it) =>
      it.sku.toUpperCase() === sku.toUpperCase() ? { ...it, unitPrice: num } : it
    );
    setItems(updated);
    setEditingSku(null);
    try {
      await onSaveProductPrices(updated);
      showToast(`Valor de ${sku} atualizado para R$ ${num.toFixed(2)}.`);
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
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
              Importar Valores (R$)
            </h1>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Tabela oficial de preços unitários dos produtos para cálculo monetário do estoque,
            avaliação de inventário e impacto financeiro das divergências.
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
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer"
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
            title="Apagar todos os valores de produtos cadastrados para inserir novos"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>Limpar Todos os Valores</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            SKUs com Preço
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.totalCount}</span>
            <span className="text-xs text-slate-400 font-medium">itens cadastrados</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Preço Médio Unitário
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              R$ {stats.avgPrice.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Maior Valor Unitário
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              R$ {stats.maxPrice.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Menor Valor Unitário
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-700">
              R$ {stats.minPrice.toFixed(2).replace('.', ',')}
            </span>
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
              className="bg-slate-50 border border-blue-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-end gap-3"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="w-full md:w-64">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Unitário (R$):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Valor</span>
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
            className="bg-white rounded-2xl border-2 border-dashed border-emerald-300 p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Importar Tabela de Valores (Excel / CSV ou Copiar e Colar)
                </h3>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImportMode('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importMode === 'upload'
                      ? 'bg-white text-emerald-800 shadow-2xs'
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
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Colar da Planilha
                </button>
              </div>
            </div>

            {/* Upload File Mode */}
            {importMode === 'upload' && (
              <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-emerald-600 mb-2" />
                <p className="font-bold text-slate-900 text-sm mb-1">
                  Arraste seu arquivo Excel (.xlsx, .xls) ou CSV aqui
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Colunas esperadas: <strong>Coluna 1: SKU</strong> | <strong>Coluna 2: Valor (R$)</strong>
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {isProcessing ? 'Processando...' : 'Selecionar Arquivo do Computador'}
                </button>
                {fileName && (
                  <span className="text-xs font-semibold text-emerald-700 mt-2">
                    Arquivo carregado: {fileName}
                  </span>
                )}
              </div>
            )}

            {/* Paste Text Mode */}
            {importMode === 'paste' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Copie as linhas com <strong>SKU</strong> e <strong>Valor</strong> no Excel ou Google Planilhas e cole diretamente abaixo:
                </p>
                <textarea
                  rows={5}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Exemplo:\nPP-48-5055-458\t42.50\n48060\t18.90\nAUTO-9921\t85.00`}
                  className="w-full p-3.5 font-mono text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
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
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-slate-600">Substituir base existente (apagar valores antigos)</span>
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
                        className="px-4 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
                        <th className="px-3 py-2">Valor Identificado</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                          <td className="px-3 py-1.5 font-mono font-bold text-slate-900">{row.sku}</td>
                          <td className="px-3 py-1.5 font-semibold text-emerald-700">
                            R$ {row.unitPrice.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-3 py-1.5">
                            {row.isValid ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
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
              placeholder="Buscar por SKU cadastrado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <th className="px-4 py-3.5">Valor Unitário (R$)</th>
                <th className="px-4 py-3.5">Formato Financeiro</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">Nenhum valor de SKU encontrado</p>
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
                            <span className="text-xs font-bold text-slate-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-emerald-400 text-xs font-bold text-slate-900 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(item.sku)}
                              className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
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
                          <span className="font-black text-sm text-emerald-700">
                            R$ {item.unitPrice.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / UN
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSku(item.sku);
                                setEditingPrice(String(item.unitPrice));
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Editar valor"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.sku)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Excluir valor deste SKU"
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

      {/* Modal de Confirmação para Limpar Todos os Valores */}
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
                    Limpar Todos os Valores?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Esta ação excluirá permanentemente todos os <b>{items.length}</b> valores unitários de SKUs atualmente salvos no banco de dados.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                ⚠️ Use esta opção quando quiser apagar toda a lista atual para inserir ou importar uma nova planilha de valores do zero.
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
                      <span>Sim, Limpar Todos os Valores</span>
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
