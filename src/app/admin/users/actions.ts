'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function toggleUserStatus(userId: string, isActive: boolean) {
  try {
    await db.user.update({
      where: { id: userId },
      data: { isActive },
    });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to toggle user status:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAgencyVisaCategories(agencyId: string, disabledCategories: string[]) {
  try {
    await db.agency.update({
      where: { id: agencyId },
      data: { disabledVisaCategories: JSON.stringify(disabledCategories) },
    });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update visa categories:', error);
    return { success: false, error: error.message };
  }
}
