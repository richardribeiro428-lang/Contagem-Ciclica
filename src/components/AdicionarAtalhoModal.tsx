import React, { useState, useEffect } from 'react';
import { Smartphone, PlusSquare, Share, MoreVertical, X, CheckCircle2, ArrowRight } from 'lucide-react';

interface AdicionarAtalhoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const AdicionarAtalhoModal: React.FC<AdicionarAtalhoModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isApple);
    if (isApple) {
      setActiveTab('ios');
    }

    // Capture install prompt if available (Chrome Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handlePromptClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setAdded(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.warn('Erro ao abrir prompt de atalho:', err);
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
              <PlusSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Adicionar Atalho no Celular</h2>
              <p className="text-[11px] text-slate-300">Acesse o sistema direto da tela inicial</p>
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
          {/* Card: Instant Prompt Button if browser supports it */}
          {deferredPrompt && !added && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
              <div>
                <span className="font-extrabold text-blue-900 block text-xs">Criar atalho com 1 toque:</span>
                <span className="text-[11px] text-blue-700">O navegador suporta adição automática</span>
              </div>
              <button
                type="button"
                onClick={handlePromptClick}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <PlusSquare className="w-3.5 h-3.5" />
                <span>Criar Atalho</span>
              </button>
            </div>
          )}

          {added && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Atalho adicionado com sucesso à tela inicial!</span>
            </div>
          )}

          {/* App preview card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <img
              src="/apple-touch-icon.png"
              alt="Ícone CEVA"
              className="w-12 h-12 rounded-xl shadow-xs border border-slate-300 shrink-0 object-cover"
              onError={(e) => {
                // Fallback to app-icon
                (e.target as HTMLImageElement).src = '/app-icon.png';
              }}
            />
            <div className="min-w-0">
              <div className="font-extrabold text-slate-900 text-xs">CEVA Inventário</div>
              <div className="text-[11px] text-slate-500">Coletor & Contagem em Tela Cheia</div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                ✓ Abre sempre em tela cheia sem barra de link
              </div>
            </div>
          </div>

          {/* Device Tabs */}
          <div className="space-y-2">
            <div className="flex rounded-lg bg-slate-200/80 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 text-center font-bold text-[11px] rounded-md transition-all cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Android / Coletor (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 text-center font-bold text-[11px] rounded-md transition-all cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                iPhone / iPad (Safari)
              </button>
            </div>

            {/* Android Instructions */}
            {activeTab === 'android' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-[11px] text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    1
                  </span>
                  <div>
                    No Chrome do celular, toque no menu de <strong>3 pontos verticais (⋮)</strong> no canto superior direito.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    2
                  </span>
                  <div>
                    Toque na opção <strong>"Adicionar à tela inicial"</strong> ou <strong>"Criar atalho"</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    3
                  </span>
                  <div>
                    Confirme em <strong>Adicionar</strong>. O ícone da CEVA aparecerá no celular e abrirá <strong>sempre em tela cheia</strong>!
                  </div>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-[11px] text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    1
                  </span>
                  <div>
                    No Safari do iPhone/iPad, toque no botão <strong>Compartilhar ⎋</strong> na barra inferior.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    2
                  </span>
                  <div>
                    Role para cima e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    3
                  </span>
                  <div>
                    Toque em <strong>Adicionar</strong> no canto superior. Pronto!
                  </div>
                </div>
              </div>
            )}
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
