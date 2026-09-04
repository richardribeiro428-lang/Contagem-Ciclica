import React, { useState, useMemo } from 'react';
import {
  X,
  Play,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Package,
  Layers,
  UserCheck
} from 'lucide-react';
import { CountSession, InventoryItem } from '../types';

interface NovaContagemModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableItems: InventoryItem[];
  availableInventoryTypes?: string[];
  onAddNewInventoryType?: (typeName: string) => void;
  onCreateSession: (session: CountSession) => void;
}

interface ParsedRow {
  posicao: string;
  sku: string;
  quantidade?: number;
  originalLine: string;
  isValid: boolean;
}

export const NovaContagemModal: React.FC<NovaContagemModalProps> = ({
  isOpen,
  onClose,
  availableItems,
  availableInventoryTypes = ['Cíclica', 'Rotativa', 'Geral', 'Auditoria', 'Amostragem'],
  onAddNewInventoryType,
  onCreateSession,
}) => {
  const [name, setName] = useState('');
  const [responsible, setResponsible] = useState('');
  const [type, setType] = useState(availableInventoryTypes[0] || 'Cíclica');
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [countUnit, setCountUnit] = useState<'pecas' | 'caixas'>('pecas');
  const [excelRawText, setExcelRawText] = useState('');

  // Sample data to help the user test Excel pasting immediately
  const sampleExcelData = `PP-48-5055-458\t48060\t5890
PP-48-5055-459\t48061\t1200
PP-48-5055-460\t48062\t340`;

  // Parser for pasted Excel data
  const parsedRows: ParsedRow[] = useMemo(() => {
    if (!excelRawText.trim()) return [];

    const lines = excelRawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: ParsedRow[] = [];

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (
        index === 0 &&
        (lower.includes('posi') || lower.includes('local')) &&
        lower.includes('sku')
      ) {
        return; // skip header row
      }

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else if (line.includes('|')) {
        parts = line.split('|');
      } else {
        parts = line.split(/\s+/);
      }

      parts = parts.map((p) => p.trim()).filter(Boolean);

      if (parts.length >= 2) {
        const posicao = parts[0];
        const sku = parts[1];
        let quantidade: number | undefined = undefined;

        if (parts.length >= 3) {
          const parsedQty = parseFloat(parts[2].replace(',', '.'));
          if (!isNaN(parsedQty)) {
            quantidade = Math.max(0, Math.round(parsedQty));
          }
        }

        rows.push({
          posicao,
          sku,
          quantidade,
          originalLine: line,
          isValid: Boolean(posicao && sku),
        });
      } else if (parts.length === 1 && parts[0]) {
        rows.push({
          posicao: parts[0],
          sku: '',
          quantidade: undefined,
          originalLine: line,
          isValid: false,
        });
      }
    });

    return rows;
  }, [excelRawText]);

  const validRows = parsedRows.filter((r) => r.isValid);

  if (!isOpen) return null;

  const handleApplySample = () => {
    setExcelRawText(sampleExcelData);
    if (!name.trim()) {
      setName('Contagem Rápida - Corredor A & B');
    }
    if (!responsible.trim()) {
      setResponsible('Operador 01');
    }
  };

  const handleClear = () => {
    setExcelRawText('');
  };

  const handleSaveCustomType = () => {
    const clean = newTypeName.trim();
    if (!clean) return;
    if (onAddNewInventoryType) {
      onAddNewInventoryType(clean);
    }
    setType(clean);
    setNewTypeName('');
    setIsAddingNewType(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, digite o nome da contagem.');
      return;
    }

    if (!responsible.trim()) {
      alert('Por favor, informe o nome do responsável.');
      return;
    }

    if (validRows.length === 0) {
      alert('Adicione ao menos uma linha contendo POSIÇÃO e SKU.');
      return;
    }

    // Convert parsed rows into items
    const generatedItems: InventoryItem[] = validRows.map((row, index) => {
      const existing = availableItems.find(
        (it) =>
          it.sku.toLowerCase() === row.sku.toLowerCase() ||
          it.location.toLowerCase() === row.posicao.toLowerCase()
      );

      return {
        id: `gen-${Date.now()}-${index}`,
        sku: row.sku.toUpperCase(),
        name: existing ? existing.name : `Item SKU ${row.sku.toUpperCase()}`,
        barcode: existing ? existing.barcode : `${row.sku.replace(/[^0-9]/g, '') || Date.now()}`,
        category: existing ? existing.category : 'Estoque Geral',
        expectedQty: row.quantidade !== undefined ? row.quantidade : 0,
        countedQty: 0,
        unit: existing ? existing.unit : 'UN',
        location: row.posicao.toUpperCase(),
        batch: existing ? existing.batch : `LOTE-${new Date().getFullYear()}-01`,
        imageUrl: existing?.imageUrl,
        status: 'pending',
      };
    });

    const newSession: CountSession = {
      id: `cnt-${Date.now()}`,
      code: `#CNT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      responsible: responsible.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
      status: 'Em Andamento',
      sector: validRows[0] ? `Posição ${validRows[0].posicao} (+${validRows.length - 1})` : 'Setor Geral',
      itemsCount: generatedItems.length,
      items: generatedItems,
      type,
      countUnit,
      createdAt: new Date().toISOString(),
      lastPositionIndex: 0
    };

    onCreateSession(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#1976d2] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/20 text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">Criar Nova Contagem</h3>
              <p className="text-xs text-blue-100">
                Cole dados do Excel (Posição, SKU, Quantidade) para startar a contagem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Nome da Contagem */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nome da Contagem *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Contagem Doca 12 - Corredor A"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-xs"
            />
          </div>

          {/* Responsável e Tipo de Inventário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Responsável (Vinculação) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Responsável pela Contagem *</span>
              </label>
              <input
                type="text"
                required
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nome do operador (ex: Mariana)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Esta contagem ficará vinculada a esse nome quando ele acessar o sistema.
              </p>
            </div>

            {/* Tipo de Inventário com opção de adicionar novo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tipo de Inventário
                </label>
                {!isAddingNewType && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewType(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar tipo</span>
                  </button>
                )}
              </div>

              {!isAddingNewType ? (
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white font-medium text-slate-800"
                >
                  {availableInventoryTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Nome do novo tipo..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomType}
                    className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewType(false)}
                    className="px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Unidade da Contagem: Peças ou Caixas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Unidade de Contagem (Peças ou Caixas)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  countUnit === 'pecas'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="countUnit"
                  value="pecas"
                  checked={countUnit === 'pecas'}
                  onChange={() => setCountUnit('pecas')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Contagem em Peças (UN)</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    A quantidade contada é mantida diretamente normal em unidades.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  countUnit === 'caixas'
                    ? 'border-amber-500 bg-amber-50/50 text-amber-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="countUnit"
                  value="caixas"
                  checked={countUnit === 'caixas'}
                  onChange={() => setCountUnit('caixas')}
                  className="w-4 h-4 text-amber-600"
                />
                <div>
                  <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>Contagem em Caixas (CX)</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Converte caixas contadas em peças com base no cadastro de peças/caixa.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Área para colar Excel: POSIÇÃO, SKU, QUANTIDADE */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Colar Dados do Excel (Posição, SKU, Quantidade opcional) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplySample}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Exemplo de Teste
                </button>
                {excelRawText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
            </div>

            <textarea
              required
              rows={5}
              value={excelRawText}
              onChange={(e) => setExcelRawText(e.target.value)}
              placeholder="Copie as colunas do seu Excel e cole aqui:&#10;PP-48-5055-458   48060   5890&#10;PP-48-5055-459   48061   1200"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all bg-slate-50/50"
            />
          </div>

          {/* Preview das Linhas Reconhecidas */}
          {parsedRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Prévia: {validRows.length} {validRows.length === 1 ? 'posição' : 'posições'} válida(s)
                </span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                  ✓ Pronto para inventariar
                </span>
              </div>

              <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 text-xs font-mono">
                {parsedRows.slice(0, 5).map((row, i) => (
                  <div key={i} className="py-1.5 flex items-center justify-between">
                    <span className="font-bold text-slate-800">{row.posicao}</span>
                    <span className="text-slate-600">SKU: {row.sku}</span>
                    <span className="text-slate-500">
                      {row.quantidade !== undefined ? `${row.quantidade} UN` : '(Sem Qtd)'}
                    </span>
                  </div>
                ))}
                {parsedRows.length > 5 && (
                  <div className="py-1 text-center text-slate-400 text-[11px]">
                    ...e mais {parsedRows.length - 5} linha(s)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botões do Modal */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0fa958] hover:bg-[#0c8a48] active:bg-[#0a753d] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Startar Contagem</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
