/**
 * Navigation tree — the single source of truth for the mega-menu, the footer,
 * and (later) the sitemap. Adding a page means adding it here once.
 *
 * `icon` is a lucide icon NAME, not the component: content modules must never
 * import from `lucide-react` or they drag the marketing tree client-side.
 */

export type NavLink = {
  label: string;
  href: string;
  blurb?: string;
  icon?: string;
  /** Renders a muted "Soon" chip and is excluded from the sitemap. */
  soon?: boolean;
};

export type NavGroup = { label: string; links: NavLink[] };

export type NavSection = {
  label: string;
  /** Flat link instead of a panel. */
  href?: string;
  groups?: NavGroup[];
  featured?: { eyebrow: string; title: string; body: string; href: string };
};

export const PRIMARY_NAV: NavSection[] = [
  {
    label: 'Solutions',
    groups: [
      {
        label: 'By industry',
        links: [
          { label: 'Outbound tour operators', href: '/solutions/industries/outbound-tour-operators', blurb: 'Group departures on fixed dates', icon: 'Plane' },
          { label: 'Corporate travel desks', href: '/solutions/industries/corporate-travel', blurb: 'Business visas at short notice', icon: 'Briefcase', soon: true },
          { label: 'Destination management', href: '/solutions/industries/dmc', blurb: 'Inbound partners and ground handlers', icon: 'Map', soon: true },
        ],
      },
      {
        label: 'By team',
        links: [
          { label: 'Visa desk', href: '/solutions/teams/visa-desk', blurb: 'The people filing every day', icon: 'Stamp', soon: true },
          { label: 'Operations', href: '/solutions/functions/operations', blurb: 'Throughput and exception handling', icon: 'Workflow', soon: true },
          { label: 'Finance', href: '/solutions/functions/finance', blurb: 'Wallet, invoices and reconciliation', icon: 'Receipt', soon: true },
        ],
      },
      {
        label: 'By role',
        links: [
          { label: 'Agency owner', href: '/solutions/roles/agency-owner', blurb: 'Margin, capacity and risk', icon: 'Building2', soon: true },
          { label: 'Operations manager', href: '/solutions/roles/operations-manager', blurb: 'Queues, SLAs and escalation', icon: 'ClipboardList', soon: true },
        ],
      },
    ],
    featured: {
      eyebrow: 'Use case',
      title: 'Group departures without the spreadsheet',
      body: 'One workflow for 40 travellers on the same date, with per-traveller document state.',
      href: '/solutions/use-cases/group-departures',
    },
  },
  {
    label: 'Visas',
    groups: [
      {
        label: 'Destinations',
        links: [
          { label: 'United Kingdom', href: '/visas/united-kingdom', blurb: 'Standard Visitor, 180 days', icon: 'Landmark' },
          { label: 'Turkey', href: '/visas/turkey', blurb: 'e-Visa and sticker routes', icon: 'Landmark' },
          { label: 'South Korea', href: '/visas/south-korea', blurb: 'Short-term visit', icon: 'Landmark' },
          { label: 'Portugal', href: '/visas/portugal', blurb: 'Schengen short stay', icon: 'Landmark' },
        ],
      },
      {
        label: 'Catalogue',
        links: [
          { label: 'All destinations', href: '/visas', blurb: 'Every published visa product', icon: 'Globe' },
          { label: 'Document checklists', href: '/docs/document-checklists', blurb: 'What each route requires', icon: 'FileCheck2', soon: true },
        ],
      },
    ],
  },
  {
    label: 'Customers',
    groups: [
      {
        label: 'Proof',
        links: [
          { label: 'Case studies', href: '/customers', blurb: 'How agencies run their desk', icon: 'BookOpen' },
          { label: 'Wall of love', href: '/customers/wall-of-love', blurb: 'What partners say', icon: 'Heart', soon: true },
        ],
      },
      {
        label: 'Compare',
        links: [
          { label: 'vs spreadsheets and email', href: '/compare/spreadsheets-and-email', blurb: 'The default most desks run on', icon: 'Table2' },
          { label: 'vs an in-house visa desk', href: '/compare/in-house-visa-desk', blurb: 'Build or buy', icon: 'Users', soon: true },
        ],
      },
    ],
  },
  {
    label: 'Resources',
    groups: [
      {
        label: 'Learn',
        links: [
          { label: 'Playbooks', href: '/resources/playbooks', blurb: 'Operating guides for the desk', icon: 'BookMarked' },
          { label: 'Documentation', href: '/docs', blurb: 'How the platform works', icon: 'FileText' },
          { label: 'Developers', href: '/developers', blurb: 'API and integrations', icon: 'Code2', soon: true },
        ],
      },
      {
        label: 'Company',
        links: [
          { label: 'About', href: '/about', blurb: 'Who is building this', icon: 'Info' },
          { label: 'Contact', href: '/contact', blurb: 'Talk to the team', icon: 'MessageSquare' },
          { label: 'Careers service', href: '/careers', blurb: 'Managed Europe job search', icon: 'Compass' },
        ],
      },
    ],
  },
];

export const FOOTER_NAV: NavGroup[] = [
  {
    label: 'Product',
    links: [
      { label: 'Destinations', href: '/visas' },
      { label: 'Solutions', href: '/solutions/industries/outbound-tour-operators' },
      { label: 'Compare', href: '/compare/spreadsheets-and-email' },
      { label: 'Documentation', href: '/docs' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Careers service', href: '/careers' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { label: 'Playbooks', href: '/resources/playbooks' },
      { label: 'Case studies', href: '/customers' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
    ],
  },
];
