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
      className={`relative flex items-center justify-center h-9 px-3 rounded-full transition-colors cursor-pointer ${
        isDark
          ? 'bg-vvisa-surface-2 border border-vvisa-border hover:bg-vvisa-border'
          : 'bg-[#1E3A6A] border border-[#2A4F8E] hover:bg-[#2A4F8E]'
      }`}
      aria-label={`Switch to ${isDark ? 'bright' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'bright' : 'dark'} mode`}
    >
      {mounted && (
        <>
          <Sun
            className={`size-[16px] absolute transition-all duration-300 ${
              isDark ? 'opacity-100 rotate-0 scale-100 text-white' : 'opacity-0 rotate-90 scale-0'
            }`}
          />
          <Moon
            className={`size-[16px] absolute transition-all duration-300 ${
              isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100 text-white'
            }`}
          />
        </>
      )}
      {!mounted && <span className="sr-only">Toggle theme</span>}
    </button>
  );
}