import { randomUUID } from 'crypto';
import { env, isDemoMode } from '../../../lib/env.ts';
import { normalizePassportDateForInput } from '../../../lib/ocr/passport-fields.ts';

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
  const isSandboxEnv = env.DIGIO_ENVIRONMENT === 'sandbox' || env.DIGIO_BASE_URL.includes('ext.digio.in');

  if (isDemoMode) {
    return getSandboxPassportExtraction(input.documentType, 'demo');
  }

  if (!env.DIGIO_CLIENT_ID || !env.DIGIO_CLIENT_SECRET) {
    if (isSandboxEnv) {
      return getSandboxPassportExtraction(input.documentType, 'sandbox-unconfigured');
    }
    throw new Error('Digio is not configured');
  }

  const providerRequestId = `digio-${randomUUID()}`;
  let raw: Record<string, unknown> | null = null;
  let rawError: Error | null = null;

  try {
    raw = await callDigioWithRetry({
      providerRequestId,
      documentType: input.documentType,
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
    });
  } catch (error) {
    rawError = error instanceof Error ? error : new Error('Digio provider failed');
    console.warn('[DIGIO OCR] Live OCR attempt failed:', rawError.message);
  }

  const normalizedExtraction = raw ? normalizeDigioFields(raw) : {};
  const hasExtractedFields = Boolean(
    normalizedExtraction.passportNumber || normalizedExtraction.firstName || normalizedExtraction.dateOfBirth,
  );

  if (raw && hasExtractedFields) {
    return {
      provider: 'DIGIO',
      providerRequestId,
      rawExtraction: {
        provider: 'DIGIO',
        providerRequestId,
        evidenceKeys: Object.keys(raw).filter((key) => !/image|file|passport/i.test(key)),
      },
      normalizedExtraction,
      confidence: confidenceFromRaw(raw, normalizedExtraction),
    };
  }

  // Sandbox / Ext environment fallback
  // In sandbox, Digio's testing environment does not perform live OCR on arbitrary passport photos
  // Providing the standard sandbox prototype prevents partner testing on staging/sandbox from blocking
  if (isSandboxEnv) {
    console.info('[DIGIO OCR] Sandbox/Ext environment active; returning sandbox prototype extraction.');
    return getSandboxPassportExtraction(input.documentType, raw ? 'sandbox-fallback' : 'sandbox-error');
  }

  if (rawError) {
    throw rawError;
  }

  return {
    provider: 'DIGIO',
    providerRequestId,
    rawExtraction: {
      provider: 'DIGIO',
      providerRequestId,
      evidenceKeys: raw ? Object.keys(raw).filter((key) => !/image|file|passport/i.test(key)) : [],
    },
    normalizedExtraction,
    confidence: 'low',
  };
}

function getSandboxPassportExtraction(documentType: string, mode = 'demo'): DocumentIntelligenceResult {
  const sandboxPassport = {
    passportNumber: 'J8151861',
    firstName: 'Aarav',
    lastName: 'Sharma',
    nationality: 'Indian',
    sex: 'Male',
    dateOfBirth: '1992-08-14',
    placeOfBirth: 'Bengaluru',
    placeOfIssue: 'Bengaluru',
    maritalStatus: 'Single',
    dateOfIssue: '2021-02-10',
    dateOfExpiry: '2031-02-09',
  };

  return {
    provider: 'DIGIO',
    providerRequestId: `sandbox-digio-${randomUUID()}`,
    confidence: 'high',
    rawExtraction: {
      documentType,
      mode,
      note: 'Digio sandbox/demo response for prototype autofill',
    },
    normalizedExtraction:
      documentType === 'passport'
        ? sandboxPassport
        : {
            documentType,
            extractedText: `${documentType} uploaded and ready for manual review.`,
          },
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
  const auth = `Basic ${Buffer.from(`${env.DIGIO_CLIENT_ID}:${env.DIGIO_CLIENT_SECRET}`).toString('base64')}`;
  const baseUrl = env.DIGIO_BASE_URL.replace(/\/$/, '');
  const fileType = input.mimeType || mimeTypeFromDataUrl(input.imageBase64) || 'application/octet-stream';
  const fileBlob = new Blob([base64ToBuffer(input.imageBase64)], { type: fileType });
  const fileName = fileNameFor(input.documentType, fileType);

  // 1. Prioritize stateless ID analyzer for direct document file uploads
  try {
    return await callDigioStatelessAnalyzer({
      auth,
      baseUrl,
      providerRequestId: input.providerRequestId,
      documentType: input.documentType,
      fileBlob,
      fileName,
    });
  } catch (statelessError) {
    // 2. Fall back to template session if configured
    const sessionRaw = await callDigioTemplateSession({
      auth,
      baseUrl,
      providerRequestId: input.providerRequestId,
      documentType: input.documentType,
      fileBlob,
      fileName,
    });
    if (sessionRaw) return sessionRaw;
    throw statelessError;
  }
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
        'x-session': input.auth,
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
    form.set(
      'additional_request',
      JSON.stringify({
        features: ['MASK', 'CROP_ALIGN', 'VERIFY'],
        expected_ids: ['PASSPORT'],
      }),
    );

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
    if (data.details && typeof data.details === 'object' && (data.details as any).status === false) {
      logDigioRejection('stateless_v4', response, data, input.documentType, input.baseUrl);
      const msg = String((data.details as any).error_message || 'No ID card detected in document');
      throw new Error(msg);
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
export function normalizeDigioFields(raw: Record<string, unknown>): Record<string, string> {
  const source = flattenDigioPassportPayload(raw);

  let firstName = stringField(pickField(source, 'first_name', 'firstName', 'given_name', 'givenName', 'given name'));
  let lastName = stringField(pickField(source, 'last_name', 'lastName', 'surname', 'surname_name', 'family_name', 'familyName'));

  if (!firstName && !lastName) {
    const fullName = stringField(pickField(source, 'name', 'full_name', 'fullName', 'customer_name'));
    if (fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      if (parts.length > 1) {
        lastName = parts.pop()!;
        firstName = parts.join(' ');
      } else {
        firstName = fullName;
      }
    }
  } else if (firstName && !lastName) {
    const parts = firstName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      lastName = parts.pop()!;
      firstName = parts.join(' ');
    }
  }

  return {
    passportNumber: upperField(
      pickField(
        source,
        'passport_number',
        'passportNumber',
        'passport_no',
        'passportNo',
        'passport',
        'document_id',
        'documentId',
        'document_number',
        'documentNumber',
        'id_number',
        'idNumber',
        'id_no',
        'id no',
        'idNo',
        'doc_number',
        'doc_no',
        'id_card_no',
        'id_card_number',
      ),
    ),
    firstName,
    lastName,
    nationality: normalizeNationality(
      pickField(source, 'nationality', 'country_code', 'countryCode', 'country', 'citizenship'),
    ),
    sex: normalizeSex(pickField(source, 'sex', 'gender')),
    dateOfBirth: dateField(pickField(source, 'date_of_birth', 'dateOfBirth', 'date of birth', 'dob', 'birth_date', 'birthDate')),
    fatherFirstName: stringField(pickField(source, 'father_first_name', 'fatherFirstName', 'fathers name', 'fathers_name', 'father_name', 'father')),
    fatherLastName: stringField(pickField(source, 'father_last_name', 'fatherLastName')),
    motherName: stringField(pickField(source, 'mother_name', 'motherName', 'mothers name', 'mothers_name', 'mother_name', 'mother')),
    addressLine1: stringField(pickField(source, 'address_line_1', 'addressLine1', 'address1', 'address', 'permanent address', 'present address', 'full_address')),
    addressLine2: stringField(pickField(source, 'address_line_2', 'addressLine2', 'address2')),
    placeOfBirth: stringField(pickField(source, 'place_of_birth', 'placeOfBirth', 'place of birth', 'birth_place', 'birthPlace', 'pob')),
    placeOfIssue: stringField(pickField(source, 'place_of_issue', 'placeOfIssue', 'place of issue', 'issue_place', 'issuePlace', 'poi')),
    dateOfIssue: dateField(pickField(source, 'date_of_issue', 'dateOfIssue', 'date of issue', 'issue_date', 'issueDate', 'doi')),
    dateOfExpiry: dateField(pickField(source, 'date_of_expiry', 'dateOfExpiry', 'date of expiry', 'expiry_date', 'expiryDate', 'doe', 'expiration_date', 'valid_until')),
  };
}

function normalizeNationality(value: unknown) {
  const raw = stringField(value);
  if (/^(ind|indian|in)$/i.test(raw)) return 'Indian';
  return raw;
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

function confidenceFromRaw(raw: Record<string, unknown>, normalized?: Record<string, string>): 'low' | 'medium' | 'high' {
  const source = flattenDigioPassportPayload(raw);
  const score = Number(source.confidence_score ?? source.confidence ?? raw.confidence_score ?? raw.confidence ?? 0);
  if (score >= 0.85) return 'high';
  if (score >= 0.55) return 'medium';

  const fields = normalized ?? normalizeDigioFields(raw);
  const hasPassport = Boolean(fields.passportNumber);
  const hasName = Boolean(fields.firstName);
  const hasDob = Boolean(fields.dateOfBirth);
  const isApproved = source.status === true || source.status === 'success' || source.status === 'approved';

  if (hasPassport && hasName && hasDob) return 'high';
  if (hasPassport && (hasName || hasDob)) return 'medium';
  if (isApproved && (hasPassport || hasName)) return 'medium';
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

export function flattenDigioPassportPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const candidates: Record<string, unknown>[] = [];

  const addCandidate = (val: unknown) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      candidates.push(val as Record<string, unknown>);
    }
  };

  addCandidate(raw);
  addCandidate(raw.details);
  addCandidate(raw.id_analysis);
  addCandidate(raw.id_attributes);
  if (raw.details && typeof raw.details === 'object') {
    addCandidate((raw.details as Record<string, unknown>).id_attributes);
    addCandidate((raw.details as Record<string, unknown>).extracted_data);
  }
  if (raw.id_analysis && typeof raw.id_analysis === 'object') {
    addCandidate((raw.id_analysis as Record<string, unknown>).id_attributes);
    addCandidate((raw.id_analysis as Record<string, unknown>).details);
  }
  addCandidate(raw.result);
  addCandidate(raw.response);
  addCandidate(raw.data);
  addCandidate(raw.extracted_data);
  addCandidate(raw.extractedData);
  addCandidate(raw.passport);
  addCandidate(raw.customer_identity_details);
  addCandidate(raw.validation_result);

  if (raw.result && typeof raw.result === 'object') {
    const res = raw.result as Record<string, unknown>;
    addCandidate(res.details);
    addCandidate(res.id_attributes);
    addCandidate(res.extracted_data);
    addCandidate(res.extractedData);
    addCandidate(res.data);
    addCandidate(res.id_analysis);
  }

  if (raw.data && typeof raw.data === 'object') {
    const d = raw.data as Record<string, unknown>;
    addCandidate(d.details);
    addCandidate(d.extracted_data);
    addCandidate(d.extractedData);
    addCandidate(d.passport);
    addCandidate(d.id_analysis);
  }

  if (raw.response && typeof raw.response === 'object') {
    const resp = raw.response as Record<string, unknown>;
    addCandidate(resp.details);
    addCandidate(resp.extracted_data);
    addCandidate(resp.data);
  }

  if (Array.isArray(raw.id_cards)) {
    for (const card of raw.id_cards) {
      if (card && typeof card === 'object') {
        const c = card as Record<string, unknown>;
        addCandidate(c);
        addCandidate(c.details);
        addCandidate(c.id_analysis);
        addCandidate(c.extracted_data);
        addCandidate(c.validation_result);
      }
    }
  }

  if (Array.isArray(raw.actions)) {
    for (const action of raw.actions) {
      if (action && typeof action === 'object') {
        const a = action as Record<string, unknown>;
        addCandidate(a);
        addCandidate(a.details);
        addCandidate(a.validation_result);
        addCandidate(a.extracted_data);
        addCandidate(a.data);
      }
    }
  }

  if (Array.isArray(raw.detections)) {
    for (const det of raw.detections) {
      if (det && typeof det === 'object') {
        const d = det as Record<string, unknown>;
        addCandidate(d);
        addCandidate(d.details);
      }
    }
  }

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







