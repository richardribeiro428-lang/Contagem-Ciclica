import React from 'react';
import { Menu, Smartphone, RotateCw } from 'lucide-react';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onForceSync?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
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
      {/* Left side: Mobile menu toggle + System Title */}
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
      </div>

      {/* Right side: Sync & Entrada Celular Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onForceSync && (
          <button
            type="button"
            onClick={onForceSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Sincronizar com celulares em tempo real"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span className="hidden md:inline">
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </span>
          </button>
        )}

        {onOpenMobileEntry && (
          <button
            type="button"
            onClick={onOpenMobileEntry}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Abrir a tela de contagem para coletor e celular"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Entrada Celular</span>
          </button>
        )}
      </div>
    </header>
  );
};
