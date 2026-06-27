import { randomUUID } from 'crypto';
import { env, isDemoMode } from '@/lib/env';

export interface DocumentIntelligenceResult {
  provider: 'DIGIO';
  providerRequestId: string;
  rawExtraction: Record<string, unknown>;
  normalizedExtraction: Record<string, string>;
  confidence: 'low' | 'medium' | 'high';
}

export async function extractDocumentFields(input: {
  documentType: string;
  imageBase64: string;
}): Promise<DocumentIntelligenceResult> {
  if (isDemoMode) {
    const demoPassport = {
      passportNumber: 'J8151861',
      firstName: 'Aarav',
      lastName: 'Sharma',
      nationality: 'Indian',
      sex: 'Male',
      dateOfBirth: '14/08/1992',
      placeOfBirth: 'Bengaluru',
      placeOfIssue: 'Bengaluru',
      maritalStatus: 'Single',
      dateOfIssue: '10/02/2021',
      dateOfExpiry: '09/02/2031',
    };

    return {
      provider: 'DIGIO',
      providerRequestId: `demo-digio-${randomUUID()}`,
      confidence: 'high',
      rawExtraction: {
        documentType: input.documentType,
        mode: 'demo',
        note: 'Demo Digio OCR response for prototype autofill',
      },
      normalizedExtraction:
        input.documentType === 'passport'
          ? demoPassport
          : {
              documentType: input.documentType,
              extractedText: `${input.documentType} uploaded and ready for manual review.`,
            },
    };
  }

  if (!env.DIGIO_CLIENT_ID || !env.DIGIO_CLIENT_SECRET) {
    throw new Error('Digio is not configured');
  }

  const providerRequestId = `digio-${randomUUID()}`;
  const raw = await callDigioWithRetry({
    providerRequestId,
    documentType: input.documentType,
    imageBase64: input.imageBase64,
  });
  const normalizedExtraction = normalizeDigioFields(raw);

  return {
    provider: 'DIGIO',
    providerRequestId,
    rawExtraction: {
      provider: 'DIGIO',
      providerRequestId,
      evidenceKeys: Object.keys(raw).filter((key) => !/image|file|passport/i.test(key)),
    },
    normalizedExtraction,
    confidence: confidenceFromRaw(raw),
  };
}

async function callDigioWithRetry(input: {
  providerRequestId: string;
  documentType: string;
  imageBase64: string;
}) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await callDigio(input);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Digio provider failed');
      if (attempt === 2) break;
    }
  }
  throw lastError ?? new Error('Digio provider failed');
}

async function callDigio(input: {
  providerRequestId: string;
  documentType: string;
  imageBase64: string;
}): Promise<Record<string, unknown>> {
  const auth = Buffer.from(`${env.DIGIO_CLIENT_ID}:${env.DIGIO_CLIENT_SECRET}`).toString('base64');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${env.DIGIO_BASE_URL.replace(/\/$/, '')}/client/kyc/async_response`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: input.providerRequestId,
        document_type: input.documentType.toUpperCase(),
        file_data: input.imageBase64,
        file_type: 'image/jpeg',
        environment: env.DIGIO_ENVIRONMENT,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(String(data.error_code || data.error || data.message || 'DIGIO_PROVIDER_ERROR'));
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeDigioFields(raw: Record<string, unknown>): Record<string, string> {
  return {
    passportNumber: stringField(raw.passport_number ?? raw.document_id ?? raw.id_number),
    firstName: stringField(raw.first_name ?? raw.given_name),
    lastName: stringField(raw.last_name ?? raw.surname),
    nationality: stringField(raw.nationality),
    sex: stringField(raw.sex ?? raw.gender),
    dateOfBirth: stringField(raw.date_of_birth ?? raw.dob),
    placeOfBirth: stringField(raw.place_of_birth),
    placeOfIssue: stringField(raw.place_of_issue),
    dateOfIssue: stringField(raw.date_of_issue ?? raw.issue_date),
    dateOfExpiry: stringField(raw.date_of_expiry ?? raw.expiry_date),
  };
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function confidenceFromRaw(raw: Record<string, unknown>): 'low' | 'medium' | 'high' {
  const score = Number(raw.confidence_score ?? raw.confidence ?? 0);
  if (score >= 0.85) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
}
