import { env } from '@/lib/env';
import { getZohoCrmAccessToken } from './oauth';

const ATTACHMENT_TIMEOUT_MS = 30_000;

export type ZohoAttachmentTargetModule =
  | 'Leads'
  | 'Contacts'
  | 'Travel_Agents'
  | 'Accounts'
  | 'Deals'
  | 'Service_Requests';

export type UploadZohoAttachmentInput = {
  moduleApiName: ZohoAttachmentTargetModule | string;
  recordId: string;
  filename: string;
  mimeType: string;
  content: Buffer;
};

export type UploadZohoAttachmentResult = {
  providerAttachmentId: string | null;
  status: string;
};

export async function uploadZohoCrmAttachment(input: UploadZohoAttachmentInput) {
  validateAttachmentInput(input);

  const token = await getZohoCrmAccessToken();
  const form = new FormData();
  const fileBytes = new Uint8Array(input.content);
  form.set('file', new Blob([fileBytes], { type: input.mimeType }), input.filename);

  const response = await fetchWithTimeout(
    `${env.ZOHO_CRM_API_BASE_URL.replace(/\/$/, '')}/crm/${env.ZOHO_CRM_API_VERSION}/${encodeURIComponent(input.moduleApiName)}/${encodeURIComponent(input.recordId)}/Attachments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
      },
      body: form,
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    data?: Array<{ details?: { id?: string }; status?: string; code?: string }>;
  };

  if (!response.ok) {
    throw sanitizedAttachmentError(payload.data?.[0]?.code || `HTTP_${response.status}`);
  }

  return {
    providerAttachmentId: payload.data?.[0]?.details?.id ?? null,
    status: payload.data?.[0]?.status ?? 'unknown',
  } satisfies UploadZohoAttachmentResult;
}

function validateAttachmentInput(input: UploadZohoAttachmentInput) {
  if (!input.moduleApiName || !input.recordId || !input.filename || !input.mimeType) {
    throw sanitizedAttachmentError('INVALID_ATTACHMENT_INPUT');
  }
  if (!input.content.length) {
    throw sanitizedAttachmentError('EMPTY_ATTACHMENT_CONTENT');
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATTACHMENT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizedAttachmentError(code: string) {
  const error = new Error(`Zoho CRM attachment error: ${code}`);
  error.name = 'ZohoCrmAttachmentError';
  return error;
}
