import type {
  VisaChecklistResolution,
  VisaDocumentRequirement,
  VisaDocumentRequirementType,
  VisaType,
} from '@/types';

const ALWAYS_COVERED = new Set(['Passport', 'Photo']);

const SECTION_LABELS: Record<VisaDocumentRequirementType, string> = {
  MANDATORY: 'Mandatory',
  CONDITIONAL: 'Conditional',
  OPTIONAL: 'Optional',
  INFORMATIONAL: 'Informational',
  INSTRUCTIONS: 'Instructions',
};

const DOC_NAME_TO_META: Record<string, { key: string; helper: string }> = {
  'Travel Itinerary': { key: 'travelItinerary', helper: 'Flight tickets or travel plan' },
  'Bank Statement': { key: 'bankStatement', helper: 'Last 6 months bank statement' },
  'Hotel Booking': { key: 'hotelBooking', helper: 'Confirmed hotel reservation' },
  'Hotel Booking Confirmation': { key: 'hotelBooking', helper: 'Confirmed hotel reservation' },
  'National ID': { key: 'nationalId', helper: 'Aadhar card or voter ID' },
  ITR: { key: 'itr', helper: 'Income Tax Return for last 2 years' },
  'Salary Slips': { key: 'salarySlips', helper: 'Last 3 months salary slips' },
  'Covering Letter': { key: 'coveringLetter', helper: 'From employer on company letterhead' },
  'Form 54': { key: 'form54', helper: 'Family composition form (if applicable)' },
  'Employment Letter': { key: 'employmentLetter', helper: 'Employment verification letter from company' },
  'Business Invitation Letter': { key: 'businessInvitation', helper: 'Invitation letter from business partner' },
  'Company Registration': { key: 'companyRegistration', helper: 'Company registration / incorporation certificate' },
  'Onward Flight Ticket': { key: 'onwardFlight', helper: 'Onward/return flight ticket' },
  'Return Flight Ticket': { key: 'returnFlight', helper: 'Confirmed return flight ticket' },
  'Offer Letter': { key: 'offerLetter', helper: 'Job offer letter from employer' },
  'GTE Statement': { key: 'gteStatement', helper: 'Genuine Temporary Entrant statement' },
  'Financial Documents': { key: 'financialDocs', helper: 'Proof of financial capacity' },
  'Health Insurance': { key: 'healthInsurance', helper: 'Travel health insurance policy' },
  'Medical Insurance': { key: 'healthInsurance', helper: 'Medical / travel health insurance policy' },
  'English Test Scores': { key: 'englishScores', helper: 'IELTS / TOEFL / PTE score report' },
  'Travel Insurance': { key: 'travelInsurance', helper: 'Travel insurance policy document' },
  'DS-160 Confirmation': { key: 'ds160Confirmation', helper: 'DS-160 form confirmation page' },
  'Property Documents': { key: 'propertyDocs', helper: 'Property ownership documents' },
  'Accommodation Proof': { key: 'accommodationProof', helper: 'Proof of accommodation / hotel reservation' },
  'Invitation from Child/Grandchild': { key: 'invitationLetter', helper: 'Invitation letter from child or grandchild in Canada' },
  'Medical Exam Report': { key: 'medicalExamReport', helper: 'Immigration medical examination report' },
  'Previous Japan Visas': { key: 'previousJapanVisas', helper: 'Copies of previous Japan visa stamps' },
  'Previous China Visas': { key: 'previousChinaVisas', helper: 'Copies of previous China visa stamps' },
  'Employment Contract': { key: 'employmentContract', helper: 'Employment contract from employer' },
  'Qualification Certificates': { key: 'qualificationCerts', helper: 'Educational qualification certificates' },
  'Hotel Voucher': { key: 'hotelVoucher', helper: 'Hotel voucher / confirmation from tour operator' },
  'Sponsor Letter': { key: 'sponsorLetter', helper: 'Sponsor letter from Indonesian sponsor' },
  'Medical Certificate': { key: 'medicalCertificate', helper: 'Medical fitness certificate' },
  'Police Clearance': { key: 'policeClearance', helper: 'Police clearance certificate (PCC)' },
  'Daily Package Payment Proof': { key: 'dailyPackageProof', helper: 'Proof of daily package payment to Bhutanese tour operator' },
  'Yellow Fever Certificate': { key: 'yellowFeverCert', helper: 'Yellow fever vaccination certificate' },
  'Purpose of Visit Letter': { key: 'purposeOfVisitLetter', helper: 'Letter explaining purpose of visit to Canada' },
};

function normalizeDocName(name: string): string {
  const cleaned = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  const aliases: Record<string, string> = {
    'Hotel Booking Confirmation': 'Hotel Booking',
    'Medical Insurance': 'Health Insurance',
  };
  return aliases[cleaned] || cleaned;
}

function documentKey(label: string): string {
  const normalized = normalizeDocName(label);
  return (DOC_NAME_TO_META[normalized] || DOC_NAME_TO_META[label])?.key || normalized.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function legacyDocumentRequirement(label: string): VisaDocumentRequirement {
  const normalized = normalizeDocName(label);
  const meta = DOC_NAME_TO_META[normalized] || DOC_NAME_TO_META[label];
  return {
    id: documentKey(label),
    label,
    documentName: label,
    description: meta?.helper || `Upload ${label}`,
    requirement: 'MANDATORY',
    uploadRequired: !ALWAYS_COVERED.has(label),
    isMandatory: true,
    isOptional: false,
  };
}

function uniqueById(items: VisaDocumentRequirement[]): VisaDocumentRequirement[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id || documentKey(item.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveVisaChecklist(visa: VisaType): VisaChecklistResolution {
  const requirements = visa.documentRequirements;
  const mandatory = requirements?.mandatory ?? visa.documents.map(legacyDocumentRequirement);
  const groups: Record<VisaDocumentRequirementType, VisaDocumentRequirement[]> = {
    MANDATORY: mandatory,
    CONDITIONAL: requirements?.conditional ?? [],
    OPTIONAL: requirements?.optional ?? [],
    INFORMATIONAL: requirements?.informational ?? [],
    INSTRUCTIONS: requirements?.instructions ?? [],
  };

  const sections = (Object.keys(groups) as VisaDocumentRequirementType[])
    .map((type) => ({
      type,
      label: SECTION_LABELS[type],
      items: uniqueById(groups[type]).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }))
    .filter((section) => section.items.length > 0);

  const uploadItems = uniqueById(
    [...groups.MANDATORY, ...groups.CONDITIONAL]
      .filter((item) => item.uploadRequired !== false)
      .filter((item) => !ALWAYS_COVERED.has(item.documentName || item.label))
  );

  return {
    visaProductId: visa.id,
    uploadItems,
    sections,
  };
}

export function buildApplicationDocumentChecklist({
  visaProduct,
}: {
  visaProduct: VisaType;
  applicants?: unknown[];
  trip?: unknown;
  selectedStickerRoute?: unknown;
}): VisaChecklistResolution {
  return resolveVisaChecklist(visaProduct);
}

export function getRequiredAdditionalDocs(visa: VisaType): { key: string; title: string; helper: string }[] {
  return resolveVisaChecklist(visa).uploadItems.map((item) => ({
    key: item.id || documentKey(item.label),
    title: item.documentName || item.label,
    helper: item.description || item.notes || `Upload ${item.documentName || item.label}`,
  }));
}
