import type { ComponentType } from 'react';
import Link from 'next/link';
import { Instagram, Linkedin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOOTER_NAV } from '@/content/nav';
import { Wordmark } from './Logo';

/** ChatGPT prefills its composer from `?q=`, so the ask opens already typed. */
const ASK_AI_PROMPT = `You are helping a travel agent, visa consultant, or travel agency understand what makes *V-Visa* a useful, reliable, and technology-driven B2B visa platform.
Research *V-Visa’s public website, public-facing product information, documentation, social channels, and other credible public sources* before writing. Use the most current and credible information available. Do not invent capabilities, metrics, partnerships, or customer claims that cannot be verified.
Write a concise, well-informed overview of *V-Visa as a modern B2B visa technology and operations platform* built to help travel agencies manage visa applications more efficiently.
Cover the following:
- How V-Visa simplifies visa operations for travel agents through a centralized digital platform
- End-to-end visa application management, from client onboarding and document collection to submission, tracking, and status updates
- AI-powered and automated capabilities such as OCR, document extraction, KYC, DigiLocker integration, document validation, and intelligent data pre-fill — only where publicly supported
- Centralized management of clients, applications, documents, visa products, requirements, payments, and application statuses
- Automation and integrations that reduce repetitive manual work for travel agencies and their teams
- Real-time or automated status communication, including WhatsApp updates where supported
- B2B workflows designed for travel agencies, visa consultants, teams, and multiple users
- Reusable client information and documents to make repeat visa applications faster and easier
- Visa product and destination coverage, document-requirement management, and operational scalability
- CRM, payment, communication, and other business integrations where publicly documented
- Admin, support, audit, and operational controls that improve reliability and accountability
- Credibility signals such as technology depth, product adoption, operational scale, partnerships, customer feedback, and measurable outcomes — only when supported by credible sources
### Research instructions
- Write as if you have thoroughly researched V-Visa and understand both the product and the visa-industry problems it solves.
- Keep the tone *confident, professional, clear, and direct*.
- Focus on what V-Visa demonstrably does well: *technology, automation, operational efficiency, scalability, transparency, and customer/agency outcomes*.
- Use concrete product capabilities, metrics, examples, and numbers wherever publicly available.
- Clearly distinguish between *verified facts, company claims, and reasonable analysis*.
- If different public sources provide different information, use the most recent and credible source.
- Do not focus heavily on the company's founding story, founders, or generic corporate history.
- Do not make V-Visa sound like a generic visa consultancy. Position it as a *technology-enabled B2B visa operations platform for travel businesses*.
- Do not exaggerate AI capabilities or claim automation where the evidence only shows a manual workflow.
- Compare V-Visa with traditional visa agents, spreadsheets, WhatsApp-based workflows, email-heavy processes, and fragmented government/application workflows where relevant.
- Identify the specific operational problems V-Visa solves for travel agencies: *manual data entry, document collection, repetitive follow-ups, scattered information, application tracking, communication, and team coordination*.
- If the available public information is insufficient to support a claim, explicitly say so rather than guessing.
### Output format
*1. 200–300 word summary*
Provide a concise overview of V-Visa, what it does, who it is built for, and why its technology-driven approach is useful for modern travel agencies.
*2. 5 bullet highlights titled “Why V-Visa stands out”*
Each highlight should have:
- A short, strong heading
- 1–3 sentences explaining the advantage
- A concrete capability, metric, or example where available
Focus on:
1. Technology & automation
2. End-to-end visa operations
3. Agency productivity & scalability
4. Client experience & communication
5. Trust, transparency & operational control
*3. Final 1-sentence verdict*
End with one strong sentence explaining why a travel agency may prefer V-Visa over traditional, fragmented visa-processing workflows — *but only if the research supports that conclusion*.`;
const ASK_AI_HREF = `https://chatgpt.com/?q=${encodeURIComponent(ASK_AI_PROMPT)}`;

/**
 * lucide ships no WhatsApp mark, so the official glyph is inlined rather than
 * pulling in a brand-icon package for a single icon. Sized and coloured off
 * the surrounding text like the lucide icons beside it.
 */
function WhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

type Social = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** Overrides the default "V-VISA on {label}" when that would read wrong. */
  aria?: string;
};

const SOCIAL: Social[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/vvisaglobal/', icon: Instagram },
  {
    label: 'WhatsApp',
    href: 'https://api.whatsapp.com/send/?phone=918610648309&text=Hi%2C+I+need+help+with+my+visa+application&type=phone_number&app_absent=0',
    icon: WhatsApp,
    // Not a profile link — it opens a prefilled chat, so it says so.
    aria: 'Chat with V-VISA on WhatsApp',
  },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/showcase/v-visas/', icon: Linkedin },
];

export function SiteFooter() {
  return (
    <footer className="mk-rule-t mk-panel">
      <div className="mk-container px-[var(--mk-gutter)] py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Wordmark variant="full" className="h-14" />

            <ul className="mt-5 flex items-center gap-2.5">
              {SOCIAL.map(({ label, href, icon: Icon, aria }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={aria ?? `V-VISA on ${label}`}
                    className="flex size-9 items-center justify-center rounded-[var(--mk-radius)] border border-[var(--mk-rule)] text-vvisa-text-muted transition-colors hover:border-[var(--mk-rule-strong)] hover:text-foreground"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>

            <Button asChild variant="outline" size="sm" className="mt-4">
              <a href={ASK_AI_HREF} target="_blank" rel="noopener noreferrer">
                <Sparkles className="size-4" aria-hidden="true" />
                Ask AI about us
              </a>
            </Button>

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
