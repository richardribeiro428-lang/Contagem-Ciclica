import React, { useEffect } from 'react';

/**
 * Enforces permanent full-screen mode on mobile devices and collectors.
 * Automatically requests fullscreen on first touch/interaction and re-engages
 * if exited, without presenting any manual toggle button to the user.
 */
export const AlwaysFullscreenEnforcer: React.FC = () => {
  useEffect(() => {
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches);

    // Function to request fullscreen across all browser engines
    const enforceFullscreen = () => {
      const doc = document as unknown as {
        fullscreenElement?: Element | null;
        webkitFullscreenElement?: Element | null;
        mozFullScreenElement?: Element | null;
        msFullscreenElement?: Element | null;
      };

      // If already in fullscreen or standalone PWA, nothing to do
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (isFs) return;

      const el = document.documentElement as unknown as {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };

      const reqMethod =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;

      if (reqMethod) {
        try {
          const promise = reqMethod.call(el);
          if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {
              // Browser requires user gesture; will re-attempt on next tap
            });
          }
        } catch {
          // ignore
        }
      }

      // Hide URL bar by scrolling 1px down
      try {
        window.scrollTo(0, 1);
      } catch {
        // ignore
      }
    };

    // Attempt immediately
    enforceFullscreen();

    // Event handlers for user interactions
    const handleInteraction = () => {
      enforceFullscreen();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        enforceFullscreen();
      }
    };

    const handleOrientationChange = () => {
      setTimeout(enforceFullscreen, 300);
    };

    // Listen on user touches, clicks and pointers
    window.addEventListener('touchstart', handleInteraction, { capture: true, passive: true });
    window.addEventListener('pointerdown', handleInteraction, { capture: true, passive: true });
    window.addEventListener('click', handleInteraction, { capture: true });
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Also listen to fullscreen change so if it exits, next touch enters again
    document.addEventListener('fullscreenchange', handleInteraction);
    document.addEventListener('webkitfullscreenchange', handleInteraction);

    return () => {
      window.removeEventListener('touchstart', handleInteraction, { capture: true });
      window.removeEventListener('pointerdown', handleInteraction, { capture: true });
      window.removeEventListener('click', handleInteraction, { capture: true });
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('fullscreenchange', handleInteraction);
      document.removeEventListener('webkitfullscreenchange', handleInteraction);
    };
  }, []);

  return null;
};
