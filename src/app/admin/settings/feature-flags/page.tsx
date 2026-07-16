import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminSession } from '@/server/admin/auth';
import { adminFeatureSnapshot } from '@/server/admin/feature-flags';

export default async function AdminFeatureFlagsPage() {
  const admin = await getAdminSession();
  if (!admin || admin.role !== 'super_admin') notFound();
  const flags = adminFeatureSnapshot();

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-semibold">Feature Flags</h2><p className="text-sm text-vvisa-text-muted">Read-only production controls resolved on the server.</p></div>
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Admin write controls</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(flags).map(([flag, enabled]) => (
            <div key={flag} className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-vvisa-border-subtle p-3 text-xs">
              <span>{flag.replace('ADMIN_', '').replaceAll('_', ' ')}</span>
              <Badge variant={enabled ? 'default' : 'outline'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
