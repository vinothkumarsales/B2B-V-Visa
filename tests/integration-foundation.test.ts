import assert from 'node:assert/strict';
import test from 'node:test';
import { getUnresolvedRequiredCrmFields } from '../src/server/integrations/zoho/crm-field-mappings.ts';
import {
  buildTravelAgentMatchOrder,
  normalizeTravelAgentIdentifiers,
} from '../src/server/integrations/zoho/travel-agent-normalization.ts';

test('normalizes Travel Agent email, Indian mobile, GST, and company name', () => {
  const normalized = normalizeTravelAgentIdentifiers({
    portalTravelAgentId: 'agency_123',
    email: '  OWNER@Example.COM ',
    mobile: '+91 81518 61062',
    gstNumber: ' 29 aabcv 1234 f1zg ',
    companyName: '  V Visa   Travels  ',
  });

  assert.equal(normalized.email, 'owner@example.com');
  assert.equal(normalized.mobileE164, '+918151861062');
  assert.equal(normalized.gstNumber, '29AABCV1234F1ZG');
  assert.equal(normalized.companyName, 'V Visa Travels');
});

test('builds deterministic Travel Agent matching order without company-name-only match', () => {
  const normalized = normalizeTravelAgentIdentifiers({
    portalTravelAgentId: 'agency_123',
    email: 'agent@example.com',
    mobile: '8151861062',
    gstNumber: '29AABCV1234F1ZG',
    companyRegistrationId: 'cin-123',
    companyName: 'Only Reference Name',
  });

  assert.deepEqual(buildTravelAgentMatchOrder(normalized), [
    { type: 'PORTAL_UID', value: 'agency_123' },
    { type: 'MOBILE', value: '+918151861062' },
    { type: 'EMAIL', value: 'agent@example.com' },
    { type: 'GST', value: '29AABCV1234F1ZG' },
    { type: 'COMPANY_REGISTRATION', value: 'CIN-123' },
  ]);
});

test('keeps unknown required Zoho custom fields as explicit blockers', () => {
  const unresolved = getUnresolvedRequiredCrmFields()
    .map((field) => `${field.moduleKey}.${field.portalField}`)
    .sort();

  assert.ok(unresolved.includes('Travel_Agents.portalTravelAgentId'));
  assert.ok(unresolved.includes('Leads.countryName'));
  assert.ok(unresolved.includes('Contacts.portalApplicantId'));
});
