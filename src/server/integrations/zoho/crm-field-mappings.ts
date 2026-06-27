export type CrmFieldOwnership = 'PORTAL' | 'CRM' | 'SHARED';
export type CrmPiiClass = 'NONE' | 'CONTACT' | 'IDENTITY' | 'FINANCIAL' | 'DOCUMENT_METADATA';
export type CrmUpdatePolicy = 'CREATE_ONLY' | 'PORTAL_OVERWRITES' | 'CRM_OWNED_SKIP' | 'MANUAL_REVIEW';

export type CrmFieldMapping = {
  portalField: string;
  zohoFieldApiName: string | null;
  required: boolean;
  normalisation: string;
  ownership: CrmFieldOwnership;
  updatePolicy: CrmUpdatePolicy;
  pii: CrmPiiClass;
};

export type CrmModuleMapping = {
  moduleKey: string;
  envModuleKey: string;
  fields: CrmFieldMapping[];
};

export const crmFieldMappings = {
  Travel_Agents: {
    moduleKey: 'Travel_Agents',
    envModuleKey: 'ZOHO_CRM_TRAVEL_AGENTS_MODULE',
    fields: [
      field('portalTravelAgentId', null, true, 'cuid', 'PORTAL', 'CREATE_ONLY', 'NONE'),
      field('agencyName', 'Name', true, 'trim_spaces', 'SHARED', 'MANUAL_REVIEW', 'CONTACT'),
      field('verifiedMobile', 'Phone', false, 'e164_india', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('verifiedEmail', 'Email', false, 'lowercase_email', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('gstNumber', null, false, 'trim_uppercase', 'PORTAL', 'PORTAL_OVERWRITES', 'FINANCIAL'),
      field('city', 'City', false, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('state', 'State', false, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('country', 'Country', false, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('postalCode', 'Zip_Code', false, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('portalSource', 'Lead_Source', false, 'literal:V-Visa B2B Portal', 'PORTAL', 'CREATE_ONLY', 'NONE'),
    ],
  },
  Leads: {
    moduleKey: 'Leads',
    envModuleKey: 'ZOHO_CRM_LEADS_MODULE',
    fields: [
      field('leadName', 'Last_Name', true, 'neutral_lead_name_when_unknown', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('countryName', null, true, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'NONE'),
      field('visaTypeName', null, true, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'NONE'),
      field('travelAgentCrmId', null, true, 'crm_record_id', 'PORTAL', 'MANUAL_REVIEW', 'NONE'),
      field('portalVisaInterestId', null, true, 'cuid', 'PORTAL', 'CREATE_ONLY', 'NONE'),
      field('leadSource', 'Lead_Source', false, 'literal:V-Visa B2B Portal', 'PORTAL', 'CREATE_ONLY', 'NONE'),
    ],
  },
  Contacts: {
    moduleKey: 'Contacts',
    envModuleKey: 'ZOHO_CRM_CONTACTS_MODULE',
    fields: [
      field('firstName', 'First_Name', false, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('lastName', 'Last_Name', true, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('mobile', 'Mobile', false, 'e164_india', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('email', 'Email', false, 'lowercase_email', 'PORTAL', 'PORTAL_OVERWRITES', 'CONTACT'),
      field('portalApplicantId', null, true, 'cuid', 'PORTAL', 'CREATE_ONLY', 'NONE'),
      field('travelAgentLookup', null, true, 'crm_lookup', 'PORTAL', 'MANUAL_REVIEW', 'NONE'),
    ],
  },
  Transactions: {
    moduleKey: 'Transactions',
    envModuleKey: 'ZOHO_CRM_TRANSACTIONS_MODULE',
    fields: [
      field('portalPaymentId', null, true, 'cuid', 'PORTAL', 'CREATE_ONLY', 'FINANCIAL'),
      field('providerPaymentId', null, true, 'provider_reference', 'PORTAL', 'CREATE_ONLY', 'FINANCIAL'),
      field('amountMinor', null, true, 'minor_units', 'PORTAL', 'CREATE_ONLY', 'FINANCIAL'),
      field('applicationId', null, true, 'cuid', 'PORTAL', 'CREATE_ONLY', 'NONE'),
    ],
  },
  Applications: {
    moduleKey: 'Applications',
    envModuleKey: 'ZOHO_CRM_APPLICATIONS_MODULE',
    fields: [
      field('portalApplicationId', null, true, 'cuid', 'PORTAL', 'CREATE_ONLY', 'NONE'),
      field('destination', null, true, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'NONE'),
      field('visaType', null, true, 'trim_spaces', 'PORTAL', 'PORTAL_OVERWRITES', 'NONE'),
      field('status', null, true, 'enum_application_status', 'PORTAL', 'PORTAL_OVERWRITES', 'NONE'),
    ],
  },
  Attachments: {
    moduleKey: 'Attachments',
    envModuleKey: 'ZOHO_CRM_NOTES_MODULE',
    fields: [
      field('portalDocumentId', null, true, 'cuid', 'PORTAL', 'CREATE_ONLY', 'DOCUMENT_METADATA'),
      field('checksum', null, true, 'sha256', 'PORTAL', 'CREATE_ONLY', 'DOCUMENT_METADATA'),
      field('documentType', null, true, 'trim_spaces', 'PORTAL', 'CREATE_ONLY', 'DOCUMENT_METADATA'),
    ],
  },
} satisfies Record<string, CrmModuleMapping>;

export function getUnresolvedRequiredCrmFields() {
  return Object.values(crmFieldMappings).flatMap((module) =>
    module.fields
      .filter((mapping) => mapping.required && !mapping.zohoFieldApiName)
      .map((mapping) => ({
        moduleKey: module.moduleKey,
        envModuleKey: module.envModuleKey,
        portalField: mapping.portalField,
      })),
  );
}

function field(
  portalField: string,
  zohoFieldApiName: string | null,
  required: boolean,
  normalisation: string,
  ownership: CrmFieldOwnership,
  updatePolicy: CrmUpdatePolicy,
  pii: CrmPiiClass,
): CrmFieldMapping {
  return {
    portalField,
    zohoFieldApiName,
    required,
    normalisation,
    ownership,
    updatePolicy,
    pii,
  };
}
