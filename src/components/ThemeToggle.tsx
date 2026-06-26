'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-vvisa-border bg-vvisa-surface text-vvisa-text-secondary shadow-[var(--vvisa-shadow-sm)] transition-all duration-200 ease-out hover:bg-vvisa-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {mounted && (
        <>
          <Sun
            className={`size-[16px] absolute transition-all duration-300 ${
              isDark ? 'opacity-100 rotate-0 scale-100 text-[var(--vvisa-premium)]' : 'opacity-0 rotate-90 scale-0'
            }`}
          />
          <Moon
            className={`size-[16px] absolute transition-all duration-300 ${
              isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
            }`}
          />
        </>
      )}
      {!mounted && <span className="sr-only">Toggle theme</span>}
    </button>
  );
}
