import { notFound, redirect } from 'next/navigation';
import AdminPartnerProfilePage from '@/app/admin/partners/[uid]/page';
import { getAdminSession } from '@/server/admin/auth';
import { getPartnerAdminProfile } from '@/server/admin/data';

export default async function AdminUidPage({ params }: { params: Promise<{ uid: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/login');
  if (!admin.permissions.includes('partner.read')) redirect('/admin');
  const { uid } = await params;
  const partner = await getPartnerAdminProfile(uid);
  if (!partner) notFound();
  return <AdminPartnerProfilePage params={Promise.resolve({ uid })} />;
}
