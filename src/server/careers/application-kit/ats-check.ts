export type AtsCheckInput = {
  pdfPath?: string;
  markdown?: string;
  keywords: string[];
};

export type AtsCheckResult = {
  readable: boolean;
  keywordHits: string[];
  keywordMisses: string[];
  keywordDensity: number;
  warnings: string[];
  errors: string[];
};

export async function runAtsCheck(input: AtsCheckInput): Promise<AtsCheckResult> {
  const text = input.markdown || '';
  const keywords = input.keywords.map((keyword) => keyword.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  const keywordHits = keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
  const keywordMisses = keywords.filter((keyword) => !lower.includes(keyword.toLowerCase()));
  const keywordDensity = keywords.length ? Math.round((keywordHits.length / keywords.length) * 100) : 0;

  const warnings: string[] = [];
  const errors: string[] = [];

  if (!text.trim()) {
    warnings.push('ATS text extraction returned empty content');
  }

  if (text.length > 8000) {
    warnings.push('Extracted ATS text exceeds expected resume length');
  }

  if (/\s{3,}/.test(text)) {
    warnings.push('Extracted text contains large whitespace gaps, check formatting');
  }

  return {
    readable: errors.length === 0,
    keywordHits,
    keywordMisses,
    keywordDensity,
    warnings,
    errors,
  };
}
