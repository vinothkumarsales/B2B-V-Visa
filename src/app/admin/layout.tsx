import { AdminShell } from '@/components/admin/AdminShell';
import { adminWritesEnabled, getAdminSession } from '@/server/admin/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vvisa-surface-2 p-4">
        <Card className="max-w-md rounded-lg border-vvisa-border-subtle">
          <CardHeader>
            <CardTitle>403 - Access denied</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-vvisa-text-secondary">
            You do not have permission to access the VVisa Admin Console.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminShell admin={{ email: admin.user.email, role: admin.role, writesEnabled: adminWritesEnabled() }}>
      {children}
    </AdminShell>
  );
}
