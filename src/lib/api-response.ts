import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'AGENCY_NOT_APPROVED'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'RESOURCE_NOT_FOUND'
  | 'INSUFFICIENT_WALLET_BALANCE'
  | 'PRICE_CHANGED'
  | 'DOCUMENT_REQUIRED'
  | 'PAYMENT_NOT_CONFIRMED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PRODUCTION_CONFIGURATION_REQUIRED'
  | 'ADMIN_WRITES_DISABLED'
  | 'ADMIN_PERMISSION_REQUIRED'
  | 'ADMIN_ACCOUNT_PENDING'
  | 'ADMIN_ACCOUNT_SUSPENDED'
  | 'CONFIRMATION_REQUIRED'
  | 'AUDIT_WRITE_FAILED'
  | 'INVALID_ADMIN_MUTATION';

export function apiError(code: ApiErrorCode, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function isApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export function sanitizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}
