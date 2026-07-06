import { randomUUID } from 'crypto';
import { env, isDemoMode } from '@/lib/env';
import { normalizePassportDateForInput } from '@/lib/ocr/passport-fields';

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
  mimeType?: string;
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
    mimeType: input.mimeType,
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
  mimeType?: string;
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
  mimeType?: string;
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
        file_data: stripDataUrl(input.imageBase64),
        file_type: input.mimeType || mimeTypeFromDataUrl(input.imageBase64) || 'application/octet-stream',
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
  const source = flattenDigioPassportPayload(raw);
  return {
    passportNumber: stringField(source.passport_number ?? source.passportNumber ?? source.document_id ?? source.id_number),
    firstName: stringField(source.first_name ?? source.firstName ?? source.given_name ?? source.givenName),
    lastName: stringField(source.last_name ?? source.lastName ?? source.surname),
    nationality: stringField(source.nationality ?? source.country_code ?? source.countryCode),
    sex: stringField(source.sex ?? source.gender),
    dateOfBirth: dateField(source.date_of_birth ?? source.dateOfBirth ?? source.dob),
    fatherFirstName: stringField(source.father_first_name ?? source.fatherFirstName),
    fatherLastName: stringField(source.father_last_name ?? source.fatherLastName),
    motherName: stringField(source.mother_name ?? source.motherName),
    addressLine1: stringField(source.address_line_1 ?? source.addressLine1 ?? source.address1),
    addressLine2: stringField(source.address_line_2 ?? source.addressLine2 ?? source.address2),
    placeOfBirth: stringField(source.place_of_birth ?? source.placeOfBirth),
    placeOfIssue: stringField(source.place_of_issue ?? source.placeOfIssue),
    dateOfIssue: dateField(source.date_of_issue ?? source.dateOfIssue ?? source.issue_date ?? source.issueDate),
    dateOfExpiry: dateField(source.date_of_expiry ?? source.dateOfExpiry ?? source.expiry_date ?? source.expiryDate),
  };
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}


function dateField(value: unknown) {
  const raw = stringField(value);
  return raw ? normalizePassportDateForInput(raw) || raw : '';
}
function confidenceFromRaw(raw: Record<string, unknown>): 'low' | 'medium' | 'high' {
  const source = flattenDigioPassportPayload(raw);
  const score = Number(source.confidence_score ?? source.confidence ?? raw.confidence_score ?? raw.confidence ?? 0);
  if (score >= 0.85) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
}

function stripDataUrl(value: string) {
  const marker = ';base64,';
  const index = value.indexOf(marker);
  return index >= 0 ? value.slice(index + marker.length) : value;
}

function mimeTypeFromDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,/);
  return match?.[1];
}

function flattenDigioPassportPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const candidates = [
    raw,
    recordField(raw.result),
    recordField(raw.response),
    recordField(raw.data),
    recordField(raw.extracted_data),
    recordField(raw.extractedData),
    recordField(recordField(raw.result)?.extracted_data),
    recordField(recordField(raw.result)?.data),
    recordField(recordField(raw.data)?.extracted_data),
    recordField(recordField(raw.data)?.passport),
    recordField(raw.passport),
  ].filter(Boolean) as Record<string, unknown>[];

  return Object.assign({}, ...candidates);
}

function recordField(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
