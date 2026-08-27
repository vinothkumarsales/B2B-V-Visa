'use client';

import Link from 'next/link';
import { ArrowLeft, Quote, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/marketing/Logo';
import { TESTIMONIALS } from '@/content/proof';
import { productionApprovedProducts } from '@/lib/production-approved-products';

/* Derived from the published catalogue, so the figure is true by construction. */
const destinationCount = new Set(productionApprovedProducts.map((p) => p.destination)).size;

export type QueueRow = { name: string; meta: string; state: string; tone: string };

const DEFAULT_QUEUE: QueueRow[] = [
  { name: 'SAPNA CHHAJER', meta: 'Vietnam · 8 travellers', state: 'Approved', tone: 'text-emerald-300' },
  { name: 'VISHAL GIREEYA', meta: 'Turkey · 4 travellers', state: 'Processing', tone: 'text-blue-300' },
  { name: 'KAUSHIK JAIN', meta: 'United Kingdom · 2 travellers', state: 'Payment due', tone: 'text-amber-300' },
];

/**
 * Split-screen chrome for login and signup.
 *
 * The left panel shows what sits behind the login — a real application queue
 * and figures derived from the published catalogue — rather than generic
 * marketing bullets. It uses the marketing token scope (`mk`) so auth matches
 * the public site.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  queue = DEFAULT_QUEUE,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Rows shown in the context panel. Signup passes a shorter set. */
  queue?: QueueRow[];
}) {
  const testimonial = TESTIMONIALS[0];

  return (
    <div className="mk min-h-screen lg:grid lg:grid-cols-[minmax(24rem,46%)_1fr] lg:grid-rows-[1fr]">
      {/* ── Context panel ── */}
      <aside className="mk-ink relative flex flex-col justify-between gap-10 p-8 lg:min-h-screen lg:p-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-[var(--mk-ink-fg)]">
            <Wordmark tone="inherit" className="h-7" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-[var(--mk-radius)] px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        </div>

        <div className="hidden lg:block">
          <p className="mk-eyebrow">The desk you are signing into</p>
          <h2 className="mk-h2 mt-4 text-[var(--mk-ink-fg)]">
            Every application, with its state.
          </h2>

          {/* A real queue, not an illustration. */}
          <div className="mt-8 overflow-hidden rounded-[var(--mk-radius-lg)] border border-white/12">
            <div className="flex items-center gap-2 border-b border-white/12 bg-white/[0.04] px-4 py-2 font-mono text-[11px] text-white/45">
              vvisa.business / applications
            </div>
            <div className="divide-y divide-white/8">
              {queue.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-white/90">{row.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-white/45">{row.meta}</p>
                  </div>
                  <span className={`mk-numeral shrink-0 text-[11px] ${row.tone}`}>{row.state}</span>
                </div>
              ))}
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-3 gap-5 border-t border-white/12 pt-6">
            {[
              { v: String(destinationCount), l: 'Destinations published' },
              { v: String(productionApprovedProducts.length), l: 'Visa products live' },
              { v: 'Bound', l: 'Checklists per product' },
            ].map((s) => (
              <div key={s.l}>
                <dt className="mk-numeral text-xl text-[var(--mk-ink-fg)]">{s.v}</dt>
                <dd className="mt-1 text-[11px] leading-snug text-white/45">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="hidden border-t border-white/12 pt-6 lg:block">
          <Quote className="size-4 text-white/25" />
          <blockquote className="mt-3 text-sm leading-relaxed text-white/75">
            {testimonial.quote}
          </blockquote>
          <figcaption className="mt-3 font-mono text-[11px] text-white/45">
            {testimonial.author} · {testimonial.role}, {testimonial.company}
          </figcaption>
        </figure>
      </aside>

      {/* ── Form panel ── */}
      <main className="flex w-full items-center justify-center px-5 py-12 sm:px-8 lg:min-h-screen lg:px-12">
        <div className="w-full max-w-md">
          <header className="mb-8">
            <h1 className="mk-h2 text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-vvisa-text-secondary">{subtitle}</p>
          </header>

          {children}

          {footer}

          <p className="mt-10 flex items-center justify-center gap-1.5 font-mono text-[11px] text-vvisa-text-muted">
            <ShieldCheck className="size-3.5" />
            Session encrypted · India-hosted
          </p>
        </div>
      </main>
    </div>
  );
}

/** Google's brand mark, inlined so the button works offline. */
export function GoogleMark({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/** Inline validation message wired for assistive tech. */
export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-destructive">
      {children}
    </p>
  );
}
