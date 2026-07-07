import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { adminFeatureSnapshot } from '@/server/admin/feature-flags';
import { getApplicationStatusReadModel } from '@/server/admin/read-preview';

export default async function ApplicationStatusesPage() {
  const [readModel, flags] = await Promise.all([getApplicationStatusReadModel(), Promise.resolve(adminFeatureSnapshot())]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Application Status Manager</h2>
        <p className="text-sm text-vvisa-text-muted">Central read-only status configuration for admin labels, partner labels, milestones, and transitions.</p>
      </div>

      {!flags.ADMIN_STATUS_WRITES_ENABLED && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Application status writes are disabled. Transition and publish controls are locked in Phase 1.
        </div>
      )}

      <section className="grid gap-3 xl:grid-cols-3">
        {readModel.milestones.map((milestone) => (
          <Card key={milestone.key} className="rounded-lg border-vvisa-border-subtle">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{milestone.label}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Progress value={milestone.progressPercent} />
              <p className="text-xs text-vvisa-text-muted">Progress {milestone.progressPercent}% - Order {milestone.displayOrder}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        {readModel.statuses.map((status) => (
          <Card key={status.code} className="rounded-lg border-vvisa-border-subtle">
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr_1fr_1fr] lg:items-center">
              <div>
                <p className="font-medium">{status.partnerLabel}</p>
                <p className="text-xs font-mono text-vvisa-text-muted">{status.code}</p>
                <p className="mt-1 text-xs text-vvisa-text-secondary">{status.partnerDescription ?? 'No partner description configured.'}</p>
              </div>
              <div className="text-sm">
                <p className="text-vvisa-text-muted">Admin label</p>
                <p>{status.adminLabel}</p>
              </div>
              <div className="space-y-2">
                <Progress value={status.progressPercent} />
                <p className="text-xs text-vvisa-text-muted">{status.progressPercent}% - {status.colorToken}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{status.isPartnerVisible ? 'Partner visible' : 'Partner hidden'}</Badge>
                <Badge variant="outline">{status.isTerminal ? 'Terminal' : 'In progress'}</Badge>
                {status.isSuccess && <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Success</Badge>}
                {status.isFailure && <Badge className="bg-red-600 text-white hover:bg-red-600">Failure</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Allowed Transitions</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {readModel.transitions.map((transition) => (
            <div key={transition.id} className="flex items-center gap-2 rounded-md border border-vvisa-border-subtle p-3 text-sm">
              <span>{transition.fromStatusCode.replaceAll('_', ' ')}</span>
              <ArrowRight className="size-4 text-vvisa-text-muted" />
              <span>{transition.toStatusCode.replaceAll('_', ' ')}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
