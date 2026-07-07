import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartnerDashboardPreview } from '@/server/admin/read-preview';
import { formatMoneyFromMinor } from '@/server/admin/data';
import { statusLabel } from '@/lib/status-config';

export default async function PartnerDashboardPreviewPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const preview = await getPartnerDashboardPreview(uid);
  if (!preview) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Partner Dashboard Preview</h2>
        <p className="text-sm text-vvisa-text-muted">
          Read-only preview scaffold for UID {preview.agency.id}. This uses the same account, wallet and application data as the partner portal.
        </p>
      </div>

      <div className="rounded-md border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
        Preview mode is read-only. Support sessions and application-on-behalf actions remain disabled in Phase 1.
      </div>

      <section className="grid gap-3 lg:grid-cols-4">
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Agency</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold">{preview.agency.name}</p>
            <p className="text-xs text-vvisa-text-muted">{preview.agency.email}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Applications</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{preview.stats.totalApplications}</p></CardContent>
        </Card>
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Payment</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{preview.stats.pendingPayment}</p></CardContent>
        </Card>
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Wallet</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatMoneyFromMinor(preview.stats.walletBalanceMinor)}</p></CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>Dashboard Sections</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {preview.sections.map((section) => (
              <div key={section.key} className="flex items-center justify-between rounded-md border border-vvisa-border-subtle p-3 text-sm">
                <div>
                  <p className="font-medium">{section.name}</p>
                  <p className="text-xs text-vvisa-text-muted">{section.type.replaceAll('_', ' ')} - order {section.displayOrder}</p>
                </div>
                <Badge variant="outline">{section.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader><CardTitle>Recent Applications</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {preview.applications.map((application) => (
              <div key={application.id} className="rounded-md border border-vvisa-border-subtle p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{application.destination} - {application.visaType}</p>
                    <p className="text-xs text-vvisa-text-muted">{application.applicants[0]?.firstName ?? 'Applicant'} {application.applicants[0]?.lastName ?? ''}</p>
                  </div>
                  <Badge variant="outline">{statusLabel(application.status)}</Badge>
                </div>
              </div>
            ))}
            {preview.applications.length === 0 && <p className="text-sm text-vvisa-text-muted">No applications found for this partner.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
