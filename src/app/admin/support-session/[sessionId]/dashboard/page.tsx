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
import { getPartnerAdminProfile } from '@/server/admin/data';
import { PartnerApplicationDraftForm, PartnerDocumentUploadForm } from '@/components/admin/PartnerOperationsPanel';
import { AdminApplicationSubmitButton } from '@/components/admin/AdminApplicationSubmitButton';
import { ApplicationStatusAction, PartnerAdminNoteForm, PartnerProfileForm } from '@/components/admin/PartnerControlForms';

export default async function SupportSessionDashboardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/login');
  const { sessionId } = await params;
  const session = await db.adminImpersonationSession.findFirst({ where: { id: sessionId, actorAdminUid: admin.user.id }, include: { subjectAgency: true } });
  if (!session) notFound();
  if (session.status !== 'active' || session.expiresAt <= new Date()) redirect(`/admin/partners/${session.subjectAgencyId}`);
  const [preview, partner, products] = await Promise.all([
    getPartnerDashboardPreview(session.subjectAgencyId),
    getPartnerAdminProfile(session.subjectAgencyId),
    db.visaProduct.findMany({ where: { isActive: true }, orderBy: [{ destination: 'asc' }, { name: 'asc' }], take: 100 }),
  ]);
  if (!preview || !partner) notFound();
  const owner = partner.memberships[0]?.user;
  const canSupportWrite = session.mode === 'support' || session.mode === 'operations';
  const canOperate = session.mode === 'operations';

  return (
    <div className="space-y-5">
      <section className="sticky top-16 z-20 flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-50 p-4 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><p className="font-semibold">ADMIN SUPPORT SESSION</p><p className="text-sm">Viewing: {session.subjectAgency.name} - UID: {session.subjectAgencyId}</p><p className="text-xs">Mode: {session.mode.replace('_', ' ')} - Admin: {session.actorAdminEmail} - Expires {session.expiresAt.toLocaleTimeString('en-IN')}</p></div></div>
        <EndSupportSessionButton sessionId={session.id} />
      </section>
      <div><h2 className="text-xl font-semibold">Partner Dashboard</h2><p className="text-sm text-vvisa-text-muted">Read-only operational view. Partner authentication has not been replaced.</p></div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Agency</CardTitle></CardHeader><CardContent><p className="font-semibold">{preview.agency.name}</p><p className="text-xs text-vvisa-text-muted">{preview.agency.email}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Applications</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{preview.stats.totalApplications}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payment pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{preview.stats.pendingPayment}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Wallet balance</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatMoneyFromMinor(preview.stats.walletBalanceMinor)}</p></CardContent></Card>
      </section>
      <Card>
        <CardHeader><CardTitle>Recent applications</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {partner.applications.map((application) => {
            const applicant = application.applicants[0];
            const applicantName = applicant ? `${applicant.firstName} ${applicant.lastName}`.trim() : 'Applicant pending';
            return (
              <div key={application.id} className="flex flex-col gap-3 rounded-md border border-vvisa-border-subtle p-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium">{application.destination} - {application.visaType}</p>
                  <p className="text-xs text-vvisa-text-muted">{applicantName} - {application.documents.length} document(s) - {formatMoneyFromMinor(application.totalAmountMinor, application.currency)}</p>
                  <p className="font-mono text-xs text-vvisa-text-muted">{application.id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{statusLabel(application.status)}</Badge>
                  {canOperate && application.status === 'DRAFT' && (
                    <AdminApplicationSubmitButton
                      supportSessionId={session.id}
                      application={{
                        id: application.id,
                        agencyName: partner.name,
                        partnerUid: partner.id,
                        applicantName,
                        destination: application.destination,
                        visaType: application.visaType,
                        documents: application.documents.length,
                        currency: application.currency,
                        totalAmountMinor: application.totalAmountMinor,
                      }}
                    />
                  )}
                  {canOperate && !['DRAFT', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status) && (
                    <ApplicationStatusAction id={application.id} current={application.status} supportSessionId={session.id} />
                  )}
                </div>
              </div>
            );
          })}
          {partner.applications.length === 0 && <p className="text-sm text-vvisa-text-muted">No applications found.</p>}
        </CardContent>
      </Card>
      {canSupportWrite && <section className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Partner profile</CardTitle></CardHeader><CardContent><PartnerProfileForm partnerUid={partner.id} supportSessionId={session.id} enabled profile={{name:partner.name,ownerName:owner?.name??'',email:partner.email,phone:partner.phone??'',whatsapp:partner.whatsapp??'',addressLine1:partner.addressLine1??'',addressLine2:partner.addressLine2??'',city:partner.city??'',state:partner.state??'',country:partner.country,zipCode:partner.zipCode??'',gstNumber:partner.gstNumber??'',panCard:partner.panCard??'',status:partner.status,kycStatus:partner.verification?.status??'DRAFT',partnerTier:partner.partnerTier??'',pricingPlan:partner.pricingPlan??'',accountManager:partner.accountManager??''}}/></CardContent></Card><div className="space-y-4"><Card><CardHeader><CardTitle>Upload document</CardTitle></CardHeader><CardContent><PartnerDocumentUploadForm partnerUid={partner.id} supportSessionId={session.id} applications={partner.applications.map(application=>({id:application.id,destination:application.destination,visaType:application.visaType}))}/></CardContent></Card><Card><CardHeader><CardTitle>Support note</CardTitle></CardHeader><CardContent><PartnerAdminNoteForm partnerUid={partner.id} supportSessionId={session.id}/></CardContent></Card></div></section>}
      {canOperate && <Card><CardHeader><CardTitle>Create application on behalf</CardTitle></CardHeader><CardContent><PartnerApplicationDraftForm partnerUid={partner.id} supportSessionId={session.id} products={products.map(product=>({id:product.id,destination:product.destination,name:product.name,currency:product.currency,amountMinor:product.amountMinor}))}/></CardContent></Card>}
    </div>
  );
}

