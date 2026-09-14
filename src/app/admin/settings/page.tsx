import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-semibold">System Settings</h2><p className="text-sm text-vvisa-text-muted">Restricted operational configuration and system diagnostics.</p></div>
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-5" /> Feature flags</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-vvisa-text-secondary">View server-side admin write controls. Super-admin access only.</p>
          <Button asChild variant="outline"><Link href="/admin/system-settings/feature-flags">Open</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
