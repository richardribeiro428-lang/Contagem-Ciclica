import React, { useState, useEffect } from 'react';
import { Smartphone, Maximize2, Minimize2, CheckCircle2, Share, PlusSquare, MoreVertical, X, Download, ShieldCheck } from 'lucide-react';

interface MobileAppModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const MobileAppModeModal: React.FC<MobileAppModeModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    // Check iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isAppleDevice);
    if (isAppleDevice) {
      setActiveTab('ios');
    }

    // Check Fullscreen
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
      setDeferredPrompt(null);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (document.documentElement as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen not allowed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#14202e] text-white px-5 py-4 flex items-center justify-between border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Modo Aplicativo (Sem Barra HTTPS)</h2>
              <p className="text-[11px] text-slate-300">Como usar em tela cheia no celular e coletor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Status banner */}
          {isStandalone ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>O sistema já está em Modo Aplicativo instalado! Nenhuma barra de link é exibida.</span>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Ocultar o link https e abas do navegador</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Para o sistema parecer 100% um <strong>aplicativo nativo</strong> (sem a barra de endereços do site e sem pesquisa no topo), siga uma das duas opções abaixo:
              </p>
            </div>
          )}

          {/* Action 1: Instant Fullscreen */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-slate-800 block">Opção 1: Ativar Tela Cheia Agora</span>
                <span className="text-[11px] text-slate-500">Recolhe a barra do navegador imediatamente</span>
              </div>
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isFullscreen
                    ? 'bg-slate-800 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Sair da Tela Cheia</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Tela Cheia</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action 2: Install as App / Add to Home Screen */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800">Opção 2: Instalar na Tela Inicial</span>
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Instalar App</span>
                </button>
              )}
            </div>

            {/* Device tabs */}
            <div className="flex rounded-lg bg-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 text-center font-bold text-[11px] rounded-md transition-all cursor-pointer ${
                  activeTab === 'android' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Android / Coletor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 text-center font-bold text-[11px] rounded-md transition-all cursor-pointer ${
                  activeTab === 'ios' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                iPhone / iPad (iOS)
              </button>
            </div>

            {/* Android instructions */}
            {activeTab === 'android' && (
              <div className="space-y-2 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <span>
                    No Chrome/navegador do celular, toque nos <strong>3 pontinhos verticais (⋮)</strong> no canto superior direito.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <span>
                    Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <span>
                    Abra o app pelo ícone criado. <strong>A barra do site https desaparece completamente</strong>, funcionando como um app de fábrica!
                  </span>
                </div>
              </div>
            )}

            {/* iOS instructions */}
            {activeTab === 'ios' && (
              <div className="space-y-2 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <span>
                    No Safari, toque no botão <strong>Compartilhar ⎋</strong> (quadrado com seta para cima no rodapé).
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <span>
                    Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <span>
                    Toque em <strong>Adicionar</strong>. Ao abrir pelo ícone na tela inicial, <strong>o link https e as abas não aparecem</strong>!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Note about corporate copy security */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2 text-[11px] text-amber-900">
            <span className="text-base">📋</span>
            <span>
              <strong>Proteção de Segurança:</strong> O menu com pesquisa no Google foi desativado. Ao clicar e segurar, você tem acesso apenas à opção <strong>Copiar</strong>.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
