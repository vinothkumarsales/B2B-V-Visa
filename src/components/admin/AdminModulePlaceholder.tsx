import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminWritesEnabled, getAdminSession } from '@/server/admin/auth';
import { getAdminOverview } from '@/server/admin/data';

const firstPhaseItems = [
  'Partner profile edits',
  'Country and visa product drafts',
  'Service and checklist drafts',
  'Draft price changes and previews',
  'Dashboard content drafts',
];

const disabledItems = [
  'Wallet credits and debits',
  'Deleting users or records',
  'Admin role changes',
  'Application submission on behalf',
  'External supplier or embassy submission',
  'Unrestricted impersonation',
];

export async function AdminModulePlaceholder({ title }: { title: string }) {
  const [admin, overview] = await Promise.all([
    getAdminSession(),
    getAdminOverview(),
  ]);
  const writesEnabled = adminWritesEnabled();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-vvisa-text-muted">Read-only production controls and operating data.</p>
      </div>

      {!writesEnabled && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Admin write operations are currently disabled in production.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>Administrator</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-vvisa-text-muted">Email</p>
            <p className="font-medium">{admin?.user.email ?? 'Unknown'}</p>
            <p className="text-vvisa-text-muted">Role</p>
            <Badge variant="outline">{admin?.role.replace('_', ' ') ?? 'none'}</Badge>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>Write Status</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge className={writesEnabled ? 'bg-green-600 text-white hover:bg-green-600' : 'bg-zinc-700 text-white hover:bg-zinc-700'}>
              {writesEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <p className="text-vvisa-text-secondary">
              Mutations still require server-side permission, validation, confirmation, and audit logging.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>Permissions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(admin?.permissions ?? []).map((permission) => (
              <Badge key={permission} variant="outline" className="rounded-md">
                {permission}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Partners', overview.totalPartners],
          ['Applications', overview.totalApplications],
          ['Countries', overview.countriesPublished],
          ['Visa Products', overview.visaProductsPublished],
          ['Pending Drafts', overview.draftChanges],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-lg border-vvisa-border-subtle">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{Number(value).toLocaleString('en-IN')}</p></CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>Safe First Phase</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-vvisa-text-secondary">
            {firstPhaseItems.map((item) => <p key={item}>{item}</p>)}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>Still Disabled</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-vvisa-text-secondary">
            {disabledItems.map((item) => <p key={item}>{item}</p>)}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Recent Audit Events</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {overview.recentAuditLogs.map((event) => (
            <div key={event.id} className="rounded-md border border-vvisa-border-subtle p-3 text-sm">
              <p className="font-medium">{event.action}</p>
              <p className="text-xs text-vvisa-text-muted">
                {event.actorUser?.email ?? 'system'} - {event.resourceType}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
