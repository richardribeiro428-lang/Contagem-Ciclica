import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  X,
  Warehouse,
  Building2,
  Smartphone
} from 'lucide-react';
import { SYSTEM_IMAGES } from '../mockData';

interface SidebarProps {
  currentView: 'dashboard' | 'contagens' | 'graficos' | 'sap_fiori';
  onSelectView: (view: 'dashboard' | 'contagens' | 'graficos' | 'sap_fiori') => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  contagensCount: number;
  onOpenMobileEntry?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  contagensCount,
  onOpenMobileEntry,
}) => {
  const cevaLogo = SYSTEM_IMAGES.find((img) => img.type === 'logo')?.url || '';

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'contagens' as const,
      label: 'Contagens (Criar / Gestão)',
      icon: Boxes,
      badge: contagensCount ? String(contagensCount) : null,
    },
    {
      id: 'graficos' as const,
      label: 'Gráficos e Divergências',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'sap_fiori' as const,
      label: 'SAP Fiori Boticário',
      icon: Building2,
      badge: 'F1804',
    },
  ];

  const handleNavClick = (id: 'dashboard' | 'contagens' | 'graficos' | 'sap_fiori') => {
    onSelectView(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-[#213145] text-slate-200 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Header Brand */}
          <div className="h-16 px-4 flex items-center justify-between bg-[#1b2838] border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <img
                src={cevaLogo}
                alt="CEVA Logistics Logo"
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white tracking-tight leading-none">
                  CEVA Inventário
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-semibold">
                  Administração (PC)
                </span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Red corporate accent line */}
          <div className="h-1 w-full bg-[#b80014]"></div>

          {/* Navigation Links */}
          <div className="px-3 pt-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2">
              Menu Principal
            </span>
          </div>

          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  type="button"
                  className={`relative flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-left text-xs sm:text-sm font-medium cursor-pointer ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActiveNav"
                      className="absolute inset-0 bg-[#1976d2] rounded-xl shadow-md -z-0"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3 flex flex-col gap-2 border-t border-slate-700/50">
          {/* Button to open Mobile Handheld View */}
          {onOpenMobileEntry && (
            <button
              type="button"
              onClick={() => {
                onOpenMobileEntry();
                onCloseMobile();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Abrir Entrada Celular</span>
            </button>
          )}

          {/* Cloud Database Connected Status */}
          <div className="bg-white/5 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium">Banco de Dados</span>
              <span className="text-xs font-semibold text-white">Firestore Conectado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
