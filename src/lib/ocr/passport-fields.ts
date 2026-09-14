export type PassportAutofillField =
  | 'passportNumber'
  | 'firstName'
  | 'lastName'
  | 'nationality'
  | 'sex'
  | 'dateOfBirth'
  | 'placeOfBirth'
  | 'placeOfIssue'
  | 'maritalStatus'
  | 'dateOfIssue'
  | 'dateOfExpiry';

const FIELD_ALIASES: Record<string, PassportAutofillField> = {
  passportnumber: 'passportNumber',
  passport_number: 'passportNumber',
  passportno: 'passportNumber',
  passport_no: 'passportNumber',
  passport: 'passportNumber',
  documentid: 'passportNumber',
  document_id: 'passportNumber',
  idnumber: 'passportNumber',
  id_number: 'passportNumber',
  idno: 'passportNumber',
  id_no: 'passportNumber',
  firstname: 'firstName',
  first_name: 'firstName',
  givenname: 'firstName',
  given_name: 'firstName',
  givenames: 'firstName',
  givennames: 'firstName',
  name: 'firstName',
  lastname: 'lastName',
  last_name: 'lastName',
  surname: 'lastName',
  surname_name: 'lastName',
  nationality: 'nationality',
  countrycode: 'nationality',
  country_code: 'nationality',
  sex: 'sex',
  gender: 'sex',
  dateofbirth: 'dateOfBirth',
  date_of_birth: 'dateOfBirth',
  dob: 'dateOfBirth',
  placeofbirth: 'placeOfBirth',
  place_of_birth: 'placeOfBirth',
  birth_place: 'placeOfBirth',
  placeofissue: 'placeOfIssue',
  place_of_issue: 'placeOfIssue',
  issue_place: 'placeOfIssue',
  maritalstatus: 'maritalStatus',
  marital_status: 'maritalStatus',
  dateofissue: 'dateOfIssue',
  date_of_issue: 'dateOfIssue',
  issuedate: 'dateOfIssue',
  issue_date: 'dateOfIssue',
  doi: 'dateOfIssue',
  dateofexpiry: 'dateOfExpiry',
  date_of_expiry: 'dateOfExpiry',
  expirydate: 'dateOfExpiry',
  expiry_date: 'dateOfExpiry',
  doe: 'dateOfExpiry',
};

const DATE_FIELDS = new Set<PassportAutofillField>(['dateOfBirth', 'dateOfIssue', 'dateOfExpiry']);

export function resolvePassportAutofillField(field: string): PassportAutofillField | null {
  return FIELD_ALIASES[normalizeKey(field)] ?? null;
}

export function normalizePassportDateForInput(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return '';

  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return formatDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);

  const separated = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (separated) {
    const year = separated[3].length === 2
      ? Number(separated[3]) > 50 ? `19${separated[3]}` : `20${separated[3]}`
      : separated[3];
    return formatDateParts(year, separated[2], separated[1]);
  }

  const compact = cleaned.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compact) return formatDateParts(compact[3], compact[2], compact[1]);

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return '';
}

export function normalizePassportAutofillValue(field: PassportAutofillField, value: string): string {
  return DATE_FIELDS.has(field) ? normalizePassportDateForInput(value) : value.trim();
}

function normalizeKey(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function formatDateParts(year: string, month: string, day: string) {
  if (!/^\d{4}$/.test(year)) return '';
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return '';
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
}
