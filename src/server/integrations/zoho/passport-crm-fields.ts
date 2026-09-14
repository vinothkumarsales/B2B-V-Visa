export type PassportCrmFields = {
  documentName?: string;
  passportNumber?: string;
  description?: string;
  serviceRequested?: string;
  firstName?: string;
  lastName?: string;
  fatherFirstName?: string;
  fatherLastName?: string;
  motherName?: string;
  nationality?: string;
  sex?: string;
  dateOfBirth?: string;
  dateOfExpiry?: string;
  destinationCountry?: string;
  addressLine1?: string;
  addressLine2?: string;
  placeOfBirth?: string;
  placeOfIssue?: string;
  maritalStatus?: string;
  dateOfIssue?: string;
};

export type PassportCrmModule = 'Contacts' | 'Leads';

export type PassportCrmCustomFieldMap = Partial<Record<keyof PassportCrmFields, string | null | undefined>>;

const DEFAULT_LEAD_FIELD_MAP: PassportCrmCustomFieldMap = {
  documentName: 'Document_name',
  passportNumber: 'Passport_Number',
  description: 'Description',
  serviceRequested: 'Visa_Type',
  fatherFirstName: 'Father_s_First_Name',
  fatherLastName: 'Father_s_Last_Name',
  motherName: 'Mother_s_Name',
  dateOfBirth: 'DOB',
  dateOfExpiry: 'Passport_Expiry',
  sex: 'Gender',
  destinationCountry: 'Destination_Country',
  addressLine1: 'Address_Line_1',
  addressLine2: 'Address_Line_2',
  nationality: 'Nationality',
};

const DEFAULT_CONTACT_FIELD_MAP: PassportCrmCustomFieldMap = {
  documentName: 'Document_Name1',
  passportNumber: 'Document_Number',
  description: 'Description1',
  serviceRequested: 'Service_Requested1',
  fatherFirstName: 'Father_s_First_Name',
  fatherLastName: 'Father_s_Last_Name',
  motherName: 'Mother_s_Name',
  dateOfBirth: 'Date_of_Birth',
  dateOfExpiry: 'Document_Expiry',
  sex: 'Gender',
  destinationCountry: 'Destination_Country',
  addressLine1: 'Address_Line_1',
  addressLine2: 'Address_Line_2',
  nationality: 'Nationality',
};

export function buildPassportCrmUpdateFields(input: {
  module: PassportCrmModule;
  passportFields: PassportCrmFields;
  customFieldMap?: PassportCrmCustomFieldMap;
}): Record<string, string> {
  const mapped: Record<string, string> = {};
  const fields = input.passportFields;

  if (input.module === 'Contacts') {
    assign(mapped, 'First_Name', fields.firstName);
    assign(mapped, 'Last_Name', fields.lastName);
  }

  if (input.module === 'Leads') {
    assign(mapped, 'First_Name', fields.firstName);
    assign(mapped, 'Last_Name', fields.lastName);
  }

  const defaultMap = input.module === 'Contacts' ? DEFAULT_CONTACT_FIELD_MAP : DEFAULT_LEAD_FIELD_MAP;
  const customMap = { ...defaultMap, ...(input.customFieldMap ?? {}) };
  for (const [portalField, zohoField] of Object.entries(customMap)) {
    if (!zohoField) continue;
    const value = fields[portalField as keyof PassportCrmFields];
    assign(mapped, zohoField, value);
  }

  return mapped;
}

function assign(target: Record<string, string>, key: string, value?: string) {
  const cleaned = value?.trim();
  if (cleaned) target[key] = cleaned;
}

