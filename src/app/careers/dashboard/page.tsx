import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, Clock3, FileText, Gauge, Globe2, Layers3, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { db } from '@/lib/db';
import { requireSession } from '@/server/auth/session';
import { careerCandidateFacingStatus } from '@/server/careers/onboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#f4f8fb_100%)] px-5 py-8 text-foreground lg:py-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="overflow-hidden rounded-2xl border border-vvisa-border-subtle bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
          <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:p-10">
            <div>
              <Badge className="bg-cyan-300 text-slate-950">
                <Sparkles className="size-3.5" />
                VVisa Careers command center
              </Badge>
              <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">Candidate dashboard</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Track your profile, package, payment readiness, activation state, and next visible updates from one service workspace.
              </p>
            </div>
            <div className="flex flex-col justify-end gap-3 sm:flex-row lg:flex-col">
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/careers/onboarding">
                  Update onboarding
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                <Link href="/careers">Careers home</Link>
              </Button>
            </div>
          </div>
        </div>

        {!candidate ? (
          <Card className="overflow-hidden rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
            <CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserRound className="size-6" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold">No career profile yet</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-vvisa-text-secondary">
                  Start onboarding to create your managed Careers workspace. Your dashboard will show profile completion, package state, payment readiness, and activation progress.
                </p>
              </div>
              <Button asChild size="lg">
                <Link href="/careers/onboarding">Start onboarding</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {candidate.serviceRequests[0] && candidate.paymentIntents[0] && (
              <Card className="overflow-hidden rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
                <CardHeader className="border-b border-vvisa-border-subtle bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_100%)]">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BriefcaseBusiness className="size-5 text-primary" />
                    Checkout handoff
                  </CardTitle>
                  <p className="text-sm text-vvisa-text-secondary">Create a secure checkout session for the selected Careers package.</p>
                </CardHeader>
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
              <Card className="rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
                <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="size-5 text-primary" /> Status</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{careerCandidateFacingStatus(candidate.status)}</p>
                  <div className="mt-4 h-2 rounded-full bg-vvisa-surface-2">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${candidate.profileCompletionPercent}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-vvisa-text-secondary">Profile completion: {candidate.profileCompletionPercent}%</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
                <CardHeader><CardTitle className="flex items-center gap-2"><Layers3 className="size-5 text-primary" /> Package</CardTitle></CardHeader>
                <CardContent className="text-sm text-vvisa-text-secondary">
                  <p className="text-base font-semibold text-foreground">{candidate.serviceRequests[0]?.packageCode.replaceAll('_', ' ') ?? 'Not selected'}</p>
                  <StatusLine label="Payment" value={candidate.serviceRequests[0]?.paymentStatus ?? 'not_started'} />
                  <StatusLine label="Subscription" value={candidate.subscriptions[0]?.status ?? 'draft'} />
                  <StatusLine label="Activation" value={careerActivationDisplayStatus({
                    paymentStatus: candidate.paymentIntents[0]?.status ?? null,
                    subscriptionStatus: candidate.subscriptions[0]?.status ?? null,
                    activationStatus: candidate.serviceRequests[0]?.activationStatus ?? null,
                    handoffStatus: candidate.activationHandoffs[0]?.status ?? null,
                  }).replaceAll('_', ' ')} />
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> Resume</CardTitle></CardHeader>
                <CardContent className="text-sm text-vvisa-text-secondary">
                  <p className="text-base font-semibold text-foreground">{candidate.resumes.length ? `${candidate.resumes.length} upload(s) received` : 'No resume uploaded yet'}</p>
                  <p className="mt-2 leading-6">Resume files remain private and are used for internal service review.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
              <CardHeader><CardTitle className="flex items-center gap-2"><Globe2 className="size-5 text-primary" /> Current preferences</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm text-vvisa-text-secondary md:grid-cols-2">
                <InfoTile label="Region" value={candidate.preferences?.targetRegion ?? '-'} />
                <InfoTile label="Roles" value={Array.isArray(candidate.preferences?.targetRoles) ? candidate.preferences.targetRoles.join(', ') : '-'} />
                <InfoTile label="Sponsorship" value={candidate.preferences?.sponsorshipRequired === true ? 'Required' : candidate.preferences?.sponsorshipRequired === false ? 'Not required' : '-'} />
                <InfoTile label="Relocation" value={candidate.preferences?.relocationRequired === true ? 'Required' : candidate.preferences?.relocationRequired === false ? 'Not required' : '-'} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
              <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Payment readiness</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm text-vvisa-text-secondary md:grid-cols-3">
                <InfoTile label="Intent" value={candidate.paymentIntents[0]?.status ?? 'draft'} />
                <InfoTile label="Currency" value={candidate.paymentIntents[0]?.currency ?? '-'} />
                <InfoTile label="Amount" value={candidate.paymentIntents[0] ? String(candidate.paymentIntents[0].amountMinor / 100) : '-'} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-5 text-primary" /> Recent updates</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {candidate.statusEvents.length ? candidate.statusEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-4">
                    <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4 text-primary" /> {event.label}</p>
                    <p className="text-vvisa-text-muted">{event.detail ?? 'No details'}</p>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-vvisa-border-subtle p-4 text-vvisa-text-muted">No visible status updates yet.</div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-vvisa-surface-2 px-3 py-2">
      <span>{label}</span>
      <Badge variant="outline" className="max-w-[12rem] truncate">{value}</Badge>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-vvisa-text-muted">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}
