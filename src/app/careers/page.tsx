import Link from 'next/link';
import { BriefcaseBusiness, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { careersFeatureSnapshot } from '@/server/careers/feature-flags';
import { listPublicCareerPackages } from '@/server/careers/packages';

export default async function CareersLandingPage() {
  const flags = careersFeatureSnapshot();
  const configuredPackages = await listPublicCareerPackages('INR');
  const packages = configuredPackages.length
    ? configuredPackages.map((item) => [item.name, item.description])
    : [
        ['Europe Job Search Assist', 'Resume intake, role targeting, progress dashboard, and managed internal review.'],
        ['Europe Job Search Pro', 'Adds deeper opportunity review, recruiter-draft preparation, and consultant workflow.'],
        ['Europe Job Search Premium', 'Adds priority consultant handling and expanded employer-response support in future phases.'],
      ];

  return (
    <main className="min-h-screen bg-vvisa-surface-2 text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl content-center gap-10 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-vvisa-border-subtle bg-vvisa-surface px-3 py-1 text-xs font-medium text-vvisa-text-secondary">
            <BriefcaseBusiness className="size-4 text-primary" />
            Managed Europe job-search service
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-foreground md:text-6xl">VVisa Careers</h1>
            <p className="max-w-2xl text-lg leading-8 text-vvisa-text-secondary">
              A managed job-application service for candidates targeting Europe, with onboarding, resume intake, role preferences, transparent progress tracking, and internal V-VISAS review before execution.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/careers/onboarding">Start onboarding</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/careers/dashboard">View dashboard</Link></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['No auto-submit in Phase 1', 'Internal review model', 'Feature-flag protected'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-vvisa-text-secondary">
                <ShieldCheck className="size-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          {packages.map(([title, description]) => (
            <Card key={title} className="rounded-lg border-vvisa-border-subtle">
              <CardContent className="flex gap-3 p-5">
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-vvisa-text-secondary">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="rounded-lg border border-vvisa-border-subtle bg-vvisa-surface p-4 text-xs text-vvisa-text-muted">
            Feature flag status: SaaS {flags.CAREERS_SAAS_ENABLED ? 'enabled' : 'disabled'}, onboarding {flags.CAREERS_ONBOARDING_ENABLED ? 'enabled' : 'disabled'}, resume upload {flags.CAREERS_RESUME_UPLOAD_ENABLED ? 'enabled' : 'disabled'}.
          </div>
        </div>
      </section>
    </main>
  );
}
