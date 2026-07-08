import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireSession } from '@/server/auth/session';
import { careerCandidateFacingStatus } from '@/server/careers/onboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CareerCheckoutPanel } from '@/components/careers/CareerCheckoutPanel';
import { careersFeatureSnapshot } from '@/server/careers/feature-flags';
import { careerActivationDisplayStatus } from '@/server/careers/activation-policy';

export default async function CareersDashboardPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect('/login');
  const flags = careersFeatureSnapshot();
  const checkoutEnabled = flags.CAREERS_SAAS_ENABLED && flags.CAREERS_PACKAGES_ENABLED && flags.CAREERS_PAYMENTS_ENABLED && flags.CAREERS_CHECKOUT_ENABLED;

  const candidate = await db.careerCandidate.findFirst({
    where: { userId: session.user.id },
    include: {
      preferences: true,
      resumes: { orderBy: { createdAt: 'desc' }, take: 3 },
      serviceRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
      paymentIntents: { orderBy: { createdAt: 'desc' }, take: 1 },
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      activationHandoffs: { orderBy: { createdAt: 'desc' }, take: 1 },
      statusEvents: { orderBy: { createdAt: 'desc' }, take: 6 },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-vvisa-surface-2 px-5 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-vvisa-text-muted">VVisa Careers</p>
            <h1 className="text-3xl font-semibold">Candidate dashboard</h1>
          </div>
          <Button asChild><Link href="/careers/onboarding">Update onboarding</Link></Button>
        </div>

        {!candidate ? (
          <Card className="rounded-lg border-vvisa-border-subtle">
            <CardContent className="p-6 text-sm text-vvisa-text-secondary">
              No career profile yet. Start onboarding to create your Phase 1 career dashboard.
            </CardContent>
          </Card>
        ) : (
          <>
            {candidate.serviceRequests[0] && candidate.paymentIntents[0] && (
              <Card className="rounded-lg border-vvisa-border-subtle">
                <CardHeader><CardTitle>Checkout</CardTitle></CardHeader>
                <CardContent>
                  <CareerCheckoutPanel
                    enabled={checkoutEnabled}
                    serviceRequestId={candidate.serviceRequests[0].id}
                    packageCode={candidate.serviceRequests[0].packageCode}
                    currency={candidate.paymentIntents[0].currency}
                    amountMinor={candidate.paymentIntents[0].amountMinor}
                  />
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-lg border-vvisa-border-subtle">
                <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{careerCandidateFacingStatus(candidate.status)}</p>
                  <p className="mt-2 text-sm text-vvisa-text-secondary">Profile completion: {candidate.profileCompletionPercent}%</p>
                </CardContent>
              </Card>
              <Card className="rounded-lg border-vvisa-border-subtle">
                <CardHeader><CardTitle>Package</CardTitle></CardHeader>
                <CardContent className="text-sm text-vvisa-text-secondary">
                  {candidate.serviceRequests[0]?.packageCode.replaceAll('_', ' ') ?? 'Not selected'}
                  <div className="mt-2">Payment: {candidate.serviceRequests[0]?.paymentStatus ?? 'not_started'}</div>
                  <div className="mt-2">Subscription: {candidate.subscriptions[0]?.status ?? 'draft'}</div>
                  <div className="mt-2">Activation: {careerActivationDisplayStatus({
                    paymentStatus: candidate.paymentIntents[0]?.status ?? null,
                    subscriptionStatus: candidate.subscriptions[0]?.status ?? null,
                    activationStatus: candidate.serviceRequests[0]?.activationStatus ?? null,
                    handoffStatus: candidate.activationHandoffs[0]?.status ?? null,
                  }).replaceAll('_', ' ')}</div>
                </CardContent>
              </Card>
              <Card className="rounded-lg border-vvisa-border-subtle">
                <CardHeader><CardTitle>Resume</CardTitle></CardHeader>
                <CardContent className="text-sm text-vvisa-text-secondary">
                  {candidate.resumes.length ? `${candidate.resumes.length} upload(s) received` : 'No resume uploaded yet'}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-lg border-vvisa-border-subtle">
              <CardHeader><CardTitle>Current preferences</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm text-vvisa-text-secondary md:grid-cols-2">
                <p>Region: {candidate.preferences?.targetRegion ?? '-'}</p>
                <p>Roles: {Array.isArray(candidate.preferences?.targetRoles) ? candidate.preferences.targetRoles.join(', ') : '-'}</p>
                <p>Sponsorship: {candidate.preferences?.sponsorshipRequired === true ? 'Required' : candidate.preferences?.sponsorshipRequired === false ? 'Not required' : '-'}</p>
                <p>Relocation: {candidate.preferences?.relocationRequired === true ? 'Required' : candidate.preferences?.relocationRequired === false ? 'Not required' : '-'}</p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-vvisa-border-subtle">
              <CardHeader><CardTitle>Payment readiness</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm text-vvisa-text-secondary md:grid-cols-3">
                <p>Intent: {candidate.paymentIntents[0]?.status ?? 'draft'}</p>
                <p>Currency: {candidate.paymentIntents[0]?.currency ?? '-'}</p>
                <p>Amount: {candidate.paymentIntents[0] ? candidate.paymentIntents[0].amountMinor / 100 : '-'}</p>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-vvisa-border-subtle">
              <CardHeader><CardTitle>Recent updates</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {candidate.statusEvents.map((event) => (
                  <div key={event.id} className="rounded-md border border-vvisa-border-subtle p-3">
                    <p className="font-medium">{event.label}</p>
                    <p className="text-vvisa-text-muted">{event.detail ?? 'No details'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
