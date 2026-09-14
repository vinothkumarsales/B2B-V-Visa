'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useAppStore } from '@/store/app.store';
import { mockTestimonials, mockFAQs } from '@/lib/mock-data';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Headphones,
  Search,
  Upload,
  Wallet,
  CheckCircle2,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Quote,
  Globe,
  Menu,
  FileCheck2,
  Receipt,
  Star,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Reveal, RevealGroup } from '@/components/ui/reveal';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#testimonials', label: 'Customers' },
  { href: '#faq', label: 'FAQ' },
] as const;

const TICKER_ITEMS = [
  'Best prices for travel agents',
  'Quick & easy applications',
  '24/7 support, anytime',
  'Estimated processing windows',
  'Document checklist binding',
  'Supplier product catalogue',
  'GST-compliant invoices',
] as const;

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Best prices for travel agents',
    body: 'Agent-only rates with bulk discounts applied automatically, and every line item shown before you pay.',
    points: ['Unbeatable agent rates', 'Automatic bulk discounts'],
  },
  {
    icon: Zap,
    title: 'Quick & easy applications',
    body: 'A passport scanner fills the form for you, and one workflow covers both individual and group filings.',
    points: ['Passport OCR reduces errors', 'Individual and group in one flow'],
  },
  {
    icon: Headphones,
    title: '24/7 support, anytime',
    body: 'A dedicated account manager who knows your file, plus round-the-clock cover for urgent cases.',
    points: ['Dedicated account manager', 'Emergency help around the clock'],
  },
] as const;

const STEPS = [
  { icon: Search, title: 'Select destination', body: 'Pick the country, visa type and travel dates.' },
  { icon: Upload, title: 'Upload documents', body: 'Scan the passport and photo — we check the list for you.' },
  { icon: Wallet, title: 'Pay from wallet', body: 'Settle from your VVisa wallet balance in one click.' },
  { icon: CheckCircle2, title: 'Track to approval', body: 'Follow every status change through to delivery.' },
] as const;

const STATS = [
  { value: 'Live', label: 'Catalogue-driven visa cards' },
  { value: 'Bound', label: 'Apply checklist sync' },
  { value: 'Clear', label: 'Pricing line items' },
  { value: 'Ready', label: 'Wallet and payment preview' },
] as const;

const AGENCIES = [
  { name: 'Veena World', city: 'Mumbai' },
  { name: 'Affinco', city: 'Delhi' },
  { name: 'Travel Best', city: 'Bangalore' },
  { name: 'The Journeys', city: 'Chennai' },
] as const;

const FOOTER_COLUMNS = [
  { heading: 'Company', links: ['About us', 'Careers', 'Partners'] },
  { heading: 'Support', links: ['Help centre', 'Contact'] },
  { heading: 'Legal', links: ['Privacy', 'Terms'] },
] as const;

export default function LandingView() {
  const navigate = useAppStore((s) => s.navigate);
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const testimonial = mockTestimonials[activeTestimonial];

  /** Gentle idle float for the hero cards; disabled under reduced motion. */
  const float = (distance: number, duration: number, delay = 0) =>
    reduceMotion
      ? {}
      : {
          animate: { y: [0, -distance, 0] },
          transition: { duration, repeat: Infinity, ease: 'easeInOut' as const, delay },
        };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ══════════════════ HEADER ══════════════════ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
          scrolled
            ? 'border-b border-vvisa-border-subtle bg-[var(--vvisa-backdrop)] backdrop-blur-xl shadow-[var(--vvisa-shadow-sm)]'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="vv-container flex h-16 items-center justify-between gap-4 px-[var(--gutter)]">
          <a href="#top" className="flex items-center gap-2.5" aria-label="VVisa home">
            <Image src="/logo.svg" alt="" width={32} height={32} priority />
            <span className="text-xl font-bold tracking-tight text-foreground">VVisa</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-vvisa-text-secondary transition-colors hover:bg-vvisa-surface-2 hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              className="hidden text-vvisa-text-secondary hover:text-foreground sm:inline-flex"
              onClick={() => navigate('login')}
            >
              Log in
            </Button>
            <Button
              variant="brand"
              className="hidden sm:inline-flex"
              onClick={() => navigate('signup')}
            >
              Get started
            </Button>

            {/* Mobile menu — the old header had no fallback below md at all */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[19rem] border-vvisa-border-subtle bg-vvisa-surface p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-16 items-center gap-2.5 border-b border-vvisa-border-subtle px-5">
                  <Image src="/logo.svg" alt="" width={26} height={26} />
                  <span className="font-bold tracking-tight text-foreground">VVisa</span>
                </div>
                <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <a
                        href={link.href}
                        className="rounded-lg px-3 py-3 text-[15px] font-medium text-vvisa-text-secondary transition-colors hover:bg-vvisa-surface-2 hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mt-auto flex flex-col gap-2.5 border-t border-vvisa-border-subtle p-4">
                  <Button
                    variant="brand"
                    size="lg"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('signup');
                    }}
                  >
                    Get started <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('login');
                    }}
                  >
                    Log in
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 pt-16">
        {/* ══════════════════ HERO ══════════════════ */}
        <section className="relative isolate overflow-hidden px-[var(--gutter)] pb-[clamp(3rem,2rem+4vw,5.5rem)] pt-[clamp(2.5rem,1.5rem+4vw,5rem)]">
          <div className="vv-aurora -z-10" aria-hidden />
          <div className="vv-grid-bg -z-10" aria-hidden />

          <div className="vv-container grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            {/* ── Copy ── */}
            <RevealGroup className="text-center lg:text-left" mode="mount" stagger={0.11}>
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-vvisa-border-subtle bg-vvisa-surface px-3.5 py-1.5 text-xs font-medium text-vvisa-text-secondary shadow-[var(--vvisa-shadow-sm)] sm:text-sm">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-vvisa-green opacity-70 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-vvisa-green" />
                  </span>
                  Built for high-volume travel agencies
                </span>
              </Reveal>

              <Reveal>
                <h1 className="vv-display mt-6 text-foreground">
                  B2B visa operations,
                  <br className="hidden sm:block" />{' '}
                  <span className="vv-text-gradient">without the noise.</span>
                </h1>
              </Reveal>

              <Reveal>
                <p className="vv-lead mx-auto mt-5 max-w-xl lg:mx-0">
                  A refined visa-commerce console for agents to compare products, manage documents,
                  track prices and keep every application moving.
                </p>
              </Reveal>

              <Reveal>
                <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                  <Button variant="brand" size="xl" onClick={() => navigate('signup')}>
                    Start an application <ArrowRight className="size-4" />
                  </Button>
                  <Button variant="outline" size="xl" onClick={() => navigate('login')}>
                    Agent login
                  </Button>
                </div>
              </Reveal>

              <Reveal>
                <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-vvisa-text-muted lg:justify-start">
                  {['No setup fee', 'GST-compliant invoices', 'Wallet-based settlement'].map((item) => (
                    <li key={item} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-vvisa-green" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </RevealGroup>

            {/* ── Product card cluster ── */}
            <Reveal direction="left" scale duration={0.7} mode="mount" className="hidden min-h-[26rem] items-center justify-center md:flex">
              {/* Inner wrapper keeps the floating cards anchored to the main card,
                  not to the full width of the column. */}
              <div className="relative w-full max-w-sm">
              <motion.div
                {...float(10, 6)}
                className="vv-card vv-ring-gradient relative z-10 w-full rounded-2xl p-5"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-vvisa-green/15">
                    <CheckCircle2 className="size-5 text-vvisa-green" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Application moving</p>
                    <p className="text-xs text-vvisa-text-muted">Selected visa workflow</p>
                  </div>
                </div>

                <dl className="space-y-2.5 text-xs">
                  {[
                    ['Applicant', 'Rajesh Mehta'],
                    ['Reference', 'E260308IND'],
                    ['Estimated', 'Mar 15, 2026'],
                  ].map(([term, value], i) => (
                    <div key={term} className="flex items-center justify-between gap-3">
                      <dt className="text-vvisa-text-muted">{term}</dt>
                      <dd
                        className={`font-medium ${i === 1 ? 'font-mono text-foreground' : i === 2 ? 'text-vvisa-green' : 'text-foreground'}`}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-vvisa-surface-2">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--vvisa-success))]"
                    initial={reduceMotion ? false : { width: '0%' }}
                    whileInView={{ width: '78%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                    style={reduceMotion ? { width: '78%' } : undefined}
                  />
                </div>
              </motion.div>

              <motion.div
                {...float(14, 7, 0.6)}
                className="vv-card absolute -left-10 -top-14 z-20 rounded-xl px-4 py-3 lg:-left-16"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-vvisa-gold/15">
                    <Receipt className="size-4 text-vvisa-gold" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight text-foreground">Wallet ready</p>
                    <p className="text-xs text-vvisa-green">Balance visible upfront</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                {...float(12, 8, 1.1)}
                className="vv-card absolute -bottom-12 -right-8 z-20 rounded-xl px-4 py-3 lg:-right-14"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/15">
                    <FileCheck2 className="size-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight text-foreground">Price breakdown</p>
                    <p className="text-xs text-vvisa-text-muted">Fees, tax and total aligned</p>
                  </div>
                </div>
              </motion.div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════ TICKER ══════════════════ */}
        <section className="ticker-bar overflow-hidden border-y border-vvisa-border-subtle bg-vvisa-surface/60 py-3" aria-hidden>
          <div className="animate-marquee flex w-max gap-10">
            {[0, 1].map((copy) =>
              TICKER_ITEMS.map((text) => (
                <span
                  key={`${copy}-${text}`}
                  className="inline-flex select-none items-center gap-2.5 whitespace-nowrap text-sm text-vvisa-text-muted"
                >
                  <Globe className="size-3.5 text-primary" />
                  {text}
                </span>
              )),
            )}
          </div>
        </section>

        {/* ══════════════════ TRUST BAR ══════════════════ */}
        <section className="px-[var(--gutter)] pb-6 pt-14">
          <RevealGroup className="vv-container text-center">
            <Reveal>
              <p className="text-sm text-vvisa-text-secondary sm:text-base">
                Trusted by agencies that need clear pricing, binding document rules and honest tracking
              </p>
            </Reveal>
            <Reveal>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {AGENCIES.map((agency) => (
                  <li
                    key={agency.name}
                    className="vv-card vv-hover-lift flex items-center gap-2.5 rounded-full px-4 py-2"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-vvisa-surface-2 text-[11px] font-bold text-vvisa-text-secondary">
                      {agency.name[0]}
                    </span>
                    <span className="text-left">
                      <span className="block text-xs font-semibold leading-tight text-foreground">{agency.name}</span>
                      <span className="block text-[10px] text-vvisa-text-muted">{agency.city}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </RevealGroup>
        </section>

        {/* ══════════════════ FEATURES ══════════════════ */}
        <section id="features" className="vv-section scroll-mt-20">
          <div className="vv-container">
            <RevealGroup className="mx-auto max-w-2xl text-center">
              <Reveal>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Why VVisa</p>
              </Reveal>
              <Reveal>
                <h2 className="vv-h2 mt-3 text-foreground">Everything the desk needs, in one console</h2>
              </Reveal>
              <Reveal>
                <p className="vv-lead mt-4">
                  Compare visas, prepare documents and move applications with far fewer manual checks.
                </p>
              </Reveal>
            </RevealGroup>

            <RevealGroup className="mt-14 grid gap-5 md:grid-cols-3" stagger={0.1}>
              {FEATURES.map((feature) => (
                <Reveal key={feature.title}>
                  <article className="vv-card vv-card-hover flex h-full flex-col p-6">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <feature.icon className="size-5" />
                    </span>
                    <h3 className="vv-h3 mt-4 text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-vvisa-text-secondary">{feature.body}</p>
                    <ul className="mt-4 space-y-1.5 border-t border-vvisa-border-subtle pt-4">
                      {feature.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-vvisa-text-muted">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-vvisa-green" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              ))}
            </RevealGroup>

            {/* Product preview — paired with supporting copy so neither column runs short */}
            <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <RevealGroup>
                <Reveal>
                  <h3 className="vv-h3 text-foreground">See every application at a glance</h3>
                </Reveal>
                <Reveal>
                  <p className="mt-3 text-sm leading-relaxed text-vvisa-text-secondary">
                    The dashboard keeps processing estimates, checklist state and payment status on the same
                    screen — so the desk stops chasing updates across inboxes and spreadsheets.
                  </p>
                </Reveal>
                <Reveal>
                  <ul className="mt-6 space-y-3">
                    {[
                      { icon: FileCheck2, text: 'Checklists bound to the selected visa product' },
                      { icon: Receipt, text: 'Fees, taxes and totals itemised before payment' },
                      { icon: ShieldCheck, text: 'Status history retained for every application' },
                    ].map((item) => (
                      <li key={item.text} className="flex items-start gap-3 text-sm text-vvisa-text-secondary">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                          <item.icon className="size-4" />
                        </span>
                        <span className="pt-1.5">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </RevealGroup>

              <Reveal direction="left" scale duration={0.7}>
                <div className="vv-card vv-ring-gradient overflow-hidden rounded-2xl p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <span className="size-3 rounded-full bg-vvisa-red/60" />
                    <span className="size-3 rounded-full bg-vvisa-warning/60" />
                    <span className="size-3 rounded-full bg-vvisa-green/60" />
                    <span className="ml-3 font-mono text-xs text-vvisa-text-muted">vvisa.app/dashboard</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-vvisa-green/25 bg-vvisa-green/10 p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-vvisa-green/20">
                      <CheckCircle2 className="size-5 text-vvisa-green" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Estimated processing visible</p>
                      <p className="mt-0.5 text-xs text-vvisa-text-secondary">Visa rules and checklist stay aligned</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3.5">
                    {[
                      { label: 'Vietnam', pct: 100, tone: 'var(--vvisa-success)' },
                      { label: 'UAE', pct: 65, tone: 'var(--primary)' },
                      { label: 'Singapore', pct: 40, tone: 'var(--vvisa-warning)' },
                    ].map((row, i) => (
                      <div key={row.label}>
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span className="text-vvisa-text-secondary">{row.label}</span>
                          <span className="vv-tabular font-medium text-foreground">{row.pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-vvisa-surface-2">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: row.tone, ...(reduceMotion ? { width: `${row.pct}%` } : null) }}
                            initial={reduceMotion ? false : { width: '0%' }}
                            whileInView={{ width: `${row.pct}%` }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 * i }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════════════ STATS ══════════════════ */}
        <section className="border-y border-vvisa-border-subtle bg-vvisa-surface/60 px-[var(--gutter)] py-16">
          <RevealGroup className="vv-container grid grid-cols-2 gap-8 lg:grid-cols-4" stagger={0.08}>
            {STATS.map((stat) => (
              <Reveal key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">{stat.value}</p>
                <p className="mt-2 text-sm text-vvisa-text-secondary">{stat.label}</p>
              </Reveal>
            ))}
          </RevealGroup>
        </section>

        {/* ══════════════════ HOW IT WORKS ══════════════════ */}
        <section id="how-it-works" className="vv-section scroll-mt-20">
          <div className="vv-container">
            <RevealGroup className="mx-auto max-w-2xl text-center">
              <Reveal>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">How it works</p>
              </Reveal>
              <Reveal>
                <h2 className="vv-h2 mt-3 text-foreground">Four steps from enquiry to approval</h2>
              </Reveal>
            </RevealGroup>

            <RevealGroup className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6" stagger={0.12}>
              {/* Connector rail sits behind the numbered markers */}
              <div
                className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-7 hidden border-t border-dashed border-vvisa-border lg:block"
                aria-hidden
              />
              {STEPS.map((step, i) => (
                <Reveal key={step.title} className="relative flex flex-col items-center text-center">
                  <span className="relative z-10 flex size-14 items-center justify-center rounded-2xl border border-vvisa-border-subtle bg-vvisa-surface text-primary shadow-[var(--vvisa-shadow-sm)]">
                    <step.icon className="size-6" />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-primary">Step {i + 1}</p>
                  <h3 className="mt-1.5 font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 max-w-[15rem] text-sm leading-relaxed text-vvisa-text-secondary">{step.body}</p>
                </Reveal>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ══════════════════ TESTIMONIALS ══════════════════ */}
        <section id="testimonials" className="vv-section scroll-mt-20 border-y border-vvisa-border-subtle bg-vvisa-surface/60">
          <div className="vv-container-narrow">
            <RevealGroup className="text-center">
              <Reveal>
                <div className="flex items-center justify-center gap-1" aria-label="Rated five out of five">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-vvisa-gold text-vvisa-gold" />
                  ))}
                </div>
              </Reveal>
              <Reveal>
                <h2 className="vv-h2 mt-4 text-foreground">Loved by agencies across India</h2>
              </Reveal>
            </RevealGroup>

            <div className="mt-10 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Customer stories">
              {mockTestimonials.map((t, i) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTestimonial === i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    activeTestimonial === i
                      ? 'bg-primary text-primary-foreground shadow-[var(--vvisa-shadow-sm)]'
                      : 'border border-vvisa-border-subtle bg-vvisa-surface text-vvisa-text-secondary hover:border-vvisa-border-active hover:text-foreground'
                  }`}
                >
                  {t.company}
                </button>
              ))}
            </div>

            <motion.figure
              key={activeTestimonial}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 text-center"
            >
              <Quote className="mx-auto size-8 text-primary/35" />
              <blockquote className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-foreground sm:text-xl lg:text-2xl">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6">
                <span className="block font-semibold text-foreground">{testimonial.author}</span>
                <span className="block text-sm text-vvisa-text-secondary">
                  {testimonial.role}, {testimonial.company}
                </span>
              </figcaption>
            </motion.figure>
          </div>
        </section>

        {/* ══════════════════ INSURANCE BANNER ══════════════════ */}
        <section className="px-[var(--gutter)] py-16">
          <Reveal scale duration={0.65} className="vv-container">
            <div className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklab,var(--primary)_60%,#111827))] p-8 sm:p-12">
              <div
                className="pointer-events-none absolute inset-0 -z-10 opacity-40"
                style={{
                  backgroundImage:
                    'radial-gradient(28rem 18rem at 88% 12%, rgba(255,255,255,0.28), transparent 70%)',
                }}
                aria-hidden
              />
              <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
                <div>
                  <h2 className="text-xl font-bold text-white sm:text-2xl">Looking for travel insurance?</h2>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/85 sm:justify-start">
                    <span>98% settlement rate</span>
                    <span aria-hidden className="text-white/40">|</span>
                    <span>1-day digital claims</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="shrink-0 border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  onClick={() => navigate('signup')}
                >
                  Sign up for free <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════ FAQ ══════════════════ */}
        <section id="faq" className="vv-section scroll-mt-20 border-t border-vvisa-border-subtle">
          <div className="vv-container-narrow">
            <RevealGroup className="text-center">
              <Reveal>
                <h2 className="vv-h2 text-foreground">Frequently asked questions</h2>
              </Reveal>
              <Reveal>
                <p className="vv-lead mt-3">Everything you need to know about running visas on VVisa.</p>
              </Reveal>
            </RevealGroup>

            <Reveal className="mt-12">
              <Accordion type="single" collapsible className="w-full">
                {mockFAQs.map((faq) => (
                  <AccordionItem key={faq.id} value={`faq-${faq.id}`} className="border-vvisa-border-subtle">
                    <AccordionTrigger className="py-5 text-left text-sm font-medium text-foreground hover:no-underline sm:text-base">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-vvisa-text-secondary">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════ CLOSING CTA ══════════════════ */}
        <section className="px-[var(--gutter)] pb-[var(--section-y)]">
          <Reveal scale className="vv-container">
            <div className="vv-card vv-ring-gradient relative isolate overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
              <div className="vv-aurora -z-10 opacity-70" aria-hidden />
              <h2 className="vv-h2 text-foreground">Ready to move your first application?</h2>
              <p className="vv-lead mx-auto mt-4 max-w-xl">
                Set up your agency in minutes. No setup fee, and every price is visible before you commit.
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Button variant="brand" size="xl" onClick={() => navigate('signup')}>
                  Create an agency account <ArrowRight className="size-4" />
                </Button>
                <Button variant="outline" size="xl" onClick={() => navigate('login')}>
                  Log in
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="border-t border-vvisa-border-subtle bg-vvisa-surface/40">
        <div className="vv-container px-[var(--gutter)] py-14 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center gap-2.5">
                <Image src="/logo.svg" alt="" width={28} height={28} />
                <span className="text-lg font-bold text-foreground">VVisa</span>
              </div>
              <p className="max-w-xs text-sm text-vvisa-text-muted">
                A B2B visa operations console built for Indian travel agencies.
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                {[
                  { Icon: Facebook, label: 'Facebook' },
                  { Icon: Instagram, label: 'Instagram' },
                  { Icon: Twitter, label: 'Twitter' },
                  { Icon: Youtube, label: 'YouTube' },
                ].map(({ Icon, label }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className="flex size-9 items-center justify-center rounded-lg border border-vvisa-border-subtle bg-vvisa-surface text-vvisa-text-muted transition-colors hover:border-vvisa-border-active hover:text-foreground"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            </div>

            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <h3 className="mb-4 text-sm font-semibold text-foreground">{column.heading}</h3>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-vvisa-text-muted transition-colors hover:text-foreground">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">Offices</h3>
              <ul className="space-y-2.5 text-sm text-vvisa-text-muted">
                <li>Mumbai, India</li>
                <li>Delhi, India</li>
                <li>New York, USA</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-vvisa-border-subtle pt-8 sm:flex-row">
            <p className="text-xs text-vvisa-text-muted">&copy; 2026 VVisa AI Platform. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="text-xs text-vvisa-text-muted transition-colors hover:text-foreground">
                Privacy policy
              </a>
              <a href="#" className="text-xs text-vvisa-text-muted transition-colors hover:text-foreground">
                Terms of service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
