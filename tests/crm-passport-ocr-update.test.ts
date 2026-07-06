import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPassportCrmUpdateFields } from '../src/server/integrations/zoho/passport-crm-fields.ts';

test('builds conservative Contact update fields from passport OCR data', () => {
  const fields = buildPassportCrmUpdateFields({
    module: 'Contacts',
    passportFields: {
      passportNumber: 'J8151861',
      firstName: 'Aarav',
      lastName: 'Sharma',
      dateOfExpiry: '2031-02-09',
    },
    customFieldMap: {
      passportNumber: 'Passport_Number',
      dateOfExpiry: 'Passport_Expiry',
    },
  });

  assert.deepEqual(fields, {
    First_Name: 'Aarav',
    Last_Name: 'Sharma',
    Passport_Number: 'J8151861',
    Passport_Expiry: '2031-02-09',
  });
});

test('uses discovered default Zoho passport fields without env overrides', () => {
  const fields = buildPassportCrmUpdateFields({
    module: 'Leads',
    passportFields: {
      passportNumber: 'J8151861',
      firstName: 'Aarav',
      lastName: 'Sharma',
    },
    customFieldMap: {},
  });

  assert.deepEqual(fields, {
    First_Name: 'Aarav',
    Last_Name: 'Sharma',
    Passport_Number: 'J8151861',
  });
});



