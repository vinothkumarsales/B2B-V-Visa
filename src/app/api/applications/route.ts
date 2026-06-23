import { NextRequest, NextResponse } from 'next/server';
import { mockApplications, statusConfig } from '@/lib/mock-data';
import { generateApplicationId, generateGroupId, generateTransactionId } from '@/lib/transaction-id';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase() || '';
  const status = searchParams.get('status') || '';
  const destination = searchParams.get('destination') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  let filtered = [...mockApplications];

  if (search) {
    filtered = filtered.filter(
      (app) =>
        app.groupName?.toLowerCase().includes(search) ||
        app.travelers.some(
          (t) =>
            t.firstName.toLowerCase().includes(search) ||
            t.lastName.toLowerCase().includes(search) ||
            t.passportNumber.toLowerCase().includes(search)
        )
    );
  }

  if (status) {
    filtered = filtered.filter((app) => app.status === status);
  }

  if (destination) {
    filtered = filtered.filter((app) =>
      app.destination.toLowerCase().includes(destination.toLowerCase())
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  const statusCounts = mockApplications.reduce(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    applications: paginated,
    total,
    page,
    limit,
    statusCounts,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate unique IDs based on client ID
    const appId = generateApplicationId(body.internalId);
    const groupId = body.groupName ? generateGroupId() : undefined;
    const transactionId = generateTransactionId();

    const newApplication = {
      id: appId,
      agencyId: body.agencyId || 'agency-001',
      groupId: groupId,
      transactionId: transactionId,
      internalId: body.internalId || '',
      groupName: body.groupName || '',
      destination: body.destination || '',
      visaType: body.visaType || '',
      visaCategory: body.visaCategory || 'STANDARD',
      travelDate: body.travelDate || null,
      returnDate: body.returnDate || null,
      status: 'DRAFT' as const,
      totalPrice: body.totalPrice || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      travelers: body.travelers || [],
    };

    return NextResponse.json(
      {
        application: newApplication,
        transactionId,
        message: 'Application created successfully',
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}