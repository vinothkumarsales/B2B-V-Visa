'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Share2, PlusSquare, X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY_DISMISSED = 'vvisa_pwa_dismissed_until';
const STORAGE_KEY_INSTALLED = 'vvisa_pwa_installed';
const DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleIos = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
    return Boolean(isAppleIos && isSafari);
  });

  useEffect(() => {
    // 1. Register Service Worker conservatively
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {
          // Non-fatal service worker registration
        });
    }

    // 2. Check if already running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // 3. Do not show on desktop screens
    if (window.innerWidth > 768) {
      return;
    }

    // 4. Check if previously installed or dismissed within cooldown
    const isInstalled = localStorage.getItem(STORAGE_KEY_INSTALLED) === 'true';
    if (isInstalled) {
      return;
    }

    const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // 5. If iOS Safari, show prompt after delay
    if (isIos) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 4000);
      return () => clearTimeout(timer);
    }

    // 6. Listen for beforeinstallprompt on Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Delay prompt slightly for natural initial interaction
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500);

      return () => clearTimeout(timer);
    };

    const handleAppInstalled = () => {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setShowPrompt(false);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
      } else {
        localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now() + DISMISSAL_COOLDOWN_MS));
      }
    } catch {
      // Ignored
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now() + DISMISSAL_COOLDOWN_MS));
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-4 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
      <Card className="border border-vvisa-border bg-vvisa-surface shadow-lg shadow-black/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <CardContent className="p-4 relative">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close install prompt"
            className="absolute top-3 right-3 p-1 rounded-full text-vvisa-text-muted hover:text-foreground hover:bg-vvisa-surface-2 transition-colors"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <div className="size-11 shrink-0 rounded-xl overflow-hidden border border-vvisa-border bg-white shadow-xs flex items-center justify-center p-1">
              <img src="/logo-vvisa-mark.png" alt="V-Visa" className="size-full object-contain" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground leading-tight">
                Add V-Visa to your Home Screen
              </h4>
              <p className="text-xs text-vvisa-text-muted mt-1 leading-normal">
                {isIos
                  ? "Tap Share, then choose 'Add to Home Screen' for instant 1-tap portal access."
                  : 'Get faster access to your B2B portal like an app with offline resilience.'}
              </p>
            </div>
          </div>

          {isIos ? (
            <div className="mt-3.5 pt-3 border-t border-vvisa-border-subtle flex items-center justify-between gap-2 text-xs text-vvisa-text-secondary">
              <div className="flex items-center gap-1.5 font-medium text-primary">
                <Share2 className="size-4" />
                <span>Share</span>
                <span className="text-vvisa-text-muted">→</span>
                <PlusSquare className="size-4" />
                <span>Add to Home Screen</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-7 px-2.5 text-xs text-vvisa-text-muted hover:text-foreground"
              >
                Got it
              </Button>
            </div>
          ) : (
            <div className="mt-3.5 pt-3 border-t border-vvisa-border-subtle flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 px-3 text-xs text-vvisa-text-secondary hover:text-foreground"
              >
                Not now
              </Button>
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="h-8 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Download className="size-3.5" />
                <span>Add to Home Screen</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
