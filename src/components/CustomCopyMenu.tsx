import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, ShieldAlert } from 'lucide-react';

interface MenuState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  label?: string;
}

export const CustomCopyMenu: React.FC = () => {
  const [menu, setMenu] = useState<MenuState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    label: '',
  });
  const [copied, setCopied] = useState(false);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Helper to extract relevant copyable text from an element
  const getCopyableText = (target: HTMLElement | null): { text: string; label: string } | null => {
    if (!target) return null;

    // Check data attributes first
    const dataCopy = target.closest('[data-copyable]') as HTMLElement | null;
    if (dataCopy) {
      const text = dataCopy.getAttribute('data-copyable') || dataCopy.innerText || '';
      const label = dataCopy.getAttribute('data-copy-label') || 'Código / Texto';
      if (text.trim()) return { text: text.trim(), label };
    }

    // Check user selection
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      return { text: selection.toString().trim(), label: 'Texto selecionado' };
    }

    // Check if target is inside an input or textarea
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const selectedPart = target.value.substring(target.selectionStart || 0, target.selectionEnd || 0);
      if (selectedPart.trim()) {
        return { text: selectedPart.trim(), label: 'Campo' };
      }
      if (target.value.trim()) {
        return { text: target.value.trim(), label: 'Campo' };
      }
    }

    // Check nearest text content if it looks like a SKU, code, number or short value
    const textTarget = target.closest('td, th, p, span, div, h1, h2, h3, h4, li') as HTMLElement | null;
    if (textTarget) {
      const rawText = textTarget.innerText || textTarget.textContent || '';
      const trimmed = rawText.trim();
      // If it's a reasonably sized value
      if (trimmed && trimmed.length < 150) {
        return { text: trimmed, label: 'Valor' };
      }
    }

    return null;
  };

  const handleCopyAction = async () => {
    if (!menu.text) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(menu.text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = menu.text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      // Haptic vibration feedback for mobile / collectors
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore
        }
      }

      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setMenu((prev) => ({ ...prev, visible: false }));
      }, 700);
    } catch (err) {
      console.error('Falha ao copiar:', err);
      setMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  useEffect(() => {
    // 1. Intercept contextmenu (right click and Android long-press)
    const handleContextMenu = (e: MouseEvent) => {
      // Always prevent default to block Google Search, Share, etc.
      e.preventDefault();

      const target = e.target as HTMLElement | null;
      const found = getCopyableText(target);

      if (found && found.text) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const menuWidth = 160;
        const menuHeight = 50;

        let posX = e.clientX - menuWidth / 2;
        let posY = e.clientY - menuHeight - 12;

        if (posX < 10) posX = 10;
        if (posX + menuWidth > viewportWidth - 10) posX = viewportWidth - menuWidth - 10;
        if (posY < 10) posY = e.clientY + 15;

        setMenu({
          visible: true,
          x: posX,
          y: posY,
          text: found.text,
          label: found.label,
        });
        setCopied(false);
      } else {
        setMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    // 2. Intercept Touch Long-Press on Mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      const target = e.target as HTMLElement | null;

      touchTimerRef.current = setTimeout(() => {
        const found = getCopyableText(target);
        if (found && found.text) {
          const viewportWidth = window.innerWidth;
          const menuWidth = 160;
          const menuHeight = 50;

          let posX = touch.clientX - menuWidth / 2;
          let posY = touch.clientY - menuHeight - 16;

          if (posX < 10) posX = 10;
          if (posX + menuWidth > viewportWidth - 10) posX = viewportWidth - menuWidth - 10;
          if (posY < 10) posY = touch.clientY + 20;

          // Provide subtle haptic feedback when menu triggers
          if ('vibrate' in navigator) {
            try {
              navigator.vibrate(25);
            } catch {
              // ignore
            }
          }

          setMenu({
            visible: true,
            x: posX,
            y: posY,
            text: found.text,
            label: found.label,
          });
          setCopied(false);
        }
      }, 420); // 420ms long-press threshold
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartPosRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const moveDist = Math.hypot(
        touch.clientX - touchStartPosRef.current.x,
        touch.clientY - touchStartPosRef.current.y
      );
      // If user is scrolling, cancel the long-press timer
      if (moveDist > 10) {
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current);
          touchTimerRef.current = null;
        }
      }
    };

    const handleTouchEnd = () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    };

    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      // Dismiss menu if clicking outside
      const target = e.target as HTMLElement | null;
      if (!target?.closest('#ceva-custom-copy-menu')) {
        setMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('click', handleGlobalClick);
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  if (!menu.visible) return null;

  return (
    <div
      id="ceva-custom-copy-menu"
      style={{
        position: 'fixed',
        left: `${menu.x}px`,
        top: `${menu.y}px`,
        zIndex: 99999,
      }}
      className="animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
    >
      <div className="bg-[#101928] text-white px-2 py-1.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-1.5 backdrop-blur-md">
        <button
          type="button"
          onClick={handleCopyAction}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-xs'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>

        {/* Corporate notice pill */}
        <div className="hidden sm:flex items-center gap-1 pl-1 pr-2 text-[10px] text-slate-400 border-l border-slate-700/80">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span>Modo Seguro CEVA</span>
        </div>
      </div>
    </div>
  );
};
