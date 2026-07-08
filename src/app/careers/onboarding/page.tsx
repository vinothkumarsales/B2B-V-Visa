import Link from 'next/link';
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { CareerOnboardingForm } from '@/components/careers/CareerOnboardingForm';
import { careersFeatureSnapshot } from '@/server/careers/feature-flags';
import { listPublicCareerPackages } from '@/server/careers/packages';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function CareersOnboardingPage() {
  const flags = careersFeatureSnapshot();
  const packages = await listPublicCareerPackages('INR');
  const enabled = flags.CAREERS_SAAS_ENABLED && flags.CAREERS_ONBOARDING_ENABLED && flags.CAREERS_PACKAGES_ENABLED && packages.length > 0;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#f4f8fb_100%)] px-5 py-8 text-foreground lg:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="overflow-hidden rounded-2xl border border-vvisa-border-subtle bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_0.8fr] lg:p-10">
            <div>
              <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
                <Link href="/careers">
                  <ArrowLeft className="size-4" />
                  Back to Careers
                </Link>
              </Button>
              <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
                <Sparkles className="size-3.5" />
                Managed intake
              </Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">Build your Europe job-search profile</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-vvisa-text-secondary">
                Tell us who you are, where you want to go, and what kind of roles you are targeting. This creates the structured candidate record used for package selection, payment activation, and internal review.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                ['Resume-ready intake', 'Profile and role preferences are captured before deeper execution.', FileText],
                ['Package-linked service', 'The selected package becomes part of the candidate service request.', BriefcaseBusiness],
                ['Controlled activation', 'Later steps stay feature-flagged and team-reviewed.', ShieldCheck],
              ].map(([title, description, Icon]) => (
                <div key={title as string} className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-[var(--vvisa-shadow-sm)]">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{title as string}</p>
                      <p className="mt-1 text-sm leading-6 text-vvisa-text-secondary">{description as string}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-100">
                <BadgeCheck className="size-4 text-cyan-300" />
                You stay involved when interviews, documents, assignments, or approvals are needed.
              </div>
            </div>
          </div>
        </div>
        <CareerOnboardingForm enabled={enabled} packages={packages} />
      </div>
    </main>
  );
}
