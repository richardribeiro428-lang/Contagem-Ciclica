import React from 'react';
import { Monitor, Smartphone, Boxes, LayoutDashboard, ArrowRight, ShieldCheck, CheckCircle2, Barcode } from 'lucide-react';
import { SYSTEM_IMAGES, mobileAppIconUrl } from '../mockData';

interface TelaInicialProps {
  onSelectAdmin: () => void;
  onSelectColetor: () => void;
  activeCountsCount: number;
}

export const TelaInicial: React.FC<TelaInicialProps> = ({
  onSelectAdmin,
  onSelectColetor,
  activeCountsCount,
}) => {
  const cevaLogo = SYSTEM_IMAGES.find((img) => img.type === 'logo')?.url || '';

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0b1c30] flex flex-col justify-between antialiased">
      {/* Red corporate accent top line */}
      <div className="h-1.5 w-full bg-[#b80014]"></div>

      {/* Main Container */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={cevaLogo}
              alt="CEVA Logistics"
              className="h-10 sm:h-12 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white shadow-xs border border-slate-200 text-slate-700 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-700 font-bold">WMS Conectado</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">Auditoria & Contagem Física</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0b1c30] tracking-tight">
            Portal de Inventário CEVA Logistics
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mt-2">
            Selecione o modo de acesso para iniciar as operações de inventário e contagem física
          </p>
        </div>

        {/* 2 Main Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
          {/* Card 1: Administração (PC) */}
          <div
            onClick={onSelectAdmin}
            className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 hover:shadow-xl hover:border-red-400 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-[#213145] group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                  <Monitor className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
                  Painel de Gestão PC
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b1c30] group-hover:text-red-600 transition-colors">
                Administração (PC)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Ambiente de supervisão onde <strong>criamos novas contagens</strong>, importamos planilhas do Excel, definimos peças por caixa, analisamos gráficos de divergência e gerenciamos a integração com o <strong>SAP Fiori Grupo Boticário</strong>.
              </p>

              {/* Feature Points */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-red-600 shrink-0" />
                  <span><strong>Criar Contagens:</strong> Colar dados do Excel (Posição, SKU, Quantidade)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>SAP Fiori Boticário:</strong> Reconciliação e layout oficial F1804 / MI04</span>
                </div>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>Gráficos:</strong> Ranking de operadores e divergências financeiras (R$)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectAdmin();
              }}
              className="mt-6 w-full py-3 bg-[#213145] group-hover:bg-red-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Acessar Painel de Administração</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Entrada de Contagem (Celular / Coletor) */}
          <div
            onClick={onSelectColetor}
            className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 hover:shadow-xl hover:border-blue-500 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={mobileAppIconUrl}
                    alt="Ícone Desenho App Móvel"
                    className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-200 group-hover:scale-105 transition-transform"
                  />
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Smartphone className="w-5 h-5" />
                  </div>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                  Celular / Coletor
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b1c30] group-hover:text-blue-600 transition-colors">
                  Entrada de Contagem
                </h2>
                {activeCountsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {activeCountsCount} ativa(s)
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Acesso exclusivo para <strong>execução no celular</strong>. Solicita o seu nome para carregar apenas as suas contagens ou permite ver todas as contagens pendentes do depósito.
              </p>

              {/* Feature Points */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Identificação Rápida:</strong> Insira seu nome ou selecione com 1 toque</span>
                </div>
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>Opção Ver Todas:</strong> Visualize todas as contagens abertas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
                  <span><strong>Layout Celular:</strong> Teclado numérico tátil e conversor caixas/peças</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectColetor();
              }}
              className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Acessar Entrada no Celular</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">CEVA Logistics Brasil</span>
          <span>•</span>
          <span>WMS 5G Enterprise</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 sm:mt-0">
          Terminal Ativo: WMS-SP-01 • Versão 2.4.0
        </div>
      </footer>
    </div>
  );
};
