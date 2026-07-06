import { env } from '@/lib/env';
import { zohoCrmFetch } from './oauth';
import {
  buildPassportCrmUpdateFields,
  type PassportCrmCustomFieldMap,
  type PassportCrmFields,
  type PassportCrmModule,
} from './passport-crm-fields';
import {
  buildVisaInterestLeadCreateFields,
  type VisaLeadCustomFieldMap,
  type VisaLeadFields,
} from './visa-lead-fields';
import {
  buildTravelAgentCrmFields,
  type TravelAgentCrmFields,
  type TravelAgentCustomFieldMap,
} from './travel-agent-fields';

export { buildPassportCrmUpdateFields } from './passport-crm-fields';
export type { PassportCrmCustomFieldMap, PassportCrmFields, PassportCrmModule } from './passport-crm-fields';
export async function createZohoCrmRecord(input: {
  moduleApiName: string;
  fields: Record<string, string>;
}) {
  if (!input.moduleApiName) throw validationError('MISSING_CRM_MODULE');
  if (Object.keys(input.fields).length === 0) throw validationError('NO_MAPPED_CRM_FIELDS');

  const response = await zohoCrmFetch(`/${input.moduleApiName}`, {
    method: 'POST',
    body: JSON.stringify({ data: [input.fields] }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const code = String(data.code || data.message || `ZOHO_CRM_CREATE_${response.status}`);
    const error = new Error(code);
    error.name = 'ZohoCrmRecordUpdateError';
    throw error;
  }

  const first = Array.isArray(data.data) ? data.data[0] as Record<string, unknown> | undefined : undefined;
  const details = first?.details && typeof first.details === 'object' ? first.details as Record<string, unknown> : undefined;
  return {
    providerRecordId: String(details?.id || ''),
    responseCode: String(first?.code || 'SUCCESS'),
  };
}
export async function updateZohoCrmRecord(input: {
  moduleApiName: string;
  recordId: string;
  fields: Record<string, string>;
}) {
  if (!input.moduleApiName || !input.recordId) throw validationError('MISSING_CRM_TARGET');
  if (Object.keys(input.fields).length === 0) throw validationError('NO_MAPPED_CRM_FIELDS');

  const response = await zohoCrmFetch(`/${input.moduleApiName}/${input.recordId}`, {
    method: 'PUT',
    body: JSON.stringify({ data: [input.fields] }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const code = String(data.code || data.message || `ZOHO_CRM_UPDATE_${response.status}`);
    const error = new Error(code);
    error.name = 'ZohoCrmRecordUpdateError';
    throw error;
  }

  const first = Array.isArray(data.data) ? data.data[0] as Record<string, unknown> | undefined : undefined;
  const details = first?.details && typeof first.details === 'object' ? first.details as Record<string, unknown> : undefined;
  return {
    providerRecordId: String(details?.id || input.recordId),
    responseCode: String(first?.code || 'SUCCESS'),
  };
}

export function buildConfiguredPassportCrmUpdateFields(input: {
  module: PassportCrmModule;
  passportFields: PassportCrmFields;
}): Record<string, string> {
  return buildPassportCrmUpdateFields({
    module: input.module,
    passportFields: input.passportFields,
    customFieldMap: getPassportCustomFieldMap(input.module),
  });
}

export function getPassportCustomFieldMap(module: PassportCrmModule): PassportCrmCustomFieldMap {
  const values = env as unknown as Record<string, string | undefined>;
  const prefix = module === 'Contacts' ? 'CONTACT' : 'LEAD';
  return {
    documentName: values[`ZOHO_CRM_${prefix}_DOCUMENT_NAME_FIELD`],
    passportNumber: values[`ZOHO_CRM_${prefix}_PASSPORT_NUMBER_FIELD`],
    description: values[`ZOHO_CRM_${prefix}_DESCRIPTION_FIELD`],
    serviceRequested: values[`ZOHO_CRM_${prefix}_SERVICE_REQUESTED_FIELD`],
    fatherFirstName: values[`ZOHO_CRM_${prefix}_FATHER_FIRST_NAME_FIELD`],
    fatherLastName: values[`ZOHO_CRM_${prefix}_FATHER_LAST_NAME_FIELD`],
    motherName: values[`ZOHO_CRM_${prefix}_MOTHER_NAME_FIELD`],
    nationality: values[`ZOHO_CRM_${prefix}_PASSPORT_NATIONALITY_FIELD`],
    sex: values[`ZOHO_CRM_${prefix}_PASSPORT_SEX_FIELD`],
    dateOfBirth: values[`ZOHO_CRM_${prefix}_PASSPORT_DOB_FIELD`],
    dateOfExpiry: values[`ZOHO_CRM_${prefix}_PASSPORT_EXPIRY_DATE_FIELD`],
    destinationCountry: values[`ZOHO_CRM_${prefix}_DESTINATION_COUNTRY_FIELD`],
    addressLine1: values[`ZOHO_CRM_${prefix}_ADDRESS_LINE_1_FIELD`],
    addressLine2: values[`ZOHO_CRM_${prefix}_ADDRESS_LINE_2_FIELD`],
    placeOfBirth: values[`ZOHO_CRM_${prefix}_PASSPORT_PLACE_OF_BIRTH_FIELD`],
    placeOfIssue: values[`ZOHO_CRM_${prefix}_PASSPORT_PLACE_OF_ISSUE_FIELD`],
    maritalStatus: values[`ZOHO_CRM_${prefix}_PASSPORT_MARITAL_STATUS_FIELD`],
    dateOfIssue: values[`ZOHO_CRM_${prefix}_PASSPORT_ISSUE_DATE_FIELD`],
  };
}


export function buildConfiguredVisaInterestLeadCreateFields(fields: VisaLeadFields): Record<string, string> {
  const values = env as unknown as Record<string, string | undefined>;
  const customFieldMap: VisaLeadCustomFieldMap = {
    countryName: values.ZOHO_CRM_LEAD_COUNTRY_FIELD,
    visaTypeName: values.ZOHO_CRM_LEAD_VISA_TYPE_FIELD,
    category: values.ZOHO_CRM_LEAD_CATEGORY_FIELD,
    portalVisaInterestId: values.ZOHO_CRM_LEAD_PORTAL_VISA_INTEREST_ID_FIELD,
  };

  return buildVisaInterestLeadCreateFields({ fields, customFieldMap });
}

export function buildConfiguredTravelAgentCrmFields(fields: TravelAgentCrmFields): Record<string, string> {
  const values = env as unknown as Record<string, string | undefined>;
  const customFieldMap: TravelAgentCustomFieldMap = {
    portalTravelAgentId: values.ZOHO_CRM_TRAVEL_AGENT_PORTAL_ID_FIELD,
    gstNumber: values.ZOHO_CRM_TRAVEL_AGENT_GST_FIELD,
    panCard: values.ZOHO_CRM_TRAVEL_AGENT_PAN_FIELD,
    postalCode: values.ZOHO_CRM_TRAVEL_AGENT_POSTAL_CODE_FIELD,
    portalSource: values.ZOHO_CRM_TRAVEL_AGENT_SOURCE_FIELD,
  };

  return buildTravelAgentCrmFields({ fields, customFieldMap });
}
function validationError(code: string) {
  const error = new Error(code);
  error.name = 'ValidationError';
  return error;
}





