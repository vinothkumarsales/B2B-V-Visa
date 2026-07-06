import Link from 'next/link';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoneyFromMinor, searchPartners, walletBalanceMinor } from '@/server/admin/data';

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; uid?: string }>;
}) {
  const params = await searchParams;
  const query = params.uid || params.q;
  const partners = await searchPartners(query);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Partners</h2>
        <p className="text-sm text-vvisa-text-muted">Search by UID, agency, owner email, phone, CRM record, GST, city, or status.</p>
      </div>

      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader>
          <CardTitle>Open by UID</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" action="/admin/partners">
            <Input name="uid" placeholder="Paste Firebase UID or portal agency UID" defaultValue={params.uid ?? ''} />
            <Button type="submit">
              <Search className="mr-2 size-4" />
              Retrieve Account
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-vvisa-border-subtle">
        <CardHeader>
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" action="/admin/partners">
            <Input name="q" placeholder="Search partners" defaultValue={params.q ?? ''} />
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>UID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => {
                const owner = partner.memberships[0]?.user;
                const balance = partner.wallets.reduce((sum, wallet) => sum + walletBalanceMinor(wallet.entries), 0);
                return (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}<div className="text-xs text-vvisa-text-muted">{partner.email}</div></TableCell>
                    <TableCell>{owner?.name ?? 'Unassigned'}<div className="text-xs text-vvisa-text-muted">{owner?.email ?? '-'}</div></TableCell>
                    <TableCell>{partner.phone ?? '-'}</TableCell>
                    <TableCell className="max-w-56 truncate font-mono text-xs">{partner.id}</TableCell>
                    <TableCell><Badge variant="outline">{partner.status.replaceAll('_', ' ')}</Badge></TableCell>
                    <TableCell>{formatMoneyFromMinor(balance)}</TableCell>
                    <TableCell>{partner.applications.length}</TableCell>
                    <TableCell>{partner.createdAt.toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/partners/${partner.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
