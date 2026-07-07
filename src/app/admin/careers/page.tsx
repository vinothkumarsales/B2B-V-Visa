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
    </div>
  );
}
