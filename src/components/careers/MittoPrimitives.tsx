import type { ReactNode } from 'react';
import type { MittoFeatureStatus } from './mitto-career-data';

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mitto-glass ${className}`}>{children}</div>;
}

const statusClass: Record<MittoFeatureStatus, string> = {
  Available: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200',
  'Demo mode': 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200',
  'Behind feature flag': 'border-amber-300/20 bg-amber-300/10 text-amber-200',
  'Coming next': 'border-violet-300/20 bg-violet-300/10 text-violet-200',
};

export function StatusBadge({ status }: { status: MittoFeatureStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] ${statusClass[status]}`}>{status}</span>;
}

export function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <div className="max-w-3xl"><p className="mitto-eyebrow">{eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white sm:text-5xl">{title}</h2>{copy && <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">{copy}</p>}</div>;
}
