import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';
import { getPrivateDocumentStorage } from '@/server/storage/private-document-storage';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { await requireAdmin('document.read'); const { id } = await params; const document = await db.applicationDocument.findUnique({ where: { id }, select: { storageKey: true } }); if (!document) return apiError('RESOURCE_NOT_FOUND', 'Document not found.', 404); return NextResponse.redirect(await getPrivateDocumentStorage().createSignedDownloadUrl(document.storageKey)); } catch (error) { if (isApiResponse(error)) return error; return apiError('PROVIDER_UNAVAILABLE', 'Document download is unavailable.', 503); } }
