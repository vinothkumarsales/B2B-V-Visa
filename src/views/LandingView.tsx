'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useAppStore } from '@/store/app.store';
import { mockTestimonials, mockFAQs } from '@/lib/mock-data';
import {
  ArrowRight,
  Play,
  Shield,
  Zap,
  Headphones,
  Search,
  Upload,
  Wallet,
  CheckCircle,
  ChevronDown,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Quote,
  Globe,
  TrendingUp,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

/* ─── animation helpers ─── */
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5, ease: 'easeOut' },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.12 } },
  viewport: { once: true, margin: '-50px' },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6, ease: 'easeOut' },
};

export default function LandingView() {
  const navigate = useAppStore((s) => s.navigate);
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const testimonial = mockTestimonials[activeTestimonial];

  return (
    <div className="min-h-screen flex flex-col bg-vvisa-bg">
      {/* ────────────────────── 1. HEADER ────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-vvisa-bg/80 backdrop-blur-xl border-b border-vvisa-border'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="VVisa" width={32} height={32} />
            <span className="text-foreground font-bold text-xl tracking-tight">VVisa</span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-vvisa-text-secondary hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-vvisa-text-secondary hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm text-vvisa-text-secondary hover:text-white transition-colors">
              Pricing
            </a>
          </nav>

          {/* CTA */}
          <Button
            variant="outline"
            className="border-vvisa-border bg-transparent hover:bg-vvisa-surface text-vvisa-text-secondary hover:text-foreground text-sm h-9 px-5"
            onClick={() => navigate('login')}
          >
            Log In
          </Button>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* ────────────────────── 2. HERO ────────────────────── */}
        <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-32">
          {/* Subtle radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(79,70,229,0.08),transparent)]" />

          <div className="relative mx-auto max-w-7xl flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left – copy */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 rounded-full border border-vvisa-border bg-vvisa-surface px-4 py-1.5 mb-6"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs sm:text-sm text-vvisa-text-secondary">
                  Trusted by 5,000+ Travel Agents
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-[2.75rem] sm:text-5xl lg:text-[3.75rem] font-extrabold leading-[1.1] tracking-[-0.04em] text-white"
              >
                Visas Done Right,
                <br />
                Every Time.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="mt-5 text-base sm:text-lg text-vvisa-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                India&rsquo;s most trusted B2B visa platform for travel agencies.
                Guaranteed processing. Zero errors.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
              >
                <Button
                  size="lg"
                  className="bg-[#4F46E5] hover:bg-[#4338CA] text-white h-12 px-7 text-base rounded-lg glow-indigo"
                >
                  Get Started Free <ArrowRight className="ml-1 size-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="text-vvisa-text-secondary hover:text-white h-12 px-6 text-base gap-2"
                >
                  <Play className="size-4 fill-[#9CA3AF]" />
                  Watch Demo
                </Button>
              </motion.div>
            </div>

            {/* Right – floating cards */}
            <div className="relative flex-1 hidden md:flex justify-center items-center min-h-[420px]">
              {/* Main card */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
                transition={{ duration: 0.7, delay: 0.4, y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } }}
                className="relative z-10 w-72 bg-vvisa-surface border border-vvisa-border rounded-2xl p-5 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="size-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-sm">Visa Approved</p>
                    <p className="text-vvisa-text-secondary text-xs">Vietnam e-Visa</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-vvisa-text-secondary">
                  <div className="flex justify-between">
                    <span>Applicant</span>
                    <span className="text-white">Rajesh Mehta</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ref. No.</span>
                    <span className="text-foreground font-mono">E260308IND</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ETA</span>
                    <span className="text-emerald-400">Mar 15, 2026</span>
                  </div>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-vvisa-surface-2">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-[#4F46E5] to-emerald-400" />
                </div>
              </motion.div>

              {/* Floating stat card – top left */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, y: [0, -12, 0] }}
                transition={{ duration: 0.6, delay: 0.7, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
                className="absolute top-4 left-0 z-20 bg-vvisa-surface border border-vvisa-border rounded-xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <TrendingUp className="size-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-sm leading-tight">₹15,000 Cashback</p>
                    <p className="text-emerald-400 text-xs">Earned this month</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating stat card – bottom right */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, y: [0, 10, 0] }}
                transition={{ duration: 0.6, delay: 0.9, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
                className="absolute bottom-8 right-0 z-20 bg-vvisa-surface border border-vvisa-border rounded-xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#4F46E5]/20 flex items-center justify-center">
                    <Wallet className="size-4 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-sm leading-tight">Total Earnings ₹12,570</p>
                    <p className="text-emerald-400 text-xs">↑ 30% vs last month</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ────────────────────── 3. TICKER BAR ────────────────────── */}
        <section className="ticker-bar border-y border-vvisa-border py-3 overflow-hidden">
          <div className="animate-marquee flex whitespace-nowrap gap-12">
            {[
              'Best Prices for Travel Agents',
              'Quick & Easy Applications',
              '24/7 Support, Anytime',
              '99.2% On-Time Delivery',
              '5,00,000+ Visas Processed',
              '65 Types of Visas',
              'GST-Compliant Invoices',
            ].map((text, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-3 text-sm text-vvisa-text-muted select-none"
              >
                <Globe className="size-3.5 text-[#4F46E5]" />
                {text}
                <span className="text-[#2A2A38]">•</span>
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {[
              'Best Prices for Travel Agents',
              'Quick & Easy Applications',
              '24/7 Support, Anytime',
              '99.2% On-Time Delivery',
              '5,00,000+ Visas Processed',
              '65 Types of Visas',
              'GST-Compliant Invoices',
            ].map((text, i) => (
              <span
                key={`dup-${i}`}
                className="inline-flex items-center gap-3 text-sm text-vvisa-text-muted select-none"
              >
                <Globe className="size-3.5 text-[#4F46E5]" />
                {text}
                <span className="text-[#2A2A38]">•</span>
              </span>
            ))}
          </div>
        </section>

        {/* ────────────────────── 4. TRUST BAR ────────────────────── */}
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mx-auto max-w-5xl text-center">
            <p className="text-sm sm:text-base text-vvisa-text-secondary">
              <span className="text-[#4F46E5] font-bold text-base sm:text-lg">5,000+</span>{' '}
              Travel Agents trust VVisa for On Time Visas
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {[
                { name: 'Veena World', city: 'Mumbai' },
                { name: 'Affinco', city: 'Delhi' },
                { name: 'Travel Best', city: 'Bangalore' },
                { name: 'The Journeys', city: 'Chennai' },
              ].map((agency) => (
                <div
                  key={agency.name}
                  className="flex items-center gap-2 rounded-full border border-vvisa-border bg-vvisa-surface px-4 py-2"
                >
                  <div className="h-6 w-6 rounded-full bg-vvisa-surface-2 flex items-center justify-center text-[10px] font-bold text-vvisa-text-secondary">
                    {agency.name[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-foreground text-xs font-medium leading-tight">{agency.name}</p>
                    <p className="text-vvisa-text-muted text-[10px]">{agency.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ────────────────────── 5. WHY CHOOSE VVISA ────────────────────── */}
        <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mx-auto max-w-7xl">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                Why Choose VVisa?
              </h2>
              <p className="mt-3 text-vvisa-text-secondary max-w-xl mx-auto">
                Everything your travel agency needs to process visas faster, cheaper, and with zero errors.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              {/* Left – features */}
              <motion.div
                {...staggerContainer}
                className="space-y-8"
              >
                {[
                  {
                    icon: Shield,
                    title: 'Best Prices for Travel Agents',
                    bullets: [
                      'Save more with unbeatable rates',
                      'Extra discounts on bulk applications',
                    ],
                  },
                  {
                    icon: Zap,
                    title: 'Quick & Easy Applications',
                    bullets: [
                      'Passport scanner to reduce errors',
                      'Apply for up to 500 visa applications in one click',
                    ],
                  },
                  {
                    icon: Headphones,
                    title: '24/7 Support, Anytime',
                    bullets: [
                      'Your dedicated Account Manager',
                      'Emergency help around the clock',
                    ],
                  },
                ].map((feature) => (
                  <motion.div
                    key={feature.title}
                    {...fadeInUp}
                    className="flex gap-4"
                  >
                    <div className="mt-0.5 h-10 w-10 shrink-0 rounded-lg bg-[#4F46E5]/15 flex items-center justify-center">
                      <feature.icon className="size-5 text-[#4F46E5]" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-base sm:text-lg">
                        {feature.title}
                      </h3>
                      <ul className="mt-1.5 space-y-1">
                        {feature.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-sm text-vvisa-text-secondary">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#4F46E5]" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Right – product screenshot card */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative"
              >
                <div className="rounded-2xl border border-vvisa-border bg-vvisa-surface p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="h-3 w-3 rounded-full bg-red-500/60" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
                    <span className="ml-3 text-xs text-vvisa-text-muted font-mono">vvisa.app/dashboard</span>
                  </div>
                  <div className="space-y-4">
                    {/* Notification */}
                    <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                      <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="size-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">Guaranteed visa on Mar 15, 2026</p>
                        <p className="text-emerald-400/80 text-xs mt-0.5">Vietnam e-Visa · 8 travelers approved</p>
                      </div>
                    </div>
                    {/* Mini progress bars */}
                    <div className="space-y-3">
                      {[
                        { label: 'Vietnam', pct: 100, color: 'bg-emerald-400' },
                        { label: 'UAE', pct: 65, color: 'bg-[#4F46E5]' },
                        { label: 'Singapore', pct: 40, color: 'bg-amber-400' },
                      ].map((row) => (
                        <div key={row.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-vvisa-text-secondary">{row.label}</span>
                            <span className="text-foreground font-medium">{row.pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-vvisa-surface-2">
                            <div
                              className={`h-full rounded-full ${row.color} transition-all`}
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Glow */}
                <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-[#4F46E5]/20 via-transparent to-emerald-500/10 -z-10 blur-sm" />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ────────────────────── 6. STATS ────────────────────── */}
        <section className="bg-[#0D0D14] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-vvisa-border">
          <motion.div
            {...staggerContainer}
            className="mx-auto max-w-7xl grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
          >
            {[
              { value: '99.2%', label: 'Visas Delivered On Time' },
              { value: '5,00,000+', label: 'Visas Processed' },
              { value: '65', label: 'Types of Visas' },
              { value: '5,000+', label: 'Agents Trust Us' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                {...fadeInUp}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-extrabold text-[#4F46E5] tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-sm text-vvisa-text-secondary">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ────────────────────── 7. HOW TO APPLY ────────────────────── */}
        <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mx-auto max-w-5xl">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                How to Apply in 30 Seconds
              </h2>
              <p className="mt-3 text-vvisa-text-secondary">Four simple steps. That&rsquo;s all it takes.</p>
            </div>

            <motion.div
              {...staggerContainer}
              className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4"
            >
              {[
                { step: 1, icon: Search, label: 'Select Destination & Dates' },
                { step: 2, icon: Upload, label: 'Upload Passport & Photo' },
                { step: 3, icon: Wallet, label: 'Pay from VVisa Wallet' },
                { step: 4, icon: CheckCircle, label: 'Get Your Visa Within ETA' },
              ].map((item, idx) => (
                <motion.div
                  key={item.step}
                  {...fadeInUp}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Connector line */}
                  {idx < 3 && (
                    <div className="hidden lg:block absolute top-6 left-[calc(50%+28px)] w-[calc(100%-56px)] border-t-2 border-dashed border-vvisa-border" />
                  )}
                  <div className="relative z-10 h-12 w-12 rounded-full bg-[#4F46E5]/15 border-2 border-[#4F46E5] flex items-center justify-center">
                    <item.icon className="size-5 text-[#4F46E5]" />
                  </div>
                  <p className="mt-4 text-xs font-bold text-[#4F46E5]">STEP {item.step}</p>
                  <p className="mt-1 text-sm text-vvisa-text-secondary leading-snug max-w-[160px]">{item.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ────────────────────── 8. TRAVEL INSURANCE BANNER ────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            {...scaleIn}
            className="mx-auto max-w-7xl rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Looking for travel insurance?
              </h3>
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-indigo-100">
                <span>98% settlement rate</span>
                <span className="text-indigo-300">|</span>
                <span>1 Day digital claims</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 h-11 px-6 rounded-lg text-sm shrink-0"
            >
              Sign up for free
            </Button>
          </motion.div>
        </section>

        {/* ────────────────────── 9. TESTIMONIALS ────────────────────── */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                Loved by Agencies Across India
              </h2>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {mockTestimonials.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTestimonial(i)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    activeTestimonial === i
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-vvisa-surface text-vvisa-text-secondary border border-vvisa-border hover:border-[#3D3D54] hover:text-white'
                  }`}
                >
                  {t.company}
                </button>
              ))}
            </div>

            {/* Quote */}
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-center"
            >
              <Quote className="mx-auto mb-4 size-8 text-[#4F46E5]/40" />
              <blockquote className="text-lg sm:text-xl lg:text-2xl italic text-[#E5E7EB] leading-relaxed max-w-3xl mx-auto">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="mt-6">
                <p className="text-foreground font-semibold">{testimonial.author}</p>
                <p className="text-sm text-vvisa-text-secondary">
                  {testimonial.role}, {testimonial.company}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ────────────────────── 10. FAQ ────────────────────── */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#0D0D14] border-t border-vvisa-border">
          <motion.div {...fadeInUp} className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-vvisa-text-secondary">Everything you need to know about VVisa.</p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {mockFAQs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={`faq-${faq.id}`}
                  className="border-vvisa-border"
                >
                  <AccordionTrigger className="text-foreground text-sm sm:text-base hover:no-underline hover:text-white py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-vvisa-text-secondary text-sm leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </section>
      </main>

      {/* ────────────────────── 11. FOOTER ────────────────────── */}
      <footer className="border-t border-vvisa-border bg-vvisa-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo.svg" alt="VVisa" width={28} height={28} />
                <span className="text-foreground font-bold text-lg">VVisa</span>
              </div>
              <p className="text-sm text-vvisa-text-muted">Built for India &hearts;</p>
              {/* Social icons */}
              <div className="mt-5 flex items-center gap-3">
                {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="h-9 w-9 rounded-lg bg-vvisa-surface border border-vvisa-border flex items-center justify-center text-vvisa-text-muted hover:text-white hover:border-[#3D3D54] transition-colors"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-foreground text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About Us', 'Careers', 'Partners'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-vvisa-text-muted hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-foreground text-sm font-semibold mb-4">Support</h4>
              <ul className="space-y-2.5">
                {['Help Center', 'Contact'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-vvisa-text-muted hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-foreground text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy', 'Terms'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-vvisa-text-muted hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Offices */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <h4 className="text-foreground text-sm font-semibold mb-4">Offices</h4>
              <ul className="space-y-2.5 text-sm text-vvisa-text-muted">
                <li>Mumbai, India</li>
                <li>Delhi, India</li>
                <li>New York, USA</li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-vvisa-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-vvisa-text-muted">
              &copy; 2026 VVisa AI Platform. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-xs text-vvisa-text-muted hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-vvisa-text-muted hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}