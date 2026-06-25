import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { mockApplications } from '@/lib/mock-data';
import { generateApplicationId, generateGroupId, generateTransactionId } from '@/lib/transaction-id';
import { requireAgencyMembership } from '@/server/auth/session';
import {
  createApplicationSchema,
  createIndividualApplication,
} from '@/server/applications/create-application';

const listSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  destination: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = listSchema.safeParse(params);
  if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid list parameters', 400);

  const { search = '', status = '', destination = '', page, limit } = parsed.data;

  if (isDemoMode) {
    let filtered = [...mockApplications];
    if (search) {
      const lowered = search.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.groupName?.toLowerCase().includes(lowered) ||
          app.travelers.some(
            (t) =>
              t.firstName.toLowerCase().includes(lowered) ||
              t.lastName.toLowerCase().includes(lowered) ||
              t.passportNumber.toLowerCase().includes(lowered)
          )
      );
    }
    if (status) filtered = filtered.filter((app) => app.status === status);
    if (destination) {
      filtered = filtered.filter((app) =>
        app.destination.toLowerCase().includes(destination.toLowerCase())
      );
    }

    const start = (page - 1) * limit;
    return NextResponse.json({
      applications: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
      mode: 'demo',
    });
  }

  const session = await requireAgencyMembership();
  const where = {
    agencyId: session.agencyId,
    ...(status ? { status: status as never } : {}),
    ...(destination ? { destination: { contains: destination, mode: 'insensitive' as const } } : {}),
    ...(search
      ? {
          OR: [
            { internalId: { contains: search, mode: 'insensitive' as const } },
            { applicants: { some: { passportNumber: { contains: search, mode: 'insensitive' as const } } } },
            { applicants: { some: { firstName: { contains: search, mode: 'insensitive' as const } } } },
            { applicants: { some: { lastName: { contains: search, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  };

  const [applications, total] = await Promise.all([
    db.visaApplication.findMany({
      where,
      include: { applicants: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.visaApplication.count({ where }),
  ]);

  return NextResponse.json({ applications, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    if (isDemoMode) {
      const body = await request.json();
      const appId = generateApplicationId(body.internalId);
      const groupId = body.groupName ? generateGroupId() : undefined;
      const transactionId = generateTransactionId();

      return NextResponse.json(
        {
          application: {
            id: appId,
            agencyId: 'agency-001',
            groupId,
            transactionId,
            internalId: body.internalId || '',
            groupName: body.groupName || '',
            destination: body.destination || '',
            visaType: body.visaType || '',
            visaCategory: body.visaCategory || 'STANDARD',
            status: 'DRAFT',
            totalPrice: body.totalPrice || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            travelers: body.travelers || [],
          },
          transactionId,
          message: 'Demo application created successfully',
          mode: 'demo',
        },
        { status: 201 }
      );
    }

    const session = await requireAgencyMembership([
      'AGENCY_OWNER',
      'AGENCY_ADMIN',
      'AGENCY_OPERATOR',
    ]);
    const parsed = createApplicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid application payload', 400);
    }

    const application = await createIndividualApplication({
      agencyId: session.agencyId,
      actorUserId: session.user.id,
      payload: parsed.data,
    });

    return NextResponse.json({ application, message: 'Application created' }, { status: 201 });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Invalid request body', 400);
  }
}
