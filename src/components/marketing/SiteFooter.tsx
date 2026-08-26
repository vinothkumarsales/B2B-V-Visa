import Link from 'next/link';
import { FOOTER_NAV } from '@/content/nav';
import { Wordmark } from './Logo';

export function SiteFooter() {
  return (
    <footer className="mk-rule-t mk-panel">
      <div className="mk-container px-[var(--mk-gutter)] py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark />
            <p className="mk-prose mt-4 max-w-xs text-sm leading-relaxed text-vvisa-text-muted">
              A visa operations console for travel agencies — catalogue, documents, payment and
              tracking on one screen.
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <div key={group.label}>
              <p className="mk-eyebrow">{group.label}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-vvisa-text-secondary transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mk-rule-t mt-12 flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-xs text-vvisa-text-muted">
            © {new Date().getFullYear()} VVisa. Built for India.
          </p>
          <p className="font-mono text-xs text-vvisa-text-muted">Mumbai · Delhi · Bengaluru</p>
        </div>
      </div>
    </footer>
  );
}
