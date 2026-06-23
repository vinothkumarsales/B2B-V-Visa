import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface OCRField {
  field: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

interface OCRResponse {
  success: boolean;
  fields: OCRField[];
  rawText?: string;
  error?: string;
}

const PASSPORT_PROMPT = `You are an OCR specialist for Indian passports. Analyze this passport image and extract the following fields. Return ONLY a valid JSON object with no markdown formatting, no code blocks, just the raw JSON.

Required fields to extract:
- passportNumber: The passport number (usually starts with letter like J, P, etc.)
- firstName: Given name(s) from the passport
- lastName: Surname from the passport
- nationality: Nationality (e.g., "INDIAN", "REPUBLIC OF INDIA")
- sex: Gender (MALE or FEMALE)
- dateOfBirth: Date of birth in DD/MM/YYYY format
- placeOfBirth: Place of birth (city name)
- placeOfIssue: Place of issue / authority
- maritalStatus: Marital status if visible (SINGLE, MARRIED, etc.)
- dateOfIssue: Date of issue in DD/MM/YYYY format
- dateOfExpiry: Date of expiry in DD/MM/YYYY format

Return format:
{"passportNumber":"","firstName":"","lastName":"","nationality":"","sex":"","dateOfBirth":"","placeOfBirth":"","placeOfIssue":"","maritalStatus":"","dateOfIssue":"","dateOfExpiry":""}

If a field is not visible or cannot be read, return empty string for that field. Do NOT guess or make up values.`;

const DOCUMENT_PROMPT = `You are an OCR specialist. Analyze this document image and extract ALL readable text content. Return ONLY a valid JSON object with no markdown formatting, no code blocks, just the raw JSON.

Return format:
{"documentType":"","extractedText":"","keyDetails":{}}

Where:
- documentType: Type of document (e.g., "Aadhar Card", "Bank Statement", "PAN Card", "ITR", "Salary Slip", "Covering Letter", etc.)
- extractedText: All readable text from the document
- keyDetails: Object with any key-value pairs you can extract (e.g., {"name": "", "number": "", "date": "", etc.})

If text cannot be read clearly, return what you can see and mark uncertain parts.`;

async function getZAIInstance() {
  return await ZAI.create();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, documentType } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Determine the MIME type from the base64 data
    const mimeType = imageBase64.startsWith('/9j/')
      ? 'image/jpeg'
      : imageBase64.startsWith('iVBOR')
        ? 'image/png'
        : imageBase64.startsWith('R0lGOD')
          ? 'image/gif'
          : imageBase64.startsWith('UklGR')
            ? 'image/webp'
            : 'image/jpeg';

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
    const prompt = documentType === 'passport' ? PASSPORT_PROMPT : DOCUMENT_PROMPT;

    const zai = await getZAIInstance();

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse the response - handle potential markdown code blocks
    let parsedData: Record<string, unknown>;
    try {
      // Try direct parse first
      parsedData = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try finding JSON object in the content
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsedData = JSON.parse(objectMatch[0]);
        } else {
          return NextResponse.json({
            success: false,
            error: 'Could not parse OCR response',
            rawText: content,
          });
        }
      }
    }

    // Format the response based on document type
    if (documentType === 'passport') {
      const fields: OCRField[] = Object.entries(parsedData).map(([field, value]) => ({
        field,
        value: String(value || ''),
        confidence: String(value || '').length > 0 ? 'high' : 'low',
      }));

      return NextResponse.json({
        success: true,
        fields,
        rawText: content,
      } as OCRResponse);
    } else {
      return NextResponse.json({
        success: true,
        fields: [
          { field: 'documentType', value: String(parsedData.documentType || ''), confidence: 'high' },
          { field: 'extractedText', value: String(parsedData.extractedText || ''), confidence: 'high' },
        ],
        rawText: content,
        documentData: parsedData,
      });
    }
  } catch (error: unknown) {
    console.error('OCR API error:', error);
    const message = error instanceof Error ? error.message : 'OCR processing failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}