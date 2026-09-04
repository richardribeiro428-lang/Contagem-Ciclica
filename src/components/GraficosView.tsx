import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Filter,
  FileSpreadsheet,
  Upload,
  Check,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { CountSession, ProductPrice, SkuConversion } from '../types';
import { ImportExcelParametrosModal } from './ImportExcelParametrosModal';

interface GraficosViewProps {
  sessions: CountSession[];
  productPrices: Record<string, number>;
  skuConversions: Record<string, number>;
  availableTypes: string[];
  onSaveProductPrices: (prices: ProductPrice[]) => Promise<void>;
  onSaveSkuConversions: (conversions: SkuConversion[]) => Promise<void>;
}

export const GraficosView: React.FC<GraficosViewProps> = ({
  sessions,
  productPrices,
  skuConversions,
  availableTypes,
  onSaveProductPrices,
  onSaveSkuConversions,
}) => {
  // Filters
  const [daysFilter, setDaysFilter] = useState<'1' | '7' | '15' | '30' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal for Excel Import: Prices or Box Conversions
  const [activeImportModal, setActiveImportModal] = useState<'prices' | 'conversions' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter sessions based on days and type
  const filteredSessions = useMemo(() => {
    const now = new Date().getTime();

    return sessions.filter((s) => {
      // Type filter
      if (typeFilter !== 'all' && s.type !== typeFilter) {
        return false;
      }

      // Days filter
      if (daysFilter !== 'all') {
        const days = parseInt(daysFilter, 10);
        const sessionDate = new Date(s.createdAt || s.date).getTime();
        const diffDays = (now - sessionDate) / (1000 * 60 * 60 * 24);
        if (diffDays > days) return false;
      }

      return true;
    });
  }, [sessions, daysFilter, typeFilter]);

  // Operator Leaderboard: Quem Contou Mais
  const operatorStats = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        sessionsCount: number;
        itemsCounted: number;
        totalUnitsCounted: number;
        okItems: number;
        divergentItems: number;
      }
    > = {};

    filteredSessions.forEach((sess) => {
      const resp = sess.responsible || 'Sem Atribuição';
      if (!map[resp]) {
        map[resp] = {
          name: resp,
          sessionsCount: 0,
          itemsCounted: 0,
          totalUnitsCounted: 0,
          okItems: 0,
          divergentItems: 0,
        };
      }
      map[resp].sessionsCount += 1;

      sess.items.forEach((it) => {
        if (it.countedQty > 0 || it.boxesCounted !== undefined) {
          map[resp].itemsCounted += 1;
          map[resp].totalUnitsCounted += it.countedQty;
          if (it.status === 'ok') {
            map[resp].okItems += 1;
          } else if (it.status === 'divergent') {
            map[resp].divergentItems += 1;
          }
        }
      });
    });

    const list = Object.values(map);
    // Sort by total units counted descending
    list.sort((a, b) => b.totalUnitsCounted - a.totalUnitsCounted);
    return list;
  }, [filteredSessions]);

  // Financial Divergence: Sobras (+R$) e Faltas (-R$)
  const financialMetrics = useMemo(() => {
    let totalSobraValor = 0;
    let totalFaltaValor = 0;
    let totalSobraQtd = 0;
    let totalFaltaQtd = 0;
    let totalValorEsperado = 0;
    let totalValorContado = 0;

    // Divergence grouped by inventory type for the chart
    const byType: Record<string, { type: string; sobraValor: number; faltaValor: number }> = {};

    filteredSessions.forEach((sess) => {
      const t = sess.type || 'Outro';
      if (!byType[t]) {
        byType[t] = { type: t, sobraValor: 0, faltaValor: 0 };
      }

      sess.items.forEach((it) => {
        const skuKey = it.sku.toLowerCase();
        const price = productPrices[skuKey] !== undefined ? productPrices[skuKey] : 25.0; // fallback standard price if not imported

        const expected = it.expectedQty || 0;
        const counted = it.countedQty || 0;

        totalValorEsperado += expected * price;
        totalValorContado += counted * price;

        const diff = counted - expected;
        if (diff > 0) {
          const sobra = diff * price;
          totalSobraValor += sobra;
          totalSobraQtd += diff;
          byType[t].sobraValor += sobra;
        } else if (diff < 0) {
          const falta = Math.abs(diff) * price;
          totalFaltaValor += falta;
          totalFaltaQtd += Math.abs(diff);
          byType[t].faltaValor += falta;
        }
      });
    });

    const netImpact = totalSobraValor - totalFaltaValor;
    const grossDivergence = totalSobraValor + totalFaltaValor;

    return {
      totalSobraValor,
      totalFaltaValor,
      totalSobraQtd,
      totalFaltaQtd,
      netImpact,
      grossDivergence,
      totalValorEsperado,
      totalValorContado,
      byTypeChart: Object.values(byType),
    };
  }, [filteredSessions, productPrices]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0b1c30] text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header and Import Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <span>Gráficos e Indicadores de Divergência</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Desempenho dos operadores e análise financeira de sobras e faltas no estoque.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveImportModal('prices')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Importar Valores (Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveImportModal('conversions')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Package className="w-4 h-4 text-amber-600" />
            <span>Importar Peças/Caixa (Excel)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Days & Types */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Days Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Período:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {[
                { id: '1', label: 'Hoje' },
                { id: '7', label: '7 Dias' },
                { id: '15', label: '15 Dias' },
                { id: '30', label: '30 Dias' },
                { id: 'all', label: 'Todos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDaysFilter(tab.id as any)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    daysFilter === tab.id
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 ml-0 sm:ml-4">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Tipo de Contagem:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 outline-none focus:border-blue-600"
            >
              <option value="all">Todos os Tipos ({availableTypes.length})</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Exibindo <strong>{filteredSessions.length}</strong> contagens selecionadas
        </div>
      </div>

      {/* Top Metric Cards: Sobras, Faltas e Impacto Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sobras (R$) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sobras (Físico &gt; Sistêmico)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600">
              R$ {financialMetrics.totalSobraValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              +{financialMetrics.totalSobraQtd.toLocaleString('pt-BR')} unidades excedentes
            </div>
          </div>
        </div>

        {/* Faltas (R$) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Faltas (Físico &lt; Sistêmico)
            </span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-red-600">
              R$ {financialMetrics.totalFaltaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              -{financialMetrics.totalFaltaQtd.toLocaleString('pt-BR')} unidades faltantes
            </div>
          </div>
        </div>

        {/* Impacto Líquido (R$) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Divergência Bruta Total
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              R$ {financialMetrics.grossDivergence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Impacto Líquido: {financialMetrics.netImpact >= 0 ? '+' : ''}R${' '}
              {financialMetrics.netImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Preços Cadastrados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Base de Preços & Conversão
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {Object.keys(productPrices).length} SKUs
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {Object.keys(skuConversions).length} regras de caixas cadastradas
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Quem Contou Mais (Ranking de Operadores) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>Quem Contou Mais (Ranking de Operadores)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Total de peças contadas por responsável no período selecionado.
              </p>
            </div>
          </div>

          {operatorStats.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              Nenhuma contagem registrada para os filtros selecionados.
            </div>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={operatorStats.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold' }} width={90} />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString()} peças contadas`, 'Total']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                    <Bar dataKey="totalUnitsCounted" fill="#1976d2" radius={[0, 6, 6, 0]}>
                      {operatorStats.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? '#0fa958' : index === 1 ? '#1976d2' : '#64748b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table of Operator Detail */}
              <div className="mt-4 pt-3 border-t border-slate-100 divide-y divide-slate-100 text-xs">
                {operatorStats.slice(0, 4).map((op, idx) => (
                  <div key={op.name} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                        idx === 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{op.name}</span>
                      <span className="text-slate-400">({op.sessionsCount} contagens)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">
                        {op.totalUnitsCounted.toLocaleString('pt-BR')} UN
                      </span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                        {op.okItems} OK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Chart 2: Sobras vs Faltas por Tipo de Inventário (R$) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Sobras e Faltas por Tipo de Contagem (R$)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparativo financeiro entre excesso (sobra) e déficit (falta).
              </p>
            </div>
          </div>

          {financialMetrics.byTypeChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              Nenhuma divergência apurada no período.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialMetrics.byTypeChart} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      name === 'sobraValor' ? 'Sobra (+R$)' : 'Falta (-R$)',
                    ]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Legend
                    formatter={(value) => (value === 'sobraValor' ? 'Sobra (+R$)' : 'Falta (-R$)')}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                  <Bar dataKey="sobraValor" fill="#0fa958" radius={[4, 4, 0, 0]} name="sobraValor" />
                  <Bar dataKey="faltaValor" fill="#ef4444" radius={[4, 4, 0, 0]} name="faltaValor" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Valores calculados com base no catálogo de preços unitários.</span>
            <button
              onClick={() => setActiveImportModal('prices')}
              className="text-blue-600 font-bold hover:underline"
            >
              Atualizar preços
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Excel Import (Preços ou Peças por Caixa) */}
      <ImportExcelParametrosModal
        isOpen={Boolean(activeImportModal)}
        type={activeImportModal || 'prices'}
        onClose={() => setActiveImportModal(null)}
        onSavePrices={onSaveProductPrices}
        onSaveConversions={onSaveSkuConversions}
        showToast={showToast}
      />
    </div>
  );
};
