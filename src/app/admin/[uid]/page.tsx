import { notFound } from 'next/navigation';
import AdminPartnerProfilePage from '@/app/admin/partners/[uid]/page';
import { requireAdmin } from '@/server/admin/auth';
import { getPartnerAdminProfile } from '@/server/admin/data';

export default async function AdminUidPage({ params }: { params: Promise<{ uid: string }> }) {
  await requireAdmin('partner.read');
  const { uid } = await params;
  const partner = await getPartnerAdminProfile(uid);
  if (!partner) notFound();
  return <AdminPartnerProfilePage params={Promise.resolve({ uid })} />;
}
