import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVisaInterestLeadCreateFields,
  splitApplicantName,
} from '../src/server/integrations/zoho/visa-lead-fields.ts';

test('splits applicant names for Zoho Lead required Last_Name', () => {
  assert.deepEqual(splitApplicantName('Aarav Sharma'), { firstName: 'Aarav', lastName: 'Sharma' });
  assert.deepEqual(splitApplicantName('Aarav'), { firstName: '', lastName: 'Aarav' });
  assert.deepEqual(splitApplicantName(''), { firstName: '', lastName: 'Visa Enquiry' });
});

test('builds conservative visa-interest lead create fields', () => {
  const fields = buildVisaInterestLeadCreateFields({
    fields: {
      applicantName: 'Aarav Sharma',
      applicantMobile: '9876543210',
      applicantEmail: 'aarav@example.com',
      countryName: 'United Arab Emirates',
      visaTypeName: 'Tourist Visa',
      category: 'Tourist',
      portalVisaInterestId: 'vi_123',
    },
    customFieldMap: {
      countryName: 'Destination_Country',
      visaTypeName: 'Visa_Type',
      category: 'Visa_Category',
      portalVisaInterestId: 'Portal_Visa_Interest_ID',
    },
  });

  assert.deepEqual(fields, {
    First_Name: 'Aarav',
    Last_Name: 'Sharma',
    Mobile: '9876543210',
    Email: 'aarav@example.com',
    Lead_Source: 'V-Visa B2B Portal',
    Destination_Country: 'United Arab Emirates',
    Visa_Type: 'Tourist Visa',
    Visa_Category: 'Tourist',
    Portal_Visa_Interest_ID: 'vi_123',
  });
});
