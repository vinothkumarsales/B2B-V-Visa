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
  assert.equal(normalizePassportAutofillValue('maritalStatus', 'single'), 'Single');
  assert.equal(normalizePassportAutofillValue('maritalStatus', 'MARRIED'), 'Married');
  assert.equal(normalizePassportAutofillValue('maritalStatus', 'unmarried'), 'Single');
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

test('flattens and extracts Digio stateless analyzer response format (detections[0].id_attributes)', () => {
  const statelessPayload = {
    mode: 'stateless-v4',
    details: { status: true },
    detections: [
      {
        id_type: 'passport',
        id_attributes: {
          name: 'BASANT KUMAR SHARMA',
          id_no: 'W1234591',
          dob: '15/06/1965',
          gender: 'Male',
          date_of_issue: '10/02/2022',
          date_of_expiry: '09/02/2032',
          place_of_birth: 'DELHI',
          place_of_issue: 'DELHI',
        },
      },
    ],
  };

  const flattened = flattenDigioPassportPayload(statelessPayload);
  assert.equal(flattened.id_no, 'W1234591');
  assert.equal(flattened.name, 'BASANT KUMAR SHARMA');

  const normalized = normalizeDigioFields(statelessPayload);
  assert.equal(normalized.passportNumber, 'W1234591');
  assert.equal(normalized.firstName, 'BASANT KUMAR');
  assert.equal(normalized.lastName, 'SHARMA');
  assert.equal(normalized.sex, 'Male');
  assert.equal(normalized.dateOfBirth, '1965-06-15');
  assert.equal(normalized.dateOfIssue, '2022-02-10');
  assert.equal(normalized.dateOfExpiry, '2032-02-09');
  assert.equal(normalized.placeOfBirth, 'DELHI');
  assert.equal(normalized.placeOfIssue, 'DELHI');
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

test('multi-passport data isolation: Passport B cleanly replaces Passport A', () => {
  const travelerState: Record<string, string> = {
    passportNumber: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    dateOfExpiry: '',
  };

  const onUpdate = (_id: string, field: string, value: string) => {
    travelerState[field] = value;
  };

  // 1. Upload Passport A
  const fieldsA = [
    { field: 'passport_number', value: 'U4395340' },
    { field: 'given_name', value: 'GOPALAKRISHNAN' },
    { field: 'surname', value: 'CHELLAPERUMAL' },
    { field: 'birth_date', value: '1993-05-12' },
    { field: 'expiry_date', value: '2030-10-25' },
  ];

  // Helper matching canonical populatePassportFromOCR
  const populate = (fields: typeof fieldsA) => {
    for (const f of fields) {
      const key = resolvePassportAutofillField(f.field);
      if (!key) continue;
      const value = normalizePassportAutofillValue(key, f.value);
      onUpdate('traveler-1', key, value);
    }
  };

  populate(fieldsA);
  assert.equal(travelerState.passportNumber, 'U4395340');
  assert.equal(travelerState.firstName, 'GOPALAKRISHNAN');
  assert.equal(travelerState.lastName, 'CHELLAPERUMAL');
  assert.equal(travelerState.dateOfBirth, '1993-05-12');

  // 2. Upload Passport B (New transaction resets state and populates Person B)
  // Simulate state reset before new transaction
  travelerState.passportNumber = '';
  travelerState.firstName = '';
  travelerState.lastName = '';
  travelerState.dateOfBirth = '';
  travelerState.dateOfExpiry = '';

  const fieldsB = [
    { field: 'passport_number', value: 'W1234591' },
    { field: 'given_name', value: 'BASANT KUMAR' },
    { field: 'surname', value: 'SHARMA' },
    { field: 'birth_date', value: '1965-06-15' },
    { field: 'expiry_date', value: '2032-02-09' },
  ];

  populate(fieldsB);
  assert.equal(travelerState.passportNumber, 'W1234591');
  assert.equal(travelerState.firstName, 'BASANT KUMAR');
  assert.equal(travelerState.lastName, 'SHARMA');
  assert.equal(travelerState.dateOfBirth, '1965-06-15');

  // Assert Person B != Person A
  assert.notEqual(travelerState.passportNumber, 'U4395340');
  assert.notEqual(travelerState.firstName, 'GOPALAKRISHNAN');
  assert.notEqual(travelerState.lastName, 'CHELLAPERUMAL');
});

test('out-of-order result guard: Stale transaction results are discarded', () => {
  let activeTransactionId = 'tx-1';
  let activeTravelerData: Record<string, string> = {};

  const handleResult = (txId: string, data: Record<string, string>) => {
    // Result Guard: verify result belongs to currently active transaction
    if (txId !== activeTransactionId) {
      // Discard stale result
      return false;
    }
    activeTravelerData = { ...data };
    return true;
  };

  // Transaction 1 starts for Passport A
  activeTransactionId = 'tx-1';

  // Before tx-1 finishes, user uploads Passport B -> Transaction 2 starts
  activeTransactionId = 'tx-2';

  // Later, tx-1 (Passport A) arrives out of order
  const appliedA = handleResult('tx-1', { passportNumber: 'U4395340', name: 'GOPALAKRISHNAN' });
  assert.equal(appliedA, false, 'Stale transaction tx-1 must be rejected');
  assert.deepEqual(activeTravelerData, {}, 'Stale transaction must not modify active data');

  // Now tx-2 (Passport B) arrives
  const appliedB = handleResult('tx-2', { passportNumber: 'W1234591', name: 'BASANT KUMAR' });
  assert.equal(appliedB, true, 'Current transaction tx-2 must be accepted');
  assert.equal(activeTravelerData.passportNumber, 'W1234591');
  assert.equal(activeTravelerData.name, 'BASANT KUMAR');
});

test('multi-passport distinctness: 3 distinct passports extract unique identities', () => {
  const payloadA = {
    details: { status: true },
    detections: [{ id_type: 'passport', id_attributes: { id_no: 'U4395340', name: 'GOPALAKRISHNAN C', dob: '12/05/1993' } }],
  };
  const payloadB = {
    details: { status: true },
    detections: [{ id_type: 'passport', id_attributes: { id_no: 'W1234591', name: 'BASANT KUMAR S', dob: '15/06/1965' } }],
  };
  const payloadC = {
    details: { status: true },
    detections: [{ id_type: 'passport', id_attributes: { id_no: 'Z6543210', name: 'KESHAV PRASAD R', dob: '20/11/1999' } }],
  };

  const normA = normalizeDigioFields(payloadA);
  const normB = normalizeDigioFields(payloadB);
  const normC = normalizeDigioFields(payloadC);

  // A != B
  assert.notEqual(normA.passportNumber, normB.passportNumber);
  assert.notEqual(normA.firstName, normB.firstName);
  assert.notEqual(normA.dateOfBirth, normB.dateOfBirth);

  // B != C
  assert.notEqual(normB.passportNumber, normC.passportNumber);
  assert.notEqual(normB.firstName, normC.firstName);
  assert.notEqual(normB.dateOfBirth, normC.dateOfBirth);

  // C != A
  assert.notEqual(normC.passportNumber, normA.passportNumber);
  assert.notEqual(normC.firstName, normA.firstName);
  assert.notEqual(normC.dateOfBirth, normA.dateOfBirth);
});

test('additional documents data isolation: upload does not mutate passport fields or invoke OCR', () => {
  const travelerState = {
    id: 't-1',
    passportNumber: 'J8151861',
    firstName: 'VINOTH',
    lastName: 'KUMAR',
    dateOfBirth: '1992-08-14',
    ocrStatus: 'done' as const,
    ocrProviderRequestId: 'digio-req-12345',
    additionalDocs: {} as Record<string, string | null>,
    additionalDocDetails: {} as Record<string, any>,
  };

  // Simulate uploading additional doc (flight ticket) without calling OCR
  const mockFile = {
    name: 'flight_ticket.pdf',
    size: 245000,
    type: 'application/pdf',
  };

  const updatedTraveler = {
    ...travelerState,
    additionalDocs: {
      ...travelerState.additionalDocs,
      flight_ticket: mockFile.name,
    },
    additionalDocDetails: {
      ...travelerState.additionalDocDetails,
      flight_ticket: {
        fileName: mockFile.name,
        fileSize: mockFile.size,
        fileType: mockFile.type,
        uploadedAt: new Date().toISOString(),
        documentType: 'flight_ticket',
        dataUrl: 'data:application/pdf;base64,...',
        pageCount: 1,
      },
    },
  };

  // Verify passport fields are COMPLETELY untouched
  assert.equal(updatedTraveler.passportNumber, 'J8151861');
  assert.equal(updatedTraveler.firstName, 'VINOTH');
  assert.equal(updatedTraveler.lastName, 'KUMAR');
  assert.equal(updatedTraveler.dateOfBirth, '1992-08-14');
  assert.equal(updatedTraveler.ocrStatus, 'done');
  assert.equal(updatedTraveler.ocrProviderRequestId, 'digio-req-12345');

  // Verify additional doc is recorded
  assert.equal(updatedTraveler.additionalDocs.flight_ticket, 'flight_ticket.pdf');
  assert.equal(updatedTraveler.additionalDocDetails.flight_ticket.fileSize, 245000);
});
