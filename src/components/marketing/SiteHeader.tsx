'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { PRIMARY_NAV, type NavLink } from '@/content/nav';
import { Wordmark } from './Logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ThemeToggle } from '@/components/ThemeToggle';

function SoonChip() {
  return (
    <span className="ml-2 rounded-sm border border-[var(--mk-rule)] px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-vvisa-text-muted">
      Soon
    </span>
  );
}

function MenuLink({ link, onNavigate }: { link: NavLink; onNavigate?: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className="group/link block rounded-[var(--mk-radius)] px-3 py-2.5 transition-colors hover:bg-[var(--mk-panel)]"
    >
      <span className="flex items-center text-[13.5px] font-medium text-foreground">
        {link.label}
        {link.soon && <SoonChip />}
      </span>
      {link.blurb && (
        <span className="mt-0.5 block text-xs leading-relaxed text-vvisa-text-muted">{link.blurb}</span>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes an open panel from anywhere in the header.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 bg-[var(--mk-canvas)]/85 backdrop-blur-md transition-colors ${
        scrolled ? 'border-b border-[var(--mk-rule)]' : 'border-b border-transparent'
      }`}
      onMouseLeave={() => setOpen(null)}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-[var(--mk-radius)] focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:text-background"
      >
        Skip to content
      </a>

      <div className="mk-container flex h-16 items-center justify-between gap-6 px-[var(--mk-gutter)]">
        <Link href="/" aria-label="VVisa home">
          <Wordmark className="h-7" priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {PRIMARY_NAV.map((section) =>
            section.href ? (
              <Link
                key={section.label}
                href={section.href}
                className="rounded-[var(--mk-radius)] px-3 py-2 text-[13.5px] font-medium text-vvisa-text-secondary transition-colors hover:text-foreground"
              >
                {section.label}
              </Link>
            ) : (
              <div key={section.label} onMouseEnter={() => setOpen(section.label)}>
                <button
                  type="button"
                  aria-expanded={open === section.label}
                  onClick={() => setOpen(open === section.label ? null : section.label)}
                  className={`flex items-center gap-1 rounded-[var(--mk-radius)] px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    open === section.label ? 'text-foreground' : 'text-vvisa-text-secondary hover:text-foreground'
                  }`}
                >
                  {section.label}
                  <ChevronDown
                    className={`size-3.5 transition-transform ${open === section.label ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden rounded-[var(--mk-radius)] px-3 py-2 text-[13.5px] font-medium text-vvisa-text-secondary transition-colors hover:text-foreground sm:block"
          >
            Log in
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/register">Get started</Link>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[20rem] border-[var(--mk-rule)] bg-[var(--mk-canvas)] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center justify-between border-b border-[var(--mk-rule)] px-5">
                <Wordmark className="h-7" />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Close menu">
                    <X className="size-4" />
                  </Button>
                </SheetClose>
              </div>
              <div className="overflow-y-auto p-3">
                <Accordion type="multiple">
                  {PRIMARY_NAV.map((section) => (
                    <AccordionItem
                      key={section.label}
                      value={section.label}
                      className="border-[var(--mk-rule)]"
                    >
                      <AccordionTrigger className="px-2 text-sm font-medium hover:no-underline">
                        {section.label}
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        {section.groups?.map((group) => (
                          <div key={group.label} className="mb-3">
                            <p className="mk-eyebrow px-3 pb-1 pt-2">{group.label}</p>
                            {group.links.map((link) => (
                              <MenuLink key={link.href} link={link} onNavigate={() => setMobileOpen(false)} />
                            ))}
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t border-[var(--mk-rule)] p-4">
                <Button asChild size="lg">
                  <Link href="/register" onClick={() => setMobileOpen(false)}>Get started</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mega-menu panel: full-bleed, ruled, aligned to the container grid. */}
      {PRIMARY_NAV.filter((s) => s.groups).map((section) =>
        open === section.label ? (
          <div
            key={section.label}
            className="absolute inset-x-0 top-16 hidden border-y border-[var(--mk-rule)] bg-[var(--mk-canvas)] lg:block"
            onMouseEnter={() => setOpen(section.label)}
          >
            <div className="mk-container grid gap-8 px-[var(--mk-gutter)] py-8 lg:grid-cols-[1fr_1fr_1fr_0.9fr]">
              {section.groups!.map((group) => (
                <div key={group.label}>
                  <p className="mk-eyebrow px-3 pb-2">{group.label}</p>
                  <div className="flex flex-col">
                    {group.links.map((link) => (
                      <MenuLink key={link.href} link={link} onNavigate={() => setOpen(null)} />
                    ))}
                  </div>
                </div>
              ))}
              {section.featured && (
                <Link
                  href={section.featured.href}
                  onClick={() => setOpen(null)}
                  className="rounded-[var(--mk-radius)] border border-[var(--mk-rule)] bg-[var(--mk-panel)] p-5 transition-colors hover:border-[var(--mk-rule-strong)]"
                >
                  <p className="mk-eyebrow">{section.featured.eyebrow}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{section.featured.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-vvisa-text-muted">{section.featured.body}</p>
                </Link>
              )}
            </div>
          </div>
        ) : null,
      )}
    </header>
  );
}
