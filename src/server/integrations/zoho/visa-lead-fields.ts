export type VisaLeadFields = {
  leadName?: string;
  firstName?: string;
  lastName?: string;
  applicantName?: string;
  applicantMobile?: string | null;
  applicantEmail?: string | null;
  countryName?: string | null;
  visaTypeName?: string | null;
  category?: string | null;
  portalVisaInterestId?: string;
  leadSource?: string;
};

export type VisaLeadCustomFieldMap = Partial<Record<'countryName' | 'visaTypeName' | 'category' | 'portalVisaInterestId', string | null | undefined>>;

export function splitApplicantName(name?: string | null) {
  const cleaned = name?.trim();
  if (!cleaned) return { firstName: '', lastName: 'Visa Enquiry' };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { firstName: '', lastName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.at(-1) ?? 'Visa Enquiry',
  };
}

export function buildVisaInterestLeadCreateFields(input: {
  fields: VisaLeadFields;
  customFieldMap?: VisaLeadCustomFieldMap;
}): Record<string, string> {
  const mapped: Record<string, string> = {};
  const derivedName = splitApplicantName(input.fields.applicantName ?? input.fields.leadName);

  assign(mapped, 'First_Name', input.fields.firstName ?? derivedName.firstName);
  assign(mapped, 'Last_Name', input.fields.lastName ?? derivedName.lastName);
  assign(mapped, 'Mobile', input.fields.applicantMobile ?? undefined);
  assign(mapped, 'Email', input.fields.applicantEmail ?? undefined);
  assign(mapped, 'Lead_Source', input.fields.leadSource ?? 'V-Visa B2B Portal');

  const customMap = input.customFieldMap ?? {};
  assignCustom(mapped, customMap.countryName, input.fields.countryName ?? undefined);
  assignCustom(mapped, customMap.visaTypeName, input.fields.visaTypeName ?? undefined);
  assignCustom(mapped, customMap.category, input.fields.category ?? undefined);
  assignCustom(mapped, customMap.portalVisaInterestId, input.fields.portalVisaInterestId);

  return mapped;
}

function assign(target: Record<string, string>, key: string, value?: string | null) {
  const cleaned = value?.trim();
  if (cleaned) target[key] = cleaned;
}

function assignCustom(target: Record<string, string>, key?: string | null, value?: string | null) {
  if (!key) return;
  assign(target, key, value);
}
