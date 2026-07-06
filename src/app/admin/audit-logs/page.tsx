import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function AdminAuditLogsPage() {
  const auditLogs = await db.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { actorUser: true, agency: true },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <p className="text-sm text-vvisa-text-muted">Immutable operational history for sensitive admin and portal actions.</p>
      </div>
      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader><CardTitle>Recent Events</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Partner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.createdAt.toLocaleString('en-IN')}</TableCell>
                  <TableCell><Badge variant="outline">{event.action}</Badge></TableCell>
                  <TableCell>{event.actorUser?.email ?? 'system'}</TableCell>
                  <TableCell>{event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ''}</TableCell>
                  <TableCell>{event.agency?.name ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
