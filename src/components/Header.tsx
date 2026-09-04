import React from 'react';
import { CloudCheck, RefreshCw, Menu, Database, Smartphone, Building2 } from 'lucide-react';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onForceSync: () => void;
  isSyncing: boolean;
  lastSyncTime: string;
  onOpenMobileEntry?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onForceSync,
  isSyncing,
  lastSyncTime,
  onOpenMobileEntry,
}) => {
  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 flex items-center justify-between px-4 sm:px-8 border-b border-slate-200/80">
      {/* Left side: Mobile menu toggle + System Title + Sync status */}
      <div className="flex items-center gap-3 sm:gap-5">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-extrabold text-[#0b1c30] tracking-tight leading-tight">
              CEVA Inventário • Painel PC
            </span>
            <span className="text-[10px] text-slate-500 font-medium leading-tight hidden sm:inline">
              Gestão, Criação de Contagens & Reconciliação
            </span>
          </div>
        </div>

        {/* Sync Status with quick manual trigger */}
        <button
          type="button"
          onClick={onForceSync}
          disabled={isSyncing}
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 text-xs font-medium cursor-pointer"
          title="Clique para sincronizar instantaneamente com o banco de dados em nuvem"
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          ) : (
            <Database className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>
            {isSyncing ? 'Sincronizando...' : lastSyncTime}
          </span>
        </button>
      </div>

      {/* Right side: SAP Fiori Badge + Entrada Celular Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* SAP Fiori Grupo Boticário Badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 text-purple-900 text-[11px] font-bold">
          <Building2 className="w-3.5 h-3.5 text-purple-700" />
          <span>SAP Fiori Boticário</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        {/* Button to open Mobile Entry */}
        {onOpenMobileEntry && (
          <button
            type="button"
            onClick={onOpenMobileEntry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Abrir a tela dedicada para coletor e celular"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden xs:inline">Entrada Celular</span>
          </button>
        )}

        <button
          type="button"
          onClick={onForceSync}
          disabled={isSyncing}
          className="md:hidden flex items-center gap-1 p-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs"
          title="Sincronizar"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/80">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
            WMS Online
          </span>
        </div>
      </div>
    </header>
  );
};
