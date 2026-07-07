import { NextResponse } from 'next/server';
import { adminWritesEnabled, getAdminSession } from '@/server/admin/auth';
import { apiError } from '@/lib/api-response';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return apiError('FORBIDDEN', 'You do not have permission to access the VVisa Admin Console.', 403);

  return NextResponse.json({
    user: { id: admin.user.id, email: admin.user.email, name: admin.user.name },
    role: admin.role,
    permissions: admin.permissions,
    writesEnabled: adminWritesEnabled(),
  });
}
