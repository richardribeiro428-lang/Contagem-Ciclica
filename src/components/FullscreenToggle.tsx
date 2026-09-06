import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Smartphone } from 'lucide-react';

interface FullscreenToggleProps {
  className?: string;
  showText?: boolean;
  onOpenAppGuide?: () => void;
}

export const FullscreenToggle: React.FC<FullscreenToggleProps> = ({
  className = '',
  showText = false,
  onOpenAppGuide,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkState = () => {
      setIsFullscreen(!!document.fullscreenElement);
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };

    checkState();

    document.addEventListener('fullscreenchange', checkState);
    return () => {
      document.removeEventListener('fullscreenchange', checkState);
    };
  }, []);

  const toggle = async () => {
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
    } catch {
      // If fullscreen fails (e.g. iOS Safari which doesn't support requestFullscreen on document), open the app installation guide!
      if (onOpenAppGuide) {
        onOpenAppGuide();
      }
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        title={isFullscreen ? 'Sair da Tela Cheia' : 'Ativar Modo Tela Cheia (Ocultar Barra HTTPS)'}
        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
            {showText && <span>Sair Tela Cheia</span>}
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5 text-blue-300" />
            {showText && <span>Modo Tela Cheia</span>}
          </>
        )}
      </button>

      {/* Button to open installation guide if not standalone */}
      {!isStandalone && onOpenAppGuide && (
        <button
          type="button"
          onClick={onOpenAppGuide}
          title="Como usar sem barra de link no celular"
          className="px-2.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 border border-blue-400/30 text-blue-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Instalar App</span>
        </button>
      )}
    </div>
  );
};
