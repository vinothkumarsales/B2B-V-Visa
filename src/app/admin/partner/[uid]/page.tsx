import AdminPartnerProfilePage from '@/app/admin/partners/[uid]/page';

export default async function AdminPartnerEditAliasPage({ params }: { params: Promise<{ uid: string }> }) {
  return <AdminPartnerProfilePage params={params} />;
}
