import React from 'react';
import { cn } from '@/lib/utils';

export function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/70 bg-white/60 shadow-[0_28px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_34px_90px_rgba(15,23,42,0.14)]',
        className,
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-gradient-to-br from-white/80 via-sky-200/40 to-indigo-200/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-8 -bottom-10 size-48 rounded-full bg-gradient-to-tr from-white/80 via-cyan-100/40 to-violet-100/30 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
