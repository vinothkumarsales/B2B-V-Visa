import { getAdminOverview } from '@/server/admin/data';
import { AdminOverviewClient } from '@/components/admin/AdminOverviewClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Overview' };

export default async function AdminOverviewPage() {
  const data = await getAdminOverview();
  return <AdminOverviewClient data={data} />;
}
