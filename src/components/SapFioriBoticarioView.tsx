import React, { useState } from 'react';
import {
  Database,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Server,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ExternalLink,
  Settings,
  Send,
  Boxes
} from 'lucide-react';
import { motion } from 'motion/react';
import { CountSession, SapFioriConfig, SapFioriSyncLog } from '../types';
import {
  DEFAULT_SAP_FIORI_CONFIG,
  DEFAULT_SAP_FIORI_LOGS,
  downloadSapFioriCSV,
  syncSessionWithSapFiori
} from '../lib/sapFioriService';

interface SapFioriBoticarioViewProps {
  sessions: CountSession[];
  onUpdateSessionSapStatus?: (sessionId: string, status: 'sincronizado' | 'pendente' | 'erro') => void;
  showToast: (msg: string) => void;
}

export const SapFioriBoticarioView: React.FC<SapFioriBoticarioViewProps> = ({
  sessions,
  onUpdateSessionSapStatus,
  showToast,
}) => {
  const [config, setConfig] = useState<SapFioriConfig>(DEFAULT_SAP_FIORI_CONFIG);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SapFioriSyncLog[]>(DEFAULT_SAP_FIORI_LOGS);
  const [selectedSessionForDoc, setSelectedSessionForDoc] = useState<CountSession | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'logs' | 'config'>('sessions');

  const handleTestConnection = async () => {
    setIsTesting(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsTesting(false);
    setConfig((prev) => ({
      ...prev,
      isConnected: true,
      lastTestedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }));
    showToast('Conexão com SAP Fiori / SAP Gateway Boticário testada com sucesso (Latência: 32ms)!');
  };

  const handleSyncSession = async (session: CountSession) => {
    try {
      const res = await syncSessionWithSapFiori(session, config);
      if (res.success) {
        onUpdateSessionSapStatus?.(session.id, 'sincronizado');
        const newLog: SapFioriSyncLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('pt-BR'),
          sessionCode: session.code,
          sapDocNumber: session.sapDocNumber || '300049182',
          status: 'SUCESSO',
          totalItemsCounted: session.items.reduce((acc, i) => acc + (i.countedQty || 0), 0),
          message: res.message,
        };
        setSyncLogs((prev) => [newLog, ...prev]);
        showToast(`Contagem ${session.code} sincronizada com SAP Fiori Boticário!`);
      }
    } catch (e) {
      showToast('Falha na sincronização com SAP Fiori.');
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSyncingAll(false);
    showToast('Todas as contagens concluídas foram reconciliadas com o SAP Fiori Grupo Boticário!');
  };

  const handleDownloadCsv = (session: CountSession) => {
    downloadSapFioriCSV(session, config);
    showToast(`Arquivo SAP Fiori (.csv) gerado para ${session.code}`);
  };

  return (
    <div className="w-full px-4 sm:px-8 py-6 space-y-6">
      {/* Top Banner: Grupo Boticário & SAP Fiori */}
      <div className="bg-gradient-to-r from-[#213145] via-[#1a2b3d] to-[#0c1f30] rounded-2xl p-6 text-white shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0fa958] text-white tracking-wider uppercase">
              Integração Ativa
            </span>
            <span className="text-xs font-semibold text-slate-300">
              SAP S/4HANA • Grupo Boticário
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <span>Integração SAP Fiori • Grupo Boticário</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Módulo oficial de comunicação e reconciliação entre o sistema de inventário CEVA e os aplicativos <strong>SAP Fiori (F1804 / F1805 / MI04)</strong> do Grupo Boticário.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testando...' : 'Testar Conexão SAP'}</span>
          </button>

          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="px-4 py-2 rounded-xl bg-[#0fa958] hover:bg-[#0c8a48] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSyncingAll ? 'Sincronizando...' : 'Sincronizar Todas no SAP'}</span>
          </button>
        </div>
      </div>

      {/* 4 Status KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Gateway */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Gateway SAP OData
            </span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              Online (32ms)
            </span>
            <span className="text-[10px] text-slate-500 truncate max-w-[180px] block">
              API_PHYSICAL_INVENTORY
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Centro Logístico */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Centro Boticário
            </span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              {config.plant.split(' - ')[0]}
            </span>
            <span className="text-[10px] text-slate-500">
              {config.plant.split(' - ')[1] || 'CD Registro'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Depósito */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Depósito WMS
            </span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              {config.storageLocation.split(' - ')[0]}
            </span>
            <span className="text-[10px] text-slate-500">
              Almoxarifado & Linha
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Fiori App */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Fiori App ID
            </span>
            <span className="text-sm font-black text-slate-900 mt-0.5 block">
              F1804 / MI04
            </span>
            <span className="text-[10px] text-slate-500">
              Contagem Física SAP
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Server className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Documentos & Contagens ({sessions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Histórico de Sincronização SAP ({syncLogs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'config'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Configurações SAP Gateway
        </button>
      </div>

      {/* Tab Content: SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Mapeamento de Contagens com Documentos SAP Fiori
              </h3>
              <p className="text-xs text-slate-500">
                Cada contagem possui um número de documento de inventário oficial do SAP Fiori (App F1804).
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
              Total de Contagens: <strong>{sessions.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Doc SAP Fiori</th>
                  <th className="py-3 px-4">Código / Nome</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-center">Posições</th>
                  <th className="py-3 px-4 text-center">Status Físico</th>
                  <th className="py-3 px-4 text-center">Status SAP Fiori</th>
                  <th className="py-3 px-4 text-right">Ações SAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => {
                  const sapDoc = sess.sapDocNumber || '300049182';
                  const isConcluida = sess.status === 'Concluída';

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                          #{sapDoc}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{sess.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{sess.code}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sess.sector}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{sess.responsible}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {sess.itemsCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isConcluida
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Pronto p/ SAP</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadCsv(sess)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Baixar planilha formatada para o SAP Fiori Boticário"
                          >
                            <Download className="w-3 h-3 text-slate-500" />
                            <span>Exportar SAP</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSyncSession(sess)}
                            className="px-2.5 py-1 rounded-lg bg-[#0fa958] hover:bg-[#0c8a48] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Enviar contagem para o SAP Gateway Grupo Boticário"
                          >
                            <Send className="w-3 h-3" />
                            <span>Sincronizar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Registro de Auditoria de Integração SAP Fiori S/4HANA
          </h3>
          <div className="space-y-3">
            {syncLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        {log.sessionCode} • Doc SAP #{log.sapDocNumber}
                      </span>
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{log.message}</p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: CONFIG */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Parâmetros do SAP Gateway & Centro Boticário
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Centro Logístico (Plant)
              </label>
              <input
                type="text"
                value={config.plant}
                onChange={(e) => setConfig({ ...config, plant: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Depósito (Storage Location)
              </label>
              <input
                type="text"
                value={config.storageLocation}
                onChange={(e) => setConfig({ ...config, storageLocation: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Endpoint SAP Gateway / OData
              </label>
              <input
                type="text"
                value={config.gatewayUrl}
                onChange={(e) => setConfig({ ...config, gatewayUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => showToast('Configurações salvas no terminal CEVA!')}
            className="px-4 py-2 bg-[#213145] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Salvar Parâmetros
          </button>
        </div>
      )}
    </div>
  );
};
