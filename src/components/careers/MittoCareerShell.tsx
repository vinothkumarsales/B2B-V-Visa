import Link from 'next/link';
import { ArrowUpRight, Menu, Orbit } from 'lucide-react';
import type { ReactNode } from 'react';

const nav = [
  ['Overview', '/careers'],
  ['How it works', '/careers#journey'],
  ['Packages', '/careers#packages'],
  ['Demo', '/careers/demo'],
  ['Dashboard', '/careers/dashboard'],
];

export function MittoCareerShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <main className="mitto-career min-h-screen overflow-hidden text-white">
      <div className="mitto-aurora" aria-hidden="true" />
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#070912]/76 backdrop-blur-2xl">
        <div className="mx-auto flex h-18 max-w-[1480px] items-center justify-between px-5 lg:px-8">
          <Link href="/careers" className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span className="flex size-9 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,.15)]"><Orbit className="size-5" /></span>
            <span><span className="block text-[10px] font-semibold uppercase tracking-[.28em] text-cyan-200/70">V-VISAS</span><span className="text-base font-semibold tracking-tight">Mitto Career</span></span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Mitto Career navigation">
            {nav.map(([label, href]) => <Link key={label} href={href} className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-slate-300 hover:text-white sm:block">Sign in</Link>
            <Link href="/careers/onboarding" className="mitto-button inline-flex items-center gap-2">Start <ArrowUpRight className="size-4" /></Link>
            <button className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 lg:hidden" aria-label="Open navigation"><Menu className="size-4" /></button>
          </div>
        </div>
      </header>
      <div className={compact ? 'relative z-10' : 'relative z-10 pb-20'}>{children}</div>
      {!compact && <footer className="relative z-10 border-t border-white/8 px-5 py-8 text-sm text-slate-500"><div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-3 sm:flex-row"><p>© 2026 Mitto Career by V-VISAS.</p><p>Managed workflow · Human reviewed · Approval first</p></div></footer>}
    </main>
  );
}
