import { NextRequest, NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { getConnectionDetail, revokeConnection } from '@/server/careers/connections.service';

export async function GET(_request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try { return await getConnectionDetail((await context.params).provider); } catch (error) { if (isApiResponse(error)) return error as NextResponse; return apiError('INVALID_INPUT', 'Unable to load connection.', 400); }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try { return await revokeConnection((await context.params).provider); } catch (error) { if (isApiResponse(error)) return error as NextResponse; return apiError('INVALID_INPUT', 'Unable to disconnect provider.', 400); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  return DELETE(request, context);
}
