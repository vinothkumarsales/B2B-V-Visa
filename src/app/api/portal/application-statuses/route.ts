import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET() { const statuses = await db.applicationStatusConfig.findMany({ where: { isActive: true, isPartnerVisible: true }, orderBy: { displayOrder: 'asc' }, select: { code: true, partnerLabel: true, partnerDescription: true, colorToken: true, progressPercent: true } }); return NextResponse.json({ statuses }); }
