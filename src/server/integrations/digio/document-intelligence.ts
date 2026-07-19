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
  const baseUrl = env.DIGIO_BASE_URL.replace(/\/$/, '');
  const fileType = input.mimeType || mimeTypeFromDataUrl(input.imageBase64) || 'application/octet-stream';
  const fileBlob = new Blob([base64ToBuffer(input.imageBase64)], { type: fileType });
  const fileName = fileNameFor(input.documentType, fileType);

  const sessionRaw = await callDigioTemplateSession({
    auth,
    baseUrl,
    providerRequestId: input.providerRequestId,
    documentType: input.documentType,
    fileBlob,
    fileName,
  });
  if (sessionRaw) return sessionRaw;

  return callDigioStatelessAnalyzer({
    auth,
    baseUrl,
    providerRequestId: input.providerRequestId,
    documentType: input.documentType,
    fileBlob,
    fileName,
  });
}

async function callDigioTemplateSession(input: {
  auth: string;
  baseUrl: string;
  providerRequestId: string;
  documentType: string;
  fileBlob: Blob;
  fileName: string;
}): Promise<Record<string, unknown> | null> {
  const templateName = env.DIGIO_TEMPLATE_NAME;
  if (!templateName && !env.DIGIO_TEMPLATE_ID) return null;

  const requestPayload = {
    customer_identifier: input.providerRequestId,
    template_name: templateName,
    ...(env.DIGIO_TEMPLATE_ID ? { template_id: env.DIGIO_TEMPLATE_ID } : {}),
    notify_customer: false,
    generate_access_token: true,
  };

  try {
    const createResponse = await fetch(`${input.baseUrl}/client/kyc/v2/request/with_template`, {
      method: 'POST',
      headers: {
        Authorization: input.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });
    const createData = await parseJsonResponse(createResponse);
    if (!createResponse.ok || !stringField(createData.id)) {
      logDigioRejection('template_create', createResponse, createData, input.documentType, input.baseUrl);
      return null;
    }

    const form = new FormData();
    form.set('front_part', input.fileBlob, input.fileName);

    const uploadResponse = await fetch(`${input.baseUrl}/client/kyc/v2/${stringField(createData.id)}/upload`, {
      method: 'POST',
      headers: { Authorization: input.auth, 'x-session': input.auth },
      body: form,
    });
    const uploadData = await parseJsonResponse(uploadResponse);
    if (!uploadResponse.ok) {
      logDigioRejection('template_upload', uploadResponse, uploadData, input.documentType, input.baseUrl);
      return null;
    }

    return {
      mode: 'template-session',
      digioRequestId: stringField(createData.id),
      ...uploadData,
    };
  } catch (error) {
    console.error('Digio OCR template session failed', {
      stage: 'template_session_exception',
      message: error instanceof Error ? error.message.slice(0, 180) : 'Unknown Digio error',
      documentType: input.documentType,
      baseUrlHost: safeHost(input.baseUrl),
    });
    return null;
  }
}

async function callDigioStatelessAnalyzer(input: {
  auth: string;
  baseUrl: string;
  providerRequestId: string;
  documentType: string;
  fileBlob: Blob;
  fileName: string;
}): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const form = new FormData();
    form.set('front_part', input.fileBlob, input.fileName);
    form.set('unique_request_id', input.providerRequestId);

    const response = await fetch(`${input.baseUrl}/v4/client/kyc/analyze/file/idcard`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: input.auth, 'x-session': input.auth },
      body: form,
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      logDigioRejection('stateless_v4', response, data, input.documentType, input.baseUrl);
      const code = String(data.error_code || data.error || data.code || 'DIGIO_PROVIDER_ERROR');
      throw new Error(code);
    }
    return {
      mode: 'stateless-v4',
      ...data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { rawText: text.slice(0, 500) };
  }
}

function logDigioRejection(
  stage: string,
  response: Response,
  data: Record<string, unknown>,
  documentType: string,
  baseUrl: string,
) {
  const code = String(data.error_code || data.error || data.code || 'DIGIO_PROVIDER_ERROR');
  const message = String(data.message || data.error_description || data.rawText || response.statusText || 'Digio provider error');
  console.error('Digio OCR provider rejected request', {
    stage,
    status: response.status,
    code,
    message: message.slice(0, 180),
    documentType,
    baseUrlHost: safeHost(baseUrl),
  });
}
function normalizeDigioFields(raw: Record<string, unknown>): Record<string, string> {
  const source = flattenDigioPassportPayload(raw);
  return {
    passportNumber: upperField(pickField(source, 'passport_number', 'passportNumber', 'document_id', 'id_number', 'id no')),
    firstName: stringField(pickField(source, 'first_name', 'firstName', 'given_name', 'givenName', 'given name', 'name')),
    lastName: stringField(pickField(source, 'last_name', 'lastName', 'surname', 'surname_name')),
    nationality: stringField(pickField(source, 'nationality', 'country_code', 'countryCode')),
    sex: normalizeSex(pickField(source, 'sex', 'gender')),
    dateOfBirth: dateField(pickField(source, 'date_of_birth', 'dateOfBirth', 'date of birth', 'dob')),
    fatherFirstName: stringField(pickField(source, 'father_first_name', 'fatherFirstName', 'fathers name', 'fathers_name', 'father_name', 'father')),
    fatherLastName: stringField(pickField(source, 'father_last_name', 'fatherLastName')),
    motherName: stringField(pickField(source, 'mother_name', 'motherName', 'mothers name', 'mothers_name', 'mother_name', 'mother')),
    addressLine1: stringField(pickField(source, 'address_line_1', 'addressLine1', 'address1', 'address', 'permanent address', 'present address')),
    addressLine2: stringField(pickField(source, 'address_line_2', 'addressLine2', 'address2')),
    placeOfBirth: stringField(pickField(source, 'place_of_birth', 'placeOfBirth', 'place of birth', 'birth_place')),
    placeOfIssue: stringField(pickField(source, 'place_of_issue', 'placeOfIssue', 'place of issue', 'issue_place')),
    dateOfIssue: dateField(pickField(source, 'date_of_issue', 'dateOfIssue', 'date of issue', 'issue_date', 'issueDate', 'doi')),
    dateOfExpiry: dateField(pickField(source, 'date_of_expiry', 'dateOfExpiry', 'date of expiry', 'expiry_date', 'expiryDate', 'doe')),
  };
}

function pickField(source: Record<string, unknown>, ...keys: string[]) {
  const normalized = normalizeSourceKeys(source);
  for (const key of keys) {
    const direct = source[key];
    if (hasValue(direct)) return direct;
    const normalizedValue = normalized[normalizeKey(key)];
    if (hasValue(normalizedValue)) return normalizedValue;
  }
  return '';
}

function normalizeSourceKeys(source: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [normalizeKey(key), value]),
  );
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
}

function upperField(value: unknown) {
  return stringField(value).toUpperCase();
}

function normalizeSex(value: unknown) {
  const raw = stringField(value);
  const normalized = raw.toUpperCase();
  if (normalized.startsWith('M')) return 'Male';
  if (normalized.startsWith('F')) return 'Female';
  return raw;
}

function safeHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return 'invalid-url';
  }
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

function base64ToBuffer(value: string) {
  return Buffer.from(stripDataUrl(value), 'base64');
}

function fileNameFor(documentType: string, mimeType: string) {
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('pdf') ? 'pdf' : 'jpg';
  return `${documentType || 'document'}-front.${ext}`;
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

function firstRecord(value: unknown) {
  return Array.isArray(value) && value[0] && typeof value[0] === 'object'
    ? (value[0] as Record<string, unknown>)
    : undefined;
}

function recordField(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}







