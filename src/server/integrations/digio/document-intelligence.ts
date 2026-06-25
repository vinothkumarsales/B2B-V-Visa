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

  // Keep Digio payloads isolated here. The route/service layer should only see
  // normalized extraction suggestions and provider references.
  throw new Error('Live Digio OCR/autofill is not implemented yet');
}
