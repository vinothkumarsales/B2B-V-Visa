import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getPartnerAdminProfile, formatMoneyFromMinor, walletBalanceMinor } from '@/server/admin/data';
import { db } from '@/lib/db';
import { createPartnerPriceOverride } from './actions';
import { PartnerSupportSessionLauncher } from '@/components/admin/PartnerSupportSessionLauncher';
import { PartnerApplicationDraftForm, PartnerDocumentUploadForm } from '@/components/admin/PartnerOperationsPanel';
import { AdminApplicationSubmitButton } from '@/components/admin/AdminApplicationSubmitButton';
import { adminFeatureSnapshot } from '@/server/admin/feature-flags';
import { ApplicationStatusAction, DocumentActions, PartnerAdminNoteForm, PartnerProfileForm } from '@/components/admin/PartnerControlForms';

export default async function AdminPartnerProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const partner = await getPartnerAdminProfile(uid);
  if (!partner) notFound();

  const products = await db.visaProduct.findMany({
    where: { isActive: true },
    take: 100,
    orderBy: [{ destination: 'asc' }, { name: 'asc' }],
  });
  const balance = partner.wallets.reduce((sum, wallet) => sum + walletBalanceMinor(wallet.entries), 0);
  const owner = partner.memberships[0]?.user;
  const flags = adminFeatureSnapshot();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{partner.name}</h2>
          <p className="font-mono text-xs text-vvisa-text-muted">UID: {partner.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{partner.status.replaceAll('_', ' ')}</Badge>
          <Button asChild variant="outline"><Link href={`/admin/partners/${partner.id}/dashboard-preview`}>Dashboard Preview</Link></Button>
          <Button asChild><Link href={`/admin/${partner.id}`}>Open Partner Dashboard</Link></Button>
          <PartnerSupportSessionLauncher partnerUid={partner.id} agencyName={partner.name} />
          <Button asChild><Link href="#create-application">Create Application</Link></Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {['overview', 'profile', 'dashboard preview', 'applications', 'create application', 'wallet', 'documents', 'pricing', 'services', 'activity', 'admin notes'].map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">{tab}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-lg border-vvisa-border-subtle">
            <CardHeader><CardTitle>Partner</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-vvisa-text-muted">Email:</span> {partner.email}</p>
              <p><span className="text-vvisa-text-muted">Phone:</span> {partner.phone ?? '-'}</p>
              <p><span className="text-vvisa-text-muted">Owner:</span> {owner?.name ?? 'Unassigned'}</p>
              <p><span className="text-vvisa-text-muted">City:</span> {partner.city ?? '-'}</p>
              <p><span className="text-vvisa-text-muted">CRM:</span> {partner.zohoRecordId ?? '-'}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-vvisa-border-subtle">
            <CardHeader><CardTitle>Wallet</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatMoneyFromMinor(balance)}</p>
              <p className="text-sm text-vvisa-text-muted">{partner.wallets.length} wallet account(s)</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-vvisa-border-subtle">
            <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{partner.applications.length}</p>
              <p className="text-sm text-vvisa-text-muted">Recent applications loaded below</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="rounded-lg border-vvisa-border-subtle">
            <CardHeader><CardTitle>Partner Information</CardTitle></CardHeader>
            <CardContent><PartnerProfileForm partnerUid={partner.id} enabled={flags.ADMIN_PARTNER_WRITES_ENABLED} profile={{name:partner.name,ownerName:owner?.name??'',email:partner.email,phone:partner.phone??'',whatsapp:partner.whatsapp??'',addressLine1:partner.addressLine1??'',addressLine2:partner.addressLine2??'',city:partner.city??'',state:partner.state??'',country:partner.country,zipCode:partner.zipCode??'',gstNumber:partner.gstNumber??'',panCard:partner.panCard??'',status:partner.status,kycStatus:partner.verification?.status??'DRAFT',partnerTier:partner.partnerTier??'',pricingPlan:partner.pricingPlan??'',accountManager:partner.accountManager??''}} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard preview">
          <Card className="rounded-lg border-vvisa-border-subtle"><CardContent className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">Partner dashboard</p><p className="text-sm text-vvisa-text-muted">Inspect the dashboard using live partner account data.</p></div><Button asChild variant="outline"><Link href={`/admin/partners/${partner.id}/dashboard-preview`}>Open Preview</Link></Button></CardContent></Card>
        </TabsContent>

        <TabsContent value="create application" id="create-application">
          <Card className="rounded-lg border-vvisa-border-subtle"><CardHeader><CardTitle>Create Application on Behalf</CardTitle></CardHeader><CardContent>{flags.ADMIN_APPLICATION_ON_BEHALF_ENABLED ? <PartnerApplicationDraftForm partnerUid={partner.id} products={products.map(product=>({id:product.id,destination:product.destination,name:product.name,currency:product.currency,amountMinor:product.amountMinor}))}/> : <p className="text-sm text-vvisa-text-muted">Application-on-behalf is disabled by the server feature flag.</p>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="pricing" className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <Card className="rounded-lg border-vvisa-border-subtle">
            <CardHeader><CardTitle>Partner Price Overrides</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {partner.priceOverrides.map((override) => (
                <div key={override.id} className="rounded-md border border-vvisa-border-subtle p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{override.product?.name ?? override.countryCode ?? 'Partner-wide rule'}</p>
                      <p className="text-xs text-vvisa-text-muted">{override.overrideType} · {formatMoneyFromMinor(override.valueMinor)}</p>
                    </div>
                    <Badge variant="outline">{override.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-vvisa-text-secondary">{override.reason}</p>
                </div>
              ))}
              {partner.priceOverrides.length === 0 && <p className="text-sm text-vvisa-text-muted">No partner-specific overrides yet.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-vvisa-border-subtle">
            <CardHeader><CardTitle>Create UID Price Override</CardTitle></CardHeader>
            <CardContent>
              <form action={createPartnerPriceOverride} className="space-y-3">
                <input type="hidden" name="partnerUid" value={partner.id} />
                <div className="space-y-1.5">
                  <Label>Visa product</Label>
                  <Select name="productId">
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.destination} · {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Override type</Label>
                  <Select name="overrideType" defaultValue="exact_price">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact_price">Set exact price</SelectItem>
                      <SelectItem value="fixed_increase">Add fixed markup</SelectItem>
                      <SelectItem value="fixed_decrease">Reduce by fixed amount</SelectItem>
                      <SelectItem value="percentage_increase">Add percentage</SelectItem>
                      <SelectItem value="percentage_decrease">Reduce percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input name="value" type="number" min="0" step="0.01" placeholder="INR amount or percentage value" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select name="status" defaultValue="draft">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Textarea name="reason" minLength={8} placeholder="Required audit reason" required />
                </div>
                <Button type="submit" className="w-full" disabled>Save Override</Button>
              </form>
              <p className="mt-3 text-xs text-vvisa-text-muted">
                Pricing writes are blocked while ADMIN_WRITES_ENABLED is false.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-3">
          {partner.applications.map((application) => (
            <Card key={application.id} className="rounded-lg border-vvisa-border-subtle">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{application.destination} · {application.visaType}</p>
                  <p className="text-xs text-vvisa-text-muted">{application.id} · {application.createdAt.toLocaleDateString('en-IN')}</p>
                </div>
                <ApplicationStatusAction id={application.id} current={application.status} />
                {application.status === 'DRAFT' && application.createdByAdminUid && <AdminApplicationSubmitButton application={{ id: application.id, agencyName: partner.name, partnerUid: partner.id, applicantName: `${application.applicants[0]?.firstName ?? ''} ${application.applicants[0]?.lastName ?? ''}`.trim(), destination: application.destination, visaType: application.visaType, documents: application.documents.length, currency: application.currency, totalAmountMinor: application.totalAmountMinor }} />}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="wallet">
          <Card className="rounded-lg border-vvisa-border-subtle">
            <CardHeader><CardTitle>Wallet Ledger</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {partner.wallets.flatMap((wallet) => wallet.entries).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-md border border-vvisa-border-subtle p-3">
                  <div><p className="font-medium">{entry.type.replaceAll('_', ' ')}</p><p className="text-xs text-vvisa-text-muted">{entry.description ?? entry.id}</p></div>
                  <p className="font-semibold">{formatMoneyFromMinor(entry.amountMinor)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4"><Card className="rounded-lg border-vvisa-border-subtle"><CardHeader><CardTitle>Partner Documents</CardTitle></CardHeader><CardContent className="space-y-3">{partner.documents.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-vvisa-border-subtle p-3"><div><p className="text-sm font-medium">{document.fileName}</p><p className="text-xs text-vvisa-text-muted">{document.documentType} · {document.createdAt.toLocaleDateString('en-IN')}</p><Badge variant="outline">{document.status.replaceAll('_', ' ')}</Badge></div><DocumentActions id={document.id}/></div>)}{partner.documents.length === 0 && <p className="text-sm text-vvisa-text-muted">No uploaded documents.</p>}</CardContent></Card>{flags.ADMIN_DOCUMENT_WRITES_ENABLED && <Card><CardHeader><CardTitle>Upload on Behalf</CardTitle></CardHeader><CardContent><PartnerDocumentUploadForm partnerUid={partner.id} applications={partner.applications.map(application=>({id:application.id,destination:application.destination,visaType:application.visaType}))}/></CardContent></Card>}</TabsContent>
        <TabsContent value="services"><Card className="rounded-lg border-vvisa-border-subtle"><CardContent className="p-4 text-sm text-vvisa-text-muted">Partner service assignments are read-only in this phase.</CardContent></Card></TabsContent>
        <TabsContent value="activity"><Card className="rounded-lg border-vvisa-border-subtle"><CardContent className="p-4 text-sm text-vvisa-text-muted">Recent audit records: {partner.auditLogs.length}</CardContent></Card></TabsContent>
        <TabsContent value="admin notes" className="space-y-4"><Card className="rounded-lg border-vvisa-border-subtle"><CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader><CardContent className="space-y-3">{partner.adminNotes.map(note=><div key={note.id} className="rounded-md border p-3"><p className="text-sm">{note.note}</p><p className="mt-1 text-xs text-vvisa-text-muted">{note.authorEmail} · {note.createdAt.toLocaleString('en-IN')}</p></div>)}{partner.adminNotes.length===0&&<p className="text-sm text-vvisa-text-muted">No admin notes.</p>}</CardContent></Card>{flags.ADMIN_PARTNER_WRITES_ENABLED&&<Card><CardHeader><CardTitle>Add Note</CardTitle></CardHeader><CardContent><PartnerAdminNoteForm partnerUid={partner.id}/></CardContent></Card>}</TabsContent>
      </Tabs>
    </div>
  );
}
