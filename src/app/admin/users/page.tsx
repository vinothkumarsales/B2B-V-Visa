import { db } from '@/lib/db';
import AdminUsersClient from './AdminUsersClient';

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          agency: {
            select: {
              id: true,
              name: true,
              disabledVisaCategories: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  const distinctCategories = await db.visaProduct.findMany({
    where: { isActive: true },
    distinct: ['category'],
    select: { category: true },
  });
  
  // Filter out any null or empty categories
  const availableCategories = distinctCategories
    .map(c => c.category)
    .filter((c): c is string => Boolean(c))
    .sort();

  return (
    <div className="p-6">
      <AdminUsersClient users={users} availableCategories={availableCategories} />
    </div>
  );
}
