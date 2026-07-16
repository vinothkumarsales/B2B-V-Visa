import Link from 'next/link';
import { AlertTriangle, Archive, FileText, Globe2, IndianRupee, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAdminOverview } from '@/server/admin/data';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const cards = [
  ['Total Travel Partners', 'totalPartners', Users],
  ['Active Partners', 'activePartners', Users],
  ['Pending Partner Approvals', 'pendingPartnerApprovals', AlertTriangle],
  ['Total Applications', 'totalApplications', Archive],
  ['Applications Submitted Today', 'applicationsSubmittedToday', Archive],
  ['Pending Payments', 'pendingPayments', IndianRupee],
  ['Documents Pending', 'documentsPending', FileText],
  ['Applications Requiring Attention', 'applicationsRequiringAttention', AlertTriangle],
  ['Approved This Month', 'approvedThisMonth', Archive],
  ['Rejected This Month', 'rejectedThisMonth', AlertTriangle],
  ['Countries Published', 'countriesPublished', Globe2],
  ['Visa Products Published', 'visaProductsPublished', Globe2],
  ['Draft Changes', 'draftChanges', FileText],
  ['Failed Integrations', 'failedIntegrations', AlertTriangle],
] as const;

export default async function AdminOverviewPage() {
  const [overview, databaseOk] = await Promise.all([
    getAdminOverview(),
    db.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ]);
  const readiness = [
    ['Database', databaseOk],
    ['Google Auth', Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)],
    ['Admin Auth', true],
    ['CRM Sync', overview.failedIntegrations === 0],
    ['Notification Queue', true],
    ['Dashboard Sync', overview.draftChanges !== null],
    ['Application Status Sync', true],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Overview</h2>
        <p className="text-sm text-vvisa-text-muted">Live operating snapshot from the B2B portal database.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, key, Icon]) => (
          <Card key={label} className="rounded-lg border-vvisa-border-subtle">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-vvisa-text-secondary">{label}</CardTitle>
              <Icon className="size-4 text-vvisa-text-muted" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{overview[key] === null ? <span className="text-sm font-medium text-vvisa-text-muted">Unable to load</span> : overview[key].toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>System Readiness</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {readiness.map(([label, ok]) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-vvisa-border-subtle p-3 text-sm">
                <span>{label}</span>
                <Badge className={ok ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-red-600 text-white hover:bg-red-600'}>
                  {ok ? 'Ready' : 'Needs attention'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>Partner lookup</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-vvisa-text-secondary">
            <p>Open a partner workspace using their UID, agency, owner, email, phone, application ID, or CRM record ID.</p>
            <Link href="/admin/partners" className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground">Search partners</Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-lg border-vvisa-border-subtle xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentApplications.map((application) => (
              <div key={application.id} className="flex items-center justify-between rounded-md border border-vvisa-border-subtle p-3">
                <div>
                  <Link href={`/admin/applications/${application.id}`} className="font-medium hover:text-primary">
                    {application.destination} · {application.visaType}
                  </Link>
                  <p className="text-xs text-vvisa-text-muted">{application.agency.name} · {application.id}</p>
                </div>
                <Badge variant="outline">{application.status.replaceAll('_', ' ')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader>
            <CardTitle>Recent Admin Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentAuditLogs.map((event) => (
              <div key={event.id} className="rounded-md border border-vvisa-border-subtle p-3">
                <p className="text-sm font-medium">{event.action}</p>
                <p className="text-xs text-vvisa-text-muted">
                  {event.actorUser?.email ?? 'system'} · {event.resourceType}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
