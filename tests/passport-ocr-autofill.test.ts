import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizePassportAutofillValue,
  normalizePassportDateForInput,
  resolvePassportAutofillField,
} from '../src/lib/ocr/passport-fields.ts';

test('maps Digio passport OCR aliases to traveler autofill fields', () => {
  assert.equal(resolvePassportAutofillField('passport_number'), 'passportNumber');
  assert.equal(resolvePassportAutofillField('given_name'), 'firstName');
  assert.equal(resolvePassportAutofillField('surname'), 'lastName');
  assert.equal(resolvePassportAutofillField('expiry_date'), 'dateOfExpiry');
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
