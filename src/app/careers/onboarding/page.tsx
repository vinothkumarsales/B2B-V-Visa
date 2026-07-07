import Link from 'next/link';
import { CareerOnboardingForm } from '@/components/careers/CareerOnboardingForm';
import { careersFeatureSnapshot } from '@/server/careers/feature-flags';
import { Button } from '@/components/ui/button';

export default function CareersOnboardingPage() {
  const flags = careersFeatureSnapshot();
  const enabled = flags.CAREERS_SAAS_ENABLED && flags.CAREERS_ONBOARDING_ENABLED;

  return (
    <main className="min-h-screen bg-vvisa-surface-2 px-5 py-8 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-vvisa-text-muted">Phase 1</p>
            <h1 className="text-3xl font-semibold">Career service onboarding</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-vvisa-text-secondary">
              Capture verified candidate preferences and package selection. Payment, activation, job discovery, and application automation start in later reviewed phases.
            </p>
          </div>
          <Button asChild variant="outline"><Link href="/careers">Back</Link></Button>
        </div>
        <CareerOnboardingForm enabled={enabled} />
      </div>
    </main>
  );
}
