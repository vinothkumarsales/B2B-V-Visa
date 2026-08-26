import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

/**
 * Marketing shell.
 *
 * Deliberately a server component: every page beneath it exports route
 * metadata, which a client component cannot do. The header is the only client
 * leaf, mounted from here rather than making the layout itself client-side.
 *
 * The `mk` class scopes the marketing design tokens to this subtree — the same
 * technique `.admin-console` uses — so the portal is unaffected by anything
 * the marketing site redefines.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mk flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
