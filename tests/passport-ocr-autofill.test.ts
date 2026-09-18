import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizePassportAutofillValue,
  normalizePassportDateForInput,
  resolvePassportAutofillField,
} from '../src/lib/ocr/passport-fields.ts';
import {
  flattenDigioPassportPayload,
  normalizeDigioFields,
} from '../src/server/integrations/digio/document-intelligence.ts';

test('maps Digio passport OCR aliases to traveler autofill fields', () => {
  assert.equal(resolvePassportAutofillField('passport_number'), 'passportNumber');
  assert.equal(resolvePassportAutofillField('given_name'), 'firstName');
  assert.equal(resolvePassportAutofillField('surname'), 'lastName');
  assert.equal(resolvePassportAutofillField('expiry_date'), 'dateOfExpiry');
  assert.equal(resolvePassportAutofillField('doc_number'), 'passportNumber');
  assert.equal(resolvePassportAutofillField('id_card_no'), 'passportNumber');
  assert.equal(resolvePassportAutofillField('full_name'), 'firstName');
  assert.equal(resolvePassportAutofillField('birth_date'), 'dateOfBirth');
  assert.equal(resolvePassportAutofillField('unrelated_field'), null);
});

test('normalizes passport OCR date formats for HTML date inputs', () => {
  assert.equal(normalizePassportDateForInput('14/08/1992'), '1992-08-14');
  assert.equal(normalizePassportDateForInput('14-08-92'), '1992-08-14');
  assert.equal(normalizePassportDateForInput('1992-08-14'), '1992-08-14');
  assert.equal(normalizePassportDateForInput('14081992'), '1992-08-14');
  assert.equal(normalizePassportDateForInput('bad date'), '');
});

test('normalizes passport OCR values before autofill', () => {
  assert.equal(normalizePassportAutofillValue('passportNumber', ' J8151861 '), 'J8151861');
  assert.equal(normalizePassportAutofillValue('dateOfIssue', '10/02/2021'), '2021-02-10');
});

test('flattens and extracts Digio stateless analyzer response format (raw.details)', () => {
  const statelessPayload = {
    mode: 'stateless-v4',
    details: {
      status: true,
      id_number: 'J8151861',
      name: 'VINOTH KUMAR',
      dob: '14/08/1992',
      gender: 'Male',
      doi: '10/02/2021',
      doe: '09/02/2031',
      place_of_birth: 'TAMIL NADU',
      place_of_issue: 'CHENNAI',
      nationality: 'IND',
    },
    detections: [],
  };

  const flattened = flattenDigioPassportPayload(statelessPayload);
  assert.equal(flattened.id_number, 'J8151861');
  assert.equal(flattened.name, 'VINOTH KUMAR');

  const normalized = normalizeDigioFields(statelessPayload);
  assert.equal(normalized.passportNumber, 'J8151861');
  assert.equal(normalized.firstName, 'VINOTH');
  assert.equal(normalized.lastName, 'KUMAR');
  assert.equal(normalized.nationality, 'Indian');
  assert.equal(normalized.sex, 'Male');
  assert.equal(normalized.dateOfBirth, '1992-08-14');
  assert.equal(normalized.dateOfIssue, '2021-02-10');
  assert.equal(normalized.dateOfExpiry, '2031-02-09');
  assert.equal(normalized.placeOfBirth, 'TAMIL NADU');
  assert.equal(normalized.placeOfIssue, 'CHENNAI');
});

test('flattens and extracts Digio template session response format (raw.actions)', () => {
  const templatePayload = {
    id: 'KID260917001',
    status: 'success',
    actions: [
      {
        type: 'image',
        status: 'approved',
        details: {
          id_number: 'Z9876543',
          first_name: 'PRIYA',
          last_name: 'NAIR',
          dob: '25/12/1995',
          gender: 'F',
          doi: '01/01/2020',
          doe: '31/12/2029',
          place_of_birth: 'KOCHI',
          place_of_issue: 'KOCHI',
          nationality: 'INDIAN',
        },
      },
    ],
  };

  const normalized = normalizeDigioFields(templatePayload);
  assert.equal(normalized.passportNumber, 'Z9876543');
  assert.equal(normalized.firstName, 'PRIYA');
  assert.equal(normalized.lastName, 'NAIR');
  assert.equal(normalized.nationality, 'Indian');
  assert.equal(normalized.sex, 'Female');
  assert.equal(normalized.dateOfBirth, '1995-12-25');
  assert.equal(normalized.dateOfIssue, '2020-01-01');
  assert.equal(normalized.dateOfExpiry, '2029-12-31');
  assert.equal(normalized.placeOfBirth, 'KOCHI');
});

test('handles single names and compound names gracefully', () => {
  const singleNamePayload = {
    details: {
      id_number: 'A1234567',
      name: 'RAHUL',
      dob: '01/01/1990',
    },
  };
  const normSingle = normalizeDigioFields(singleNamePayload);
  assert.equal(normSingle.firstName, 'RAHUL');
  assert.equal(normSingle.lastName, '');

  const multiNamePayload = {
    details: {
      id_number: 'B7654321',
      name: 'MOHAMMED ABDUL KARIM',
      dob: '01/01/1988',
    },
  };
  const normMulti = normalizeDigioFields(multiNamePayload);
  assert.equal(normMulti.firstName, 'MOHAMMED ABDUL');
  assert.equal(normMulti.lastName, 'KARIM');
});

test('handles empty and partial OCR payload safely without crashing', () => {
  const emptyPayload = { details: { status: false, error_message: 'No ID card detected' } };
  const normalized = normalizeDigioFields(emptyPayload);
  assert.equal(normalized.passportNumber, '');
  assert.equal(normalized.firstName, '');
  assert.equal(normalized.lastName, '');
  assert.equal(normalized.dateOfBirth, '');
});
