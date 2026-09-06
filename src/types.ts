export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  category: string;
  expectedQty: number;
  countedQty: number;
  unit: string;
  location: string;
  batch: string;
  imageUrl?: string;
  status: 'ok' | 'divergent' | 'pending';
  discrepancyReason?: string;
  boxesCounted?: number; // When session is in 'caixas' mode
}

export interface CountSession {
  id: string;
  code: string;
  name: string;
  responsible: string;
  date: string;
  status: 'Concluída' | 'Divergência' | 'Em Andamento' | 'Pendente';
  sector: string;
  itemsCount: number;
  items: InventoryItem[];
  type: string; // 'Cíclica' | 'Rotativa' | 'Geral' | 'Auditoria' | 'Amostragem' or any custom type added by user
  countUnit?: 'pecas' | 'caixas'; // Defaults to 'pecas'
  createdAt: string;
  lastPositionIndex?: number; // Remembers where operator paused to easily resume!
  // Integração SAP Fiori Grupo Boticário
  sapDocNumber?: string; // Ex: Doc MI01 '300049182'
  sapSyncStatus?: 'sincronizado' | 'pendente' | 'erro';
  sapPlant?: string; // Centro Boticário (ex: 'CB01', 'BR10', 'CD01')
  sapStorageLocation?: string; // Depósito (ex: 'DEP1', 'AL01')
  sapLastSyncAt?: string;
}

export interface SapFioriConfig {
  gatewayUrl: string;
  plant: string; // Centro Boticário
  storageLocation: string; // Depósito
  fioriAppId: string; // F1804 / F1805 / MI04
  isConnected: boolean;
  autoSyncCompleted: boolean;
  lastTestedAt?: string;
}

export interface SapFioriSyncLog {
  id: string;
  timestamp: string;
  sessionCode: string;
  sapDocNumber: string;
  status: 'SUCESSO' | 'PENDENTE' | 'ERRO';
  totalItemsCounted: number;
  message: string;
}

export interface InventoryType {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface ProductPrice {
  sku: string;
  unitPrice: number;
  updatedAt?: string;
}

export interface SkuConversion {
  sku: string;
  piecesPerBox: number;
  updatedAt?: string;
}

export interface SystemImageResource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'logo' | 'layout_ref' | 'product';
  tag: string;
  width?: number;
  height?: number;
}

export interface InventoryRecord {
  id: string;
  timestamp: string;
  operator: string;
  inventoryType: string;
  deposit: string;
  street: string;
  column: string;
  level: string;
  position: string;
  sku: string;
  lot: string;
  quantity: number;
  boxCount?: number;
}
