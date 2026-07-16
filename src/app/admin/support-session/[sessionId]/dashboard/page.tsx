import { notFound, redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EndSupportSessionButton } from '@/components/admin/EndSupportSessionButton';
import { db } from '@/lib/db';
import { statusLabel } from '@/lib/status-config';
import { getAdminSession } from '@/server/admin/auth';
import { formatMoneyFromMinor } from '@/server/admin/data';
import { getPartnerDashboardPreview } from '@/server/admin/read-preview';

export default async function SupportSessionDashboardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/login');
  const { sessionId } = await params;
  const session = await db.adminImpersonationSession.findFirst({ where: { id: sessionId, actorAdminUid: admin.user.id }, include: { subjectAgency: true } });
  if (!session) notFound();
  if (session.status !== 'active' || session.expiresAt <= new Date()) redirect(`/admin/partners/${session.subjectAgencyId}`);
  const preview = await getPartnerDashboardPreview(session.subjectAgencyId);
  if (!preview) notFound();

  return (
    <div className="space-y-5">
      <section className="sticky top-16 z-20 flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-50 p-4 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><p className="font-semibold">ADMIN SUPPORT SESSION</p><p className="text-sm">Viewing: {session.subjectAgency.name} · UID: {session.subjectAgencyId}</p><p className="text-xs">Mode: {session.mode.replace('_', ' ')} · Admin: {session.actorAdminEmail} · Expires {session.expiresAt.toLocaleTimeString('en-IN')}</p></div></div>
        <EndSupportSessionButton sessionId={session.id} />
      </section>
      <div><h2 className="text-xl font-semibold">Partner Dashboard</h2><p className="text-sm text-vvisa-text-muted">Read-only operational view. Partner authentication has not been replaced.</p></div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Agency</CardTitle></CardHeader><CardContent><p className="font-semibold">{preview.agency.name}</p><p className="text-xs text-vvisa-text-muted">{preview.agency.email}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Applications</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{preview.stats.totalApplications}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payment pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{preview.stats.pendingPayment}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Wallet balance</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatMoneyFromMinor(preview.stats.walletBalanceMinor)}</p></CardContent></Card>
      </section>
      <Card><CardHeader><CardTitle>Recent applications</CardTitle></CardHeader><CardContent className="space-y-2">{preview.applications.map((application) => <div key={application.id} className="flex items-center justify-between rounded-md border border-vvisa-border-subtle p-3"><div><p className="text-sm font-medium">{application.destination} · {application.visaType}</p><p className="font-mono text-xs text-vvisa-text-muted">{application.id}</p></div><Badge variant="outline">{statusLabel(application.status)}</Badge></div>)}{preview.applications.length === 0 && <p className="text-sm text-vvisa-text-muted">No applications found.</p>}</CardContent></Card>
    </div>
  );
}
