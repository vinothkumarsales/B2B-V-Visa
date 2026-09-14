type CandidateContext = {
  currentTitle: string | null;
  experienceYears: number | null;
  profileCompletionPercent: number;
  preferences: { targetCountries: unknown; targetRoles: unknown; sponsorshipRequired: boolean | null } | null;
};

export type ResumeIntelligence = {
  status: 'ready' | 'needs_ocr';
  atsScore: number | null;
  eligibility: string;
  opportunityCountries: string[];
  strengths: string[];
  improvements: string[];
  extractedCharacters: number;
};

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 8) : [];
}

async function extractPdfText(bytes: Buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 12); pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '));
  }
  return pages.join('\n').replace(/\s+/g, ' ').trim();
}

export async function analyzeCareerResume(bytes: Buffer, mimeType: string, candidate: CandidateContext): Promise<ResumeIntelligence> {
  if (mimeType !== 'application/pdf') {
    return { status: 'needs_ocr', atsScore: null, eligibility: 'OCR review required before eligibility scoring', opportunityCountries: stringList(candidate.preferences?.targetCountries), strengths: [], improvements: ['Upload a text-based PDF for immediate ATS analysis'], extractedCharacters: 0 };
  }
  const text = await extractPdfText(bytes);
  if (text.length < 120) {
    return { status: 'needs_ocr', atsScore: null, eligibility: 'The PDF appears scanned or has insufficient readable text', opportunityCountries: stringList(candidate.preferences?.targetCountries), strengths: [], improvements: ['Upload a searchable PDF or use OCR'], extractedCharacters: text.length };
  }
  const lower = text.toLowerCase();
  const sections = ['experience', 'education', 'skills', 'summary', 'certification'];
  const sectionHits = sections.filter((section) => lower.includes(section));
  const roles = stringList(candidate.preferences?.targetRoles);
  const roleHits = roles.filter((role) => lower.includes(role.toLowerCase()));
  const hasContact = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text) && /(?:\+?\d[\d\s()-]{8,})/.test(text);
  const hasMetrics = /\b\d+(?:\.\d+)?%|\b\d+\+?\s*(?:clients|projects|users|years|cases|sales)/i.test(text);
  const lengthScore = text.length >= 1200 && text.length <= 7000 ? 20 : 12;
  const atsScore = Math.min(100, 25 + sectionHits.length * 8 + (hasContact ? 10 : 0) + (hasMetrics ? 10 : 0) + lengthScore + Math.min(10, roleHits.length * 5));
  const strengths = [sectionHits.length >= 3 ? 'Clear core resume sections' : '', hasContact ? 'Contact information is machine-readable' : '', hasMetrics ? 'Includes measurable outcomes' : '', roleHits.length ? `Aligned with ${roleHits.join(', ')}` : ''].filter(Boolean);
  const improvements = [sectionHits.length < 3 ? 'Add clearly labelled Experience, Skills, and Education sections' : '', !hasMetrics ? 'Add quantified achievements and outcomes' : '', !roleHits.length && roles.length ? `Use evidence-backed keywords for target roles: ${roles.join(', ')}` : '', text.length > 7000 ? 'Reduce resume length and repetition' : ''].filter(Boolean);
  const experience = candidate.experienceYears ?? 0;
  const eligibility = candidate.profileCompletionPercent < 80 ? 'Complete the profile for reliable eligibility checks' : experience >= 2 ? `Profile ready for role-level eligibility review (${experience} years experience)` : 'Best suited to entry-level and early-career opportunities';
  return { status: 'ready', atsScore, eligibility, opportunityCountries: stringList(candidate.preferences?.targetCountries), strengths, improvements, extractedCharacters: text.length };
}
