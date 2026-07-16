import { VisaPageEditorWorkspace } from '@/components/admin/VisaPageEditorWorkspace';
import { getCatalogueWorkspaceData } from '@/server/admin/catalogue-page-data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getCatalogueWorkspaceData();
  return <VisaPageEditorWorkspace countries={data.countries} products={data.products} />;
}
