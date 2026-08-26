import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Layers,
  Receipt,
  ScanLine,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section, SectionHeader, Eyebrow } from '@/components/marketing/Section';
import { productionApprovedProducts } from '@/lib/production-approved-products';

export const metadata: Metadata = {
  title: 'B2B visa operations for travel agencies',
  description:
    'A visa operations console for Indian travel agencies: a published product catalogue, bound document checklists, wallet settlement and status tracking on one screen.',
};

/* Derived from the published catalogue at build time, so the only numbers on
   the page are true by construction and update themselves. */
const destinations = [...new Set(productionApprovedProducts.map((p) => p.destination))];

/** Catalogue values are stored as full sentences; the card already has a label. */
function stripLabel(value: string) {
  return value.replace(/^\s*(estimated\s+)?processing\s+time:\s*/i, '').trim();
}

const CAPABILITIES = [
  {
    icon: Layers,
    title: 'A published catalogue',
    body: 'Visa products are versioned and published, not retyped. Every card carries validity, entry type and processing window from the same record the application uses.',
  },
  {
    icon: FileCheck2,
    title: 'Checklists bound to the product',
    body: 'Document requirements travel with the visa product. Change the rule once and every application in flight reflects it.',
  },
  {
    icon: ScanLine,
    title: 'Passport intake by scan',
    body: 'OCR reads the bio page and fills the form, so the desk corrects rather than transcribes.',
  },
  {
    icon: Receipt,
    title: 'Itemised before payment',
    body: 'Fees, taxes and totals are broken out line by line before anything is charged. No reconciliation after the fact.',
  },
  {
    icon: Wallet,
    title: 'Wallet settlement',
    body: 'Load once, settle per application. Balance is visible on every screen that can spend it.',
  },
  {
    icon: CheckCircle2,
    title: 'Status you can answer from',
    body: 'Every transition is retained, so "where is it?" has an answer that does not require an email thread.',
  },
];

const STEPS = [
  { n: '01', title: 'Select the product', body: 'Pick destination and visa type from the published catalogue.' },
  { n: '02', title: 'Scan and attach', body: 'Passport OCR fills the form; the checklist shows what is still missing.' },
  { n: '03', title: 'Settle from wallet', body: 'Review the itemised total and pay from the agency balance.' },
  { n: '04', title: 'Track to approval', body: 'Follow each status change through to delivery.' },
];

export default function HomePage() {
  return (
    <>
      {/* ─────────────── Hero ─────────────── */}
      <section className="mk-ruled mk-rule-b relative px-[var(--mk-gutter)] pb-16 pt-16 sm:pt-20">
        <div className="mk-container">
          <div className="grid items-start gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Eyebrow>For Indian travel agencies</Eyebrow>
              <h1 className="mk-display mt-5 text-foreground">
                The visa desk,
                <br />
                on one screen.
              </h1>
              <p className="mk-lead mk-prose mt-6">
                VVisa replaces the spreadsheet, the shared inbox and the price list with a single
                console: a published product catalogue, checklists bound to each visa, wallet
                settlement and a status history you can answer questions from.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    Create an agency account <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/visas">Browse destinations</Link>
                </Button>
              </div>

              <dl className="mk-rule-t mt-12 grid max-w-lg grid-cols-3 gap-6 pt-6">
                {[
                  { v: String(destinations.length), l: 'Destinations published' },
                  { v: '0%', l: 'Fee on bank transfer' },
                  { v: 'GST', l: 'Compliant invoicing' },
                ].map((s) => (
                  <div key={s.l}>
                    <dt className="mk-numeral text-2xl text-foreground">{s.v}</dt>
                    <dd className="mt-1 text-xs leading-snug text-vvisa-text-muted">{s.l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Product bezel — flat, no tilt, no glow. */}
            <div className="mk-frame">
              <div className="mk-frame-chrome">
                <span className="size-2 rounded-full bg-[var(--mk-rule-strong)]" />
                vvisa.business / applications
              </div>
              <div className="divide-y divide-[var(--mk-rule)]">
                {[
                  { name: 'SAPNA CHHAJER', meta: 'Vietnam · eVisa 30 days · 8 travellers', state: 'Approved', tone: 'text-emerald-700 dark:text-emerald-300' },
                  { name: 'VISHAL GIREEYA', meta: 'Turkey · e-Visa · 4 travellers', state: 'Processing', tone: 'text-blue-700 dark:text-blue-300' },
                  { name: 'KAUSHIK JAIN', meta: 'United Kingdom · Standard Visitor · 2 travellers', state: 'Payment due', tone: 'text-amber-700 dark:text-amber-300' },
                  { name: 'MEERA RAGHAVAN', meta: 'Portugal · Schengen short stay · 3 travellers', state: 'Documents due', tone: 'text-vvisa-text-secondary' },
                  { name: 'ARJUN NAIR', meta: 'South Korea · Short-term visit · 1 traveller', state: 'Submitted', tone: 'text-blue-700 dark:text-blue-300' },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">{row.name}</p>
                      <p className="mt-0.5 truncate text-xs text-vvisa-text-muted">{row.meta}</p>
                    </div>
                    <span className={`mk-numeral shrink-0 text-[11px] ${row.tone}`}>{row.state}</span>
                  </div>
                ))}
              </div>
              <div className="mk-rule-t flex items-center justify-between px-4 py-3">
                <span className="font-mono text-[11px] text-vvisa-text-muted">Wallet balance</span>
                <span className="mk-numeral text-[13px] font-semibold text-foreground">₹28,040</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Capabilities ─────────────── */}
      <Section id="capabilities">
        <SectionHeader
          eyebrow="What it does"
          title="Built around how a visa desk actually works"
          lead="Not a feature list — the six things that decide whether a filing goes out today or tomorrow."
        />
        <div className="mk-cells mt-12 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="p-7">
              <c.icon className="size-5 text-primary" />
              <h3 className="mk-h3 mt-4 text-foreground">{c.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-vvisa-text-secondary">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─────────────── Workflow ─────────────── */}
      <Section tone="panel">
        <SectionHeader
          eyebrow="How it works"
          title="Four steps, start to approval"
          action={
            <Button asChild variant="outline">
              <Link href="/docs">Read the documentation</Link>
            </Button>
          }
        />
        <ol className="mt-12 grid gap-px bg-[var(--mk-rule)] sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="mk-panel p-7">
              <span className="mk-numeral text-xs text-primary">{s.n}</span>
              <h3 className="mk-h3 mt-3 text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-vvisa-text-secondary">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ─────────────── Destinations ─────────────── */}
      <Section>
        <SectionHeader
          eyebrow="Catalogue"
          title="Destinations published today"
          lead="Every product below is live in the catalogue with its own document checklist, pricing lines and processing window."
          action={
            <Button asChild variant="outline">
              <Link href="/visas">All destinations</Link>
            </Button>
          }
        />
        <div className="mk-cells mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {productionApprovedProducts.map((p) => (
            <Link
              key={p.id}
              href={`/visas/${p.destination.toLowerCase().replace(/\s+/g, '-')}`}
              className="group/card p-6 transition-colors hover:bg-[var(--mk-panel)]"
            >
              <p className="mk-eyebrow">{p.destination}</p>
              <h3 className="mt-3 text-sm font-semibold leading-snug text-foreground">{p.name}</h3>
              <dl className="mt-4 space-y-2.5 text-xs">
                {p.processingTime && (
                  <div>
                    <dt className="text-vvisa-text-muted">Processing</dt>
                    <dd className="mk-numeral mt-0.5 text-foreground">{stripLabel(p.processingTime)}</dd>
                  </div>
                )}
                {p.validity && (
                  <div>
                    <dt className="text-vvisa-text-muted">Validity</dt>
                    <dd className="mk-numeral mt-0.5 text-foreground">{p.validity}</dd>
                  </div>
                )}
              </dl>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-primary">
                View requirements
                <ArrowRight className="size-3 transition-transform group-hover/card:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ─────────────── Closing CTA ─────────────── */}
      <Section tone="ink" ruleBottom={false}>
        <div className="mk-accent-rule mb-10 w-16" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="mk-h2 text-[var(--mk-ink-fg)]">Move your first application this week.</h2>
            <p className="mk-lead mt-4">
              Set up the agency, load the wallet, and file against a published product. No setup fee.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-neutral-950 hover:bg-white/90">
              <Link href="/register">Get started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/contact">Talk to the team</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
