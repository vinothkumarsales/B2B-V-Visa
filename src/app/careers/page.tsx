import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Compass,
  FileText,
  Globe2,
  Handshake,
  Layers3,
  LineChart,
  LockKeyhole,
  MapPinned,
  MessageSquareText,
  Plane,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { careersFeatureSnapshot } from '@/server/careers/feature-flags';
import { listPublicCareerPackages, type CareerPackageOption } from '@/server/careers/packages';

export const dynamic = 'force-dynamic';

const europeBenefits = [
  {
    title: 'Demand across skilled roles',
    description: 'European employers continue to look for capable professionals in technology, operations, healthcare, finance, hospitality, and specialist services.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Multiple country options',
    description: 'A Europe-focused search can compare hiring routes across established economies, innovation hubs, and region-specific sponsorship pathways.',
    icon: MapPinned,
  },
  {
    title: 'Structured hiring standards',
    description: 'Clearer job descriptions, formal screening stages, and mature employer processes can help candidates understand what is expected.',
    icon: ClipboardCheck,
  },
  {
    title: 'International exposure',
    description: 'Working with European employers can strengthen global experience, cross-cultural communication, and long-term career positioning.',
    icon: Globe2,
  },
  {
    title: 'Career stability potential',
    description: 'For the right profile and field, Europe can offer stronger professional environments, labor protections, and progression opportunities.',
    icon: LineChart,
  },
  {
    title: 'Quality-of-life appeal',
    description: 'Candidates often value Europe for public infrastructure, mobility, education access, and a broader international lifestyle.',
    icon: Plane,
  },
];

const workflowSteps = [
  ['Create your profile', 'Share your basic details so VVisa Careers can prepare your candidate record.'],
  ['Upload resume and preferences', 'Add your resume, target countries, role type, experience, and job-search priorities.'],
  ['Choose your package', 'Select the managed support level that matches how much help you want from the team.'],
  ['Payment confirms activation', 'A verified payment moves the service into activation instead of leaving it as a loose enquiry.'],
  ['Internal review and setup', 'The V-VISAS team reviews the profile and prepares the next job-search workflow steps.'],
  ['Track progress in dashboard', 'You can see service state, activation status, and items that may need your attention.'],
  ['Step in when required', 'You act when employers or the team need interviews, calls, assignments, declarations, signatures, or documents.'],
];

const serviceValues = [
  ['Structured onboarding', 'A guided intake flow captures candidate details in a consistent format.', UserCheck],
  ['Resume intake', 'Private resume upload and profile capture keep the process organized from day one.', FileText],
  ['Role and country targeting', 'Preferences help the team understand the candidate’s Europe search direction.', Target],
  ['Package-based support', 'The service level is connected to the selected package and payment state.', Layers3],
  ['Dashboard visibility', 'Candidates get a clear place to check onboarding, payment, and activation progress.', LineChart],
  ['Consultant-led review', 'The internal team remains in control before deeper execution phases begin.', Handshake],
];

const differentiators = [
  ['Managed service, not a job board', 'VVisa Careers is designed around guided support, not just displaying listings and leaving candidates alone.'],
  ['Transparent candidate experience', 'The dashboard makes the service state visible so applicants know what has happened and what comes next.'],
  ['Human review before execution', 'The current model keeps the internal team in the loop before any later workflow expansion.'],
  ['Built for deeper automation later', 'The foundation is ready for future Career-Ops execution phases without pretending those live steps are active today.'],
];

const afterPayment = [
  ['Payment confirmed', 'The payment record is matched, verified, and moved through controlled payment states.'],
  ['Service activated', 'The selected package can activate the candidate subscription and service request once.'],
  ['Setup handoff queued', 'A durable activation handoff is created for the later workspace-preparation phase.'],
  ['Dashboard updated', 'The candidate can return to the dashboard to see progress and next action signals.'],
];

const dashboardSignals = [
  'Profile completion',
  'Resume and onboarding status',
  'Payment and package state',
  'Service activation status',
  'Setup queue visibility',
  'Future tasks requiring attention',
];

const faqs = [
  {
    question: 'Is VVisa Careers a job board?',
    answer: 'No. It is being built as a managed job-search service. The candidate completes onboarding and the V-VISAS team manages the workflow around the selected package.',
  },
  {
    question: 'Do I need to apply manually to every role?',
    answer: 'The service is intended to reduce manual coordination for candidates, but the current product does not claim live automatic submission. You will still step in when approvals, interviews, documents, tests, or signatures are needed.',
  },
  {
    question: 'What happens after payment?',
    answer: 'A verified payment can activate the subscription and service request, then create a pending handoff for the later workspace setup phase. The team can review the candidate profile and prepare the next steps.',
  },
  {
    question: 'Will I be able to track progress?',
    answer: 'Yes. The candidate dashboard is part of the current product foundation and is designed to show onboarding, payment, activation, and future progress signals.',
  },
  {
    question: 'Do I need to approve every application step?',
    answer: 'Approval rules depend on the later execution workflow. The current positioning is conservative: the candidate acts when required for interviews, assignments, documents, declarations, signatures, or important decisions.',
  },
  {
    question: 'Is Europe the only region supported?',
    answer: 'This page focuses on Europe because the current package set is Europe-oriented. The platform design can support broader regions in future phases when packages and operations are configured.',
  },
];

const fallbackPackages: CareerPackageOption[] = [
  {
    code: 'EUROPE_JOB_SEARCH_ASSIST',
    name: 'Europe Job Search Assist',
    description: 'A guided starting package for candidates who want structured onboarding, resume intake, and progress visibility.',
    currency: 'INR',
    amountMinor: 0,
    billingMode: 'one_time',
    features: ['Resume and profile intake', 'Country and role targeting', 'Dashboard progress visibility', 'Internal review queue'],
    quotas: {},
  },
  {
    code: 'EUROPE_JOB_SEARCH_PRO',
    name: 'Europe Job Search Pro',
    description: 'For candidates who want deeper managed support and a more hands-on internal review workflow.',
    currency: 'INR',
    amountMinor: 0,
    billingMode: 'one_time',
    features: ['Everything in Assist', 'Expanded preference capture', 'Priority workflow review', 'Activation handoff visibility'],
    quotas: {},
  },
  {
    code: 'EUROPE_JOB_SEARCH_PREMIUM',
    name: 'Europe Job Search Premium',
    description: 'For candidates who want the strongest managed-service experience as future execution phases are enabled.',
    currency: 'INR',
    amountMinor: 0,
    billingMode: 'one_time',
    features: ['Everything in Pro', 'Premium internal handling', 'Enhanced tracking readiness', 'Future employer-response support'],
    quotas: {},
  },
];

export default async function CareersLandingPage() {
  const flags = careersFeatureSnapshot();
  const configuredPackages = await listPublicCareerPackages('INR');
  const packages = configuredPackages.length ? configuredPackages : fallbackPackages;

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_34%,#f6f9fc_100%)] text-foreground">
      <section className="relative border-b border-vvisa-border-subtle">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(28,113,216,0.12),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(20,184,166,0.10),transparent_28%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">
              <Sparkles className="size-3.5" />
              Managed Europe job-search service
            </Badge>
            <div className="mt-7 space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-normal text-foreground md:text-6xl">
                Your managed pathway to Europe job opportunities
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-vvisa-text-secondary">
                VVisa Careers helps candidates move from resume upload to a structured, team-managed Europe job-search workflow with package-based support, service activation, and transparent dashboard progress.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link href="/careers/onboarding">
                  Start onboarding
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/careers/dashboard">View dashboard</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/careers/demo">View live demo journey</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 rounded-xl border border-vvisa-border-subtle bg-white/80 p-4 shadow-[var(--vvisa-shadow-sm)] backdrop-blur sm:grid-cols-3">
              {['Managed service', 'Internal review model', 'Progress dashboard'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-medium text-vvisa-text-secondary">
                  <ShieldCheck className="size-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-vvisa-border-subtle bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.13)] backdrop-blur">
              <div className="rounded-xl border border-vvisa-border-subtle bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200">Candidate workspace</p>
                    <h2 className="mt-2 text-2xl font-semibold">Europe search readiness</h2>
                  </div>
                  <Badge className="bg-emerald-400 text-emerald-950">Active flow</Badge>
                </div>
                <div className="mt-7 grid gap-3">
                  {[
                    ['Profile intake', 'Complete', '100%'],
                    ['Payment activation', 'Verified', 'Ready'],
                    ['Service setup', 'Queued', 'Next'],
                  ].map(([label, state, value]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/7 p-4">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-medium">{label}</span>
                        <span className="text-cyan-100">{state}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-cyan-300" style={{ width: value === 'Next' ? '68%' : '100%' }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-300">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 pt-4 sm:grid-cols-3">
                {[
                  ['3', 'Europe packages'],
                  ['7', 'Workflow steps'],
                  ['0', 'Guaranteed job claims'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border border-vvisa-border-subtle bg-vvisa-surface p-4">
                    <p className="text-2xl font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-vvisa-text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section eyebrow="Why Europe?" title="A practical target for ambitious international careers" description="Europe can be attractive for candidates who want structured hiring, stronger professional environments, and long-term global mobility. The opportunity still depends on your profile, field, timing, and employer requirements.">
        <p className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-vvisa-text-secondary">
          Europe is our first launch corridor. The same managed workflow can later support other countries and regions based on available packages.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {europeBenefits.map((item) => (
            <FeatureCard key={item.title} icon={item.icon} title={item.title} description={item.description} />
          ))}
        </div>
      </Section>

      <Section eyebrow="How it works" title="From onboarding to a managed service queue" description="The journey is designed to be clear for the candidate and controlled for the internal V-VISAS team. Current phases stop at activation handoff, without claiming live automated applications.">
        <div className="grid gap-3">
          {workflowSteps.map(([title, description], index) => (
            <div key={title} className="group grid gap-4 rounded-xl border border-vvisa-border-subtle bg-white p-4 shadow-[var(--vvisa-shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--vvisa-shadow-md)] sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">{index + 1}</div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-vvisa-text-secondary">{description}</p>
              </div>
              {index < workflowSteps.length - 1 ? <ArrowRight className="hidden size-5 text-vvisa-text-muted sm:block" /> : <CheckCircle2 className="hidden size-5 text-emerald-600 sm:block" />}
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="What you get" title="Service support designed around clarity" description="The current product foundation gives candidates a structured start and gives the team a controlled operational workflow before later execution phases begin.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {serviceValues.map(([title, description, Icon]) => (
            <FeatureCard key={title as string} icon={Icon as typeof BriefcaseBusiness} title={title as string} description={description as string} />
          ))}
        </div>
      </Section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
          <div>
            <Badge className="bg-cyan-300 text-slate-950">Why VVisa Careers</Badge>
            <h2 className="mt-5 text-3xl font-semibold leading-tight md:text-4xl">A managed model with transparency built in</h2>
            <p className="mt-4 leading-7 text-slate-300">
              Candidates should not have to guess what happened after paying for support. VVisa Careers is being shaped around visible progress, internal review, and careful phase-by-phase execution.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {differentiators.map(([title, description]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/7 p-5">
                <BadgeCheck className="size-5 text-cyan-300" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section eyebrow="Packages" title="Choose the level of managed support you want" description="Package cards use live package configuration when enabled. The page keeps a clear fallback preview when package configuration is disabled.">
        <div className="grid gap-5 lg:grid-cols-3">
          {packages.map((careerPackage, index) => (
            <PackageCard key={careerPackage.code} careerPackage={careerPackage} featured={index === 1} />
          ))}
        </div>
      </Section>

      <Section eyebrow="After payment" title="What happens once your service is confirmed?" description="Payment does not disappear into a black box. The current product can move a verified payment into service activation and create a controlled handoff for the next operational phase.">
        <div className="grid gap-4 md:grid-cols-4">
          {afterPayment.map(([title, description], index) => (
            <div key={title} className="rounded-xl border border-vvisa-border-subtle bg-white p-5 shadow-[var(--vvisa-shadow-sm)]">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                {index === 0 ? <CircleDollarSign className="size-5" /> : index === 1 ? <CalendarCheck2 className="size-5" /> : index === 2 ? <Compass className="size-5" /> : <MessageSquareText className="size-5" />}
              </div>
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-vvisa-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Dashboard visibility" title="Progress you can return to" description="The dashboard is designed to make the candidate journey easier to follow, especially after payment and activation.">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="rounded-2xl border border-vvisa-border-subtle bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
            <div className="flex items-center justify-between border-b border-vvisa-border-subtle pb-4">
              <div>
                <p className="text-sm font-medium text-vvisa-text-muted">Candidate dashboard</p>
                <h3 className="mt-1 text-xl font-semibold">Service progress overview</h3>
              </div>
              <Badge variant="secondary">Demo-safe preview</Badge>
            </div>
            <div className="mt-5 grid gap-3">
              {dashboardSignals.map((signal, index) => (
                <div key={signal} className="flex items-center justify-between rounded-lg bg-vvisa-surface-2 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-white text-primary shadow-[var(--vvisa-shadow-sm)]">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <span className="text-sm font-medium">{signal}</span>
                  </div>
                  <span className="text-xs text-vvisa-text-muted">{index < 3 ? 'Available' : 'Planned signal'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <FeatureCard icon={LockKeyhole} title="Private by design" description="Resume handling stays behind private storage patterns and is not positioned as a public file experience." />
            <FeatureCard icon={Building2} title="Internal team control" description="The service can be reviewed and activated by authorized internal users without exposing execution controls to candidates." />
          </div>
        </div>
      </Section>

      <Section eyebrow="FAQ" title="Clear answers before you start" description="A few grounded answers for candidates considering a managed Europe job-search service.">
        <Accordion type="single" collapsible className="rounded-2xl border border-vvisa-border-subtle bg-white px-5 shadow-[var(--vvisa-shadow-sm)]">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-base font-semibold hover:no-underline">{faq.question}</AccordionTrigger>
              <AccordionContent className="max-w-3xl text-sm leading-7 text-vvisa-text-secondary">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

      <section className="px-5 pb-16 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#123b66_52%,#0f766e_100%)] p-8 text-white shadow-[0_26px_80px_rgba(15,23,42,0.25)] md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge className="bg-white text-slate-950">Ready when you are</Badge>
              <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">Start with a structured profile. Move forward with a managed team.</h2>
              <p className="mt-4 max-w-2xl leading-7 text-slate-200">
                Begin onboarding, upload your resume and preferences, then let the V-VISAS team guide the service workflow after package selection and activation.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/careers/onboarding">Start onboarding</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                <Link href="/careers/dashboard">View dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-vvisa-border-subtle bg-white px-5 py-4 text-center text-xs text-vvisa-text-muted">
        Feature status: SaaS {flags.CAREERS_SAAS_ENABLED ? 'enabled' : 'disabled'} · onboarding {flags.CAREERS_ONBOARDING_ENABLED ? 'enabled' : 'disabled'} · packages {flags.CAREERS_PACKAGES_ENABLED ? 'enabled' : 'disabled'} · live auto-submission disabled by design.
      </div>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-5 py-14 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-7 text-vvisa-text-secondary">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BriefcaseBusiness;
  title: string;
  description: string;
}) {
  return (
    <Card className="group rounded-xl border-vvisa-border-subtle bg-white transition-all hover:-translate-y-0.5 hover:shadow-[var(--vvisa-shadow-md)]">
      <CardContent className="p-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-5" />
        </div>
        <h3 className="mt-5 font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-vvisa-text-secondary">{description}</p>
      </CardContent>
    </Card>
  );
}

function PackageCard({
  careerPackage,
  featured,
}: {
  careerPackage: CareerPackageOption;
  featured: boolean;
}) {
  const amount = careerPackage.amountMinor > 0
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: careerPackage.currency,
        maximumFractionDigits: 0,
      }).format(careerPackage.amountMinor / 100)
    : 'Configured in checkout';

  const audience = careerPackage.code.includes('PREMIUM')
    ? 'For candidates who want the strongest managed-service lane.'
    : careerPackage.code.includes('PRO')
      ? 'For candidates who want deeper support and review.'
      : 'For candidates starting a structured Europe search.';

  return (
    <Card className={`relative rounded-2xl border-vvisa-border-subtle bg-white transition-all hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.14)] ${featured ? 'border-primary/35 shadow-[0_18px_55px_rgba(28,113,216,0.16)]' : ''}`}>
      {featured ? (
        <div className="absolute right-5 top-5">
          <Badge className="bg-primary text-primary-foreground">Popular</Badge>
        </div>
      ) : null}
      <CardContent className="flex h-full flex-col p-6">
        <p className="text-sm font-medium text-primary">{amount}</p>
        <h3 className="mt-3 pr-20 text-2xl font-semibold">{careerPackage.name}</h3>
        <p className="mt-3 text-sm leading-6 text-vvisa-text-secondary">{careerPackage.description}</p>
        <div className="mt-5 rounded-lg bg-vvisa-surface-2 p-3 text-sm font-medium text-vvisa-text-secondary">{audience}</div>
        <div className="mt-5 grid gap-3">
          {(careerPackage.features.length ? careerPackage.features : ['Structured onboarding', 'Package-linked support', 'Dashboard visibility']).slice(0, 5).map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm text-vvisa-text-secondary">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <Button asChild className="mt-6 w-full" variant={featured ? 'default' : 'outline'}>
          <Link href="/careers/onboarding">
            Start onboarding
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
