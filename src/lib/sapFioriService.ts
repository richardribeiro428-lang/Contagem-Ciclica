import { CountSession, SapFioriConfig, SapFioriSyncLog } from '../types';

export const DEFAULT_SAP_FIORI_CONFIG: SapFioriConfig = {
  gatewayUrl: 'https://fiori.grupoboticario.com.br/sap/opu/odata/sap/API_PHYSICAL_INVENTORY_DOC_SRV',
  plant: 'CB01 - CD Boticário Registro/SP',
  storageLocation: 'DEP1 - Depósito Geral WMS',
  fioriAppId: 'F1804 - Contar Estoque Físico (MI04/MI07)',
  isConnected: true,
  autoSyncCompleted: true,
  lastTestedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
};

export const DEFAULT_SAP_FIORI_LOGS: SapFioriSyncLog[] = [
  {
    id: 'log-1',
    timestamp: '03/09/2026 18:40',
    sessionCode: '#CNT-2026-001',
    sapDocNumber: '300049182',
    status: 'SUCESSO',
    totalItemsCounted: 185,
    message: 'Contagem sincronizada com SAP S/4HANA Grupo Boticário com sucesso via RFC Gateway.',
  },
  {
    id: 'log-2',
    timestamp: '03/09/2026 14:15',
    sessionCode: '#CNT-2026-003',
    sapDocNumber: '300049175',
    status: 'SUCESSO',
    totalItemsCounted: 94,
    message: 'Documento de Inventário SAP Fiori F1804 integrado. Divergências apontadas para MI20.',
  },
];

/**
 * Simulates real-time synchronization with SAP Fiori / SAP Gateway Boticário
 */
export async function syncSessionWithSapFiori(
  session: CountSession,
  config: SapFioriConfig
): Promise<{ success: boolean; protocol: string; message: string }> {
  // Simulate network roundtrip to SAP Gateway
  await new Promise((resolve) => setTimeout(resolve, 800));

  const protocol = `SAP-BOTICARIO-${Math.floor(100000 + Math.random() * 900000)}`;
  const sapDoc = session.sapDocNumber || `3000${Math.floor(40000 + Math.random() * 90000)}`;

  return {
    success: true,
    protocol,
    message: `Documento SAP Fiori ${sapDoc} atualizado com sucesso no Centro ${config.plant.split(' ')[0]}! Protocolo: ${protocol}`,
  };
}

/**
 * Generates and downloads official SAP Fiori Boticário CSV format for upload in MI04 / F1804
 */
export function downloadSapFioriCSV(session: CountSession, config?: SapFioriConfig) {
  const sapDoc = session.sapDocNumber || '300049182';
  const plant = config?.plant?.split(' - ')[0] || 'CB01';
  const sloc = config?.storageLocation?.split(' - ')[0] || 'DEP1';
  const year = new Date().getFullYear();

  const headers = [
    'SAP_DOC_INVENTARIO',
    'EXERCICIO',
    'ITEM_DOC',
    'MATERIAL_SKU',
    'DESCRICAO',
    'LOTE',
    'POSICAO_WMS',
    'QTD_SISTEMICA_SAP',
    'QTD_CONTADA_FISICA',
    'DIVERGENCIA',
    'UNIDADE_MEDIDA',
    'CENTRO',
    'DEPOSITO',
    'RESPONSAVEL_CONTAGEM',
    'DATA_CONTAGEM',
    'STATUS_APURACAO'
  ].join(';');

  const rows = session.items.map((it, idx) => {
    const itemNum = (idx + 1) * 10;
    const diff = (it.countedQty || 0) - (it.expectedQty || 0);
    const unit = session.countUnit === 'caixas' ? 'CX' : 'UN';
    const statusApuracao = diff === 0 ? 'ACURADO' : diff > 0 ? 'SOBRA' : 'FALTA';

    return [
      `"${sapDoc}"`,
      year,
      itemNum,
      `"${it.sku}"`,
      `"${it.name.replace(/"/g, '""')}"`,
      `"${it.batch || 'PADRAO'}"`,
      `"${it.location}"`,
      it.expectedQty || 0,
      it.countedQty || 0,
      diff,
      `"${unit}"`,
      `"${plant}"`,
      `"${sloc}"`,
      `"${session.responsible}"`,
      `"${session.date}"`,
      `"${statusApuracao}"`
    ].join(';');
  }).join('\n');

  const content = `${headers}\n${rows}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SAP_FIORI_BOTICARIO_${sapDoc}_${session.code.replace('#', '')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
