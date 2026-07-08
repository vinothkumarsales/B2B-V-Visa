import { db } from '@/lib/db';
import { careersFeatureSnapshot } from '@/server/careers/feature-flags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function AdminCareersPage() {
  const flags = careersFeatureSnapshot();
  const candidates = flags.CAREERS_INTERNAL_CONSOLE_ENABLED
    ? await db.careerCandidate.findMany({
        include: {
          serviceRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
          resumes: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : [];
  const packages = flags.CAREERS_INTERNAL_CONSOLE_ENABLED && flags.CAREERS_PACKAGES_ENABLED
    ? await db.careerServicePackage.findMany({
        include: { prices: { where: { isActive: true }, orderBy: { currency: 'asc' } } },
        orderBy: { displayOrder: 'asc' },
      })
    : [];
  const webhookEvents = flags.CAREERS_INTERNAL_CONSOLE_ENABLED
    ? await db.careerPaymentWebhookEvent.findMany({
        orderBy: { receivedAt: 'desc' },
        take: 25,
      })
    : [];
  const subscriptions = flags.CAREERS_INTERNAL_CONSOLE_ENABLED
    ? await db.careerSubscription.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
      })
    : [];
  const activationHandoffs = flags.CAREERS_INTERNAL_CONSOLE_ENABLED
    ? await db.careerActivationHandoff.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
      })
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Careers Review Console</h2>
        <p className="text-sm text-vvisa-text-muted">Phase 1 shell for candidate onboarding visibility. Review actions arrive in later phases.</p>
      </div>
      {!flags.CAREERS_INTERNAL_CONSOLE_ENABLED && (
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardContent className="p-4 text-sm text-vvisa-text-secondary">
            Careers internal console is disabled. Set CAREERS_INTERNAL_CONSOLE_ENABLED=true to show candidate onboarding records.
          </CardContent>
        </Card>
      )}
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Package catalogue</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Public</TableHead>
                <TableHead>Prices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-vvisa-text-muted">{item.code.replaceAll('_', ' ')}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                  <TableCell>{item.isPublic ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{item.prices.map((price) => `${price.currency} ${price.amountMinor / 100}`).join(', ') || '-'}</TableCell>
                </TableRow>
              ))}
              {packages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-vvisa-text-muted">
                    Careers package visibility is disabled or no package rows are available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Candidate queue</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Resume</TableHead>
                <TableHead>Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <div className="font-medium">{candidate.fullName}</div>
                    <div className="text-xs text-vvisa-text-muted">{candidate.email}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{candidate.status.replaceAll('_', ' ')}</Badge></TableCell>
                  <TableCell>{candidate.serviceRequests[0]?.packageCode.replaceAll('_', ' ') ?? '-'}</TableCell>
                  <TableCell>{candidate.resumes[0] ? `v${candidate.resumes[0].version}` : '-'}</TableCell>
                  <TableCell>{candidate.profileCompletionPercent}%</TableCell>
                </TableRow>
              ))}
              {candidates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-vvisa-text-muted">No careers candidates to show.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Payment webhook events</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Payment intent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Failure</TableHead>
                <TableHead>Duplicate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhookEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.provider}</TableCell>
                  <TableCell>{event.eventType.replaceAll('_', ' ')}</TableCell>
                  <TableCell className="font-mono text-xs">{event.paymentIntentId ?? '-'}</TableCell>
                  <TableCell><Badge variant="outline">{event.processingStatus}</Badge></TableCell>
                  <TableCell>{event.signatureVerified ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{event.receivedAt.toISOString()}</TableCell>
                  <TableCell>{event.failureCode ?? '-'}</TableCell>
                  <TableCell>{event.duplicate ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
              {webhookEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-vvisa-text-muted">No Careers payment webhook events to show.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment intent</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Activated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="font-mono text-xs">{subscription.id}</TableCell>
                  <TableCell><Badge variant="outline">{subscription.status}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{subscription.paymentIntentId ?? '-'}</TableCell>
                  <TableCell>{subscription.packageCode.replaceAll('_', ' ')}</TableCell>
                  <TableCell>{subscription.activatedAt?.toISOString() ?? '-'}</TableCell>
                </TableRow>
              ))}
              {subscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-vvisa-text-muted">No Careers subscriptions to show.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Activation handoffs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Handoff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment intent</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activationHandoffs.map((handoff) => (
                <TableRow key={handoff.id}>
                  <TableCell className="font-mono text-xs">{handoff.id}</TableCell>
                  <TableCell><Badge variant="outline">{handoff.status}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{handoff.paymentIntentId}</TableCell>
                  <TableCell className="font-mono text-xs">{handoff.subscriptionId}</TableCell>
                  <TableCell>{handoff.attemptCount}</TableCell>
                  <TableCell>{handoff.createdAt.toISOString()}</TableCell>
                </TableRow>
              ))}
              {activationHandoffs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-vvisa-text-muted">No Careers activation handoffs to show.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
