import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Boxes,
  DollarSign,
  ArrowRight,
  Database
} from 'lucide-react';
import { ProductPrice, SkuConversion } from '../types';

interface ImportExcelParametrosModalProps {
  isOpen: boolean;
  type: 'prices' | 'conversions';
  onClose: () => void;
  onSavePrices: (prices: ProductPrice[]) => Promise<void>;
  onSaveConversions: (conversions: SkuConversion[]) => Promise<void>;
  showToast: (msg: string) => void;
}

interface ParsedItem {
  sku: string;
  value: number;
  description?: string;
  isValid: boolean;
  error?: string;
}

export const ImportExcelParametrosModal: React.FC<ImportExcelParametrosModalProps> = ({
  isOpen,
  type,
  onClose,
  onSavePrices,
  onSaveConversions,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileParsedRows, setFileParsedRows] = useState<ParsedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isPrices = type === 'prices';
  const modalTitle = isPrices
    ? 'Importar Tabela de Preços (Excel)'
    : 'Importar Peças por Caixa (Excel)';

  // Parse pasted text
  const textParsedRows: ParsedItem[] = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const result: ParsedItem[] = [];

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      // Skip header row
      if (
        index === 0 &&
        (lower.includes('sku') || lower.includes('código') || lower.includes('codigo') || lower.includes('item'))
      ) {
        return;
      }

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        parts = line.split(/\s+/);
      }

      parts = parts.map((p) => p.trim()).filter(Boolean);

      if (parts.length >= 2) {
        const sku = parts[0];
        const rawVal = parts[1].replace('R$', '').replace(/\s+/g, '').replace(',', '.');
        const numVal = isPrices ? parseFloat(rawVal) : parseInt(rawVal.replace(/\D/g, ''), 10);

        const isValid = Boolean(sku && !isNaN(numVal) && numVal > 0);
        result.push({
          sku,
          value: isValid ? numVal : 0,
          description: parts[2] || undefined,
          isValid,
          error: isValid ? undefined : 'Valor ou SKU inválido',
        });
      } else if (parts.length === 1 && parts[0]) {
        result.push({
          sku: parts[0],
          value: 0,
          isValid: false,
          error: 'Coluna de valor/quantidade ausente',
        });
      }
    });

    return result;
  }, [rawText, isPrices]);

  const activeRows = activeTab === 'upload' ? fileParsedRows : textParsedRows;
  const validRows = activeRows.filter((r) => r.isValid);
  const invalidRows = activeRows.filter((r) => !r.isValid);

  // Handle Excel File Upload (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const processExcelFile = (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (!json || json.length === 0) {
          showToast('A planilha está vazia.');
          setIsProcessing(false);
          return;
        }

        const parsed: ParsedItem[] = [];

        // Check if first row is header
        let startIndex = 0;
        const firstRow = json[0] || [];
        const firstRowText = firstRow.map((c) => String(c || '').toLowerCase()).join(' ');
        if (
          firstRowText.includes('sku') ||
          firstRowText.includes('código') ||
          firstRowText.includes('codigo') ||
          firstRowText.includes('item') ||
          firstRowText.includes('preço') ||
          firstRowText.includes('preco') ||
          firstRowText.includes('caixa')
        ) {
          startIndex = 1;
        }

        for (let i = startIndex; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const rawSku = String(row[0] || '').trim();
          if (!rawSku) continue;

          const rawValStr = String(row[1] || '')
            .replace('R$', '')
            .replace(/\s+/g, '')
            .replace(',', '.');

          const numVal = isPrices ? parseFloat(rawValStr) : parseInt(rawValStr.replace(/\D/g, ''), 10);
          const isValid = !isNaN(numVal) && numVal > 0;

          parsed.push({
            sku: rawSku,
            value: isValid ? numVal : 0,
            description: row[2] ? String(row[2]).trim() : undefined,
            isValid,
            error: isValid ? undefined : 'Valor inválido na linha',
          });
        }

        setFileParsedRows(parsed);
        setIsProcessing(false);
        showToast(`${parsed.length} itens detectados na planilha.`);
      } catch (err) {
        console.error(err);
        showToast('Erro ao ler a planilha Excel. Verifique o formato.');
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      showToast('Falha na leitura do arquivo.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    let data: any[][] = [];

    if (isPrices) {
      data = [
        ['CODIGO_SKU', 'PRECO_UNITARIO_RS', 'DESCRICAO_PRODUTO'],
        ['PP-48-5055-458', 42.50, 'Malbec Desodorante Colônia 100ml'],
        ['48060', 18.90, 'Lily Creme Acetinado Hidratante 250g'],
        ['48061', 24.50, 'Floratta Red Desodorante Colônia 75ml'],
        ['48062', 12.00, 'Nativa SPA Loção Ameixa 400ml'],
        ['BOT-8820', 89.90, 'Kit Presente Egeo Dolce']
      ];
    } else {
      data = [
        ['CODIGO_SKU', 'PECAS_POR_CAIXA', 'DESCRICAO_PRODUTO'],
        ['PP-48-5055-458', 24, 'Malbec Desodorante Colônia 100ml (CX c/ 24)'],
        ['48060', 12, 'Lily Creme Acetinado Hidratante 250g (CX c/ 12)'],
        ['48061', 36, 'Floratta Red Desodorante Colônia 75ml (CX c/ 36)'],
        ['48062', 48, 'Nativa SPA Loção Ameixa 400ml (CX c/ 48)'],
        ['BOT-8820', 10, 'Kit Presente Egeo Dolce (CX c/ 10)']
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 45 }];

    XLSX.utils.book_append_sheet(wb, ws, isPrices ? 'Tabela_Precos' : 'Pecas_Por_Caixa');
    const filename = isPrices ? 'modelo_importacao_precos_ceva.xlsx' : 'modelo_importacao_pecas_caixa_ceva.xlsx';
    XLSX.writeFile(wb, filename);
    showToast(`Modelo baixado: ${filename}`);
  };

  // Save to database
  const handleSave = async () => {
    if (validRows.length === 0) {
      showToast('Nenhum item válido para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      if (isPrices) {
        const pricesPayload: ProductPrice[] = validRows.map((r) => ({
          sku: r.sku,
          unitPrice: r.value,
        }));
        await onSavePrices(pricesPayload);
        showToast(`${pricesPayload.length} preços atualizados e salvos com sucesso no banco de dados!`);
      } else {
        const conversionsPayload: SkuConversion[] = validRows.map((r) => ({
          sku: r.sku,
          piecesPerBox: r.value,
        }));
        await onSaveConversions(conversionsPayload);
        showToast(`${conversionsPayload.length} fatores de conversão (peças/caixa) salvos no banco de dados!`);
      }

      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar os dados no banco.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#213145] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              {isPrices ? <DollarSign className="w-5 h-5 text-emerald-400" /> : <Boxes className="w-5 h-5 text-blue-400" />}
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                {modalTitle}
              </h2>
              <p className="text-xs text-slate-300">
                {isPrices
                  ? 'Importação de código dos itens e seus respectivos valores unitários (R$)'
                  : 'Importação de código dos itens e quantidade de peças contidas em cada caixa'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar: Tabs & Download Template */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Arquivo Excel (.xlsx / .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Colar do Excel (Ctrl+V)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Baixar Planilha Modelo</span>
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 sm:p-8 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Arraste ou clique para selecionar a planilha Excel
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Formatos aceitos: <strong>.XLSX, .XLS ou .CSV</strong>
                </p>
                <span className="inline-block px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs">
                  Selecionar Arquivo no Computador
                </span>
              </div>

              {fileName && (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Arquivo carregado: <strong>{fileName}</strong></span>
                  </div>
                  <span className="font-bold bg-blue-200/80 text-blue-950 px-2 py-0.5 rounded-md">
                    {fileParsedRows.length} linhas
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Paste Raw Text */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="font-bold uppercase text-slate-700">
                  Cole as colunas do Excel abaixo (Código e {isPrices ? 'Preço' : 'Peças/Caixa'}):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (isPrices) {
                      setRawText("PP-48-5055-458\t42.50\n48060\t18.90\n48061\t24.50\n48062\t12.00");
                    } else {
                      setRawText("PP-48-5055-458\t24\n48060\t12\n48061\t36\n48062\t48");
                    }
                  }}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Preencher Exemplo
                </button>
              </div>

              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  isPrices
                    ? "PP-48-5055-458\t42.50\n48060\t18.90\n48061\t24.50"
                    : "PP-48-5055-458\t24\n48060\t12\n48061\t36"
                }
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 outline-none focus:border-blue-600 bg-slate-50 focus:bg-white transition-colors"
              />
              <p className="text-[11px] text-slate-500">
                Dica: Selecione as colunas no seu Excel, pressione <strong>Ctrl+C</strong> e depois <strong>Ctrl+V</strong> dentro da caixa acima.
              </p>
            </div>
          )}

          {/* Live Data Preview Table */}
          {activeRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800">
                  Prévia dos Dados Detectados ({activeRows.length} itens)
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {validRows.length} válidos
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                      {invalidRows.length} com erro
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Código (SKU)</th>
                      <th className="px-3 py-2">{isPrices ? 'Preço Unitário (R$)' : 'Peças por Caixa'}</th>
                      <th className="px-3 py-2">Descrição / Obs</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                        <td className="px-3 py-1.5 font-bold font-mono text-slate-800">
                          {row.sku}
                        </td>
                        <td className="px-3 py-1.5 font-semibold text-slate-700">
                          {row.isValid ? (
                            isPrices
                              ? `R$ ${row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : `${row.value} un/cx`
                          ) : (
                            <span className="text-red-500 font-normal">{row.error}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-500 truncate max-w-[150px]">
                          {row.description || '-'}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {row.isValid ? (
                            <span className="inline-flex items-center text-emerald-600 font-bold">
                              ✓ Pronto
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-red-600 font-bold">
                              ✕ Erro
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {activeRows.length > 50 && (
                <div className="p-2 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
                  Mostrando os primeiros 50 itens de {activeRows.length} detectados.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Database className="w-4 h-4 text-slate-400" />
            <span>Os dados serão persistidos no banco de dados automaticamente.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving || isProcessing || validRows.length === 0}
              onClick={handleSave}
              className="px-5 py-2.5 bg-[#0fa958] hover:bg-[#0c8a48] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              {isSaving ? (
                <span>Salvando no Banco...</span>
              ) : (
                <>
                  <span>Importar {validRows.length} Itens</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
