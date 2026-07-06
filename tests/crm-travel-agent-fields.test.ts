import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTravelAgentCrmFields } from '../src/server/integrations/zoho/travel-agent-fields.ts';

test('builds conservative Travel_Agents fields with optional custom mappings', () => {
  const fields = buildTravelAgentCrmFields({
    fields: {
      portalTravelAgentId: 'agency_123',
      agencyName: 'V Visa Travels',
      email: 'owner@example.com',
      mobile: '+918151861062',
      gstNumber: '29AABCV1234F1ZG',
      panCard: 'AABCV1234F',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560001',
      portalSource: 'V-Visa B2B Portal',
    },
    customFieldMap: {
      portalTravelAgentId: 'Portal_Agency_ID',
      gstNumber: 'GST_Number',
      panCard: 'PAN_Number',
      postalCode: 'Pin_Code',
      portalSource: 'Portal_Source',
    },
  });

  assert.deepEqual(fields, {
    Name: 'V Visa Travels',
    Email: 'owner@example.com',
    Phone: '+918151861062',
    City: 'Bengaluru',
    State: 'Karnataka',
    Country: 'India',
    Portal_Agency_ID: 'agency_123',
    GST_Number: '29AABCV1234F1ZG',
    PAN_Number: 'AABCV1234F',
    Pin_Code: '560001',
    Portal_Source: 'V-Visa B2B Portal',
  });
});

test('does not invent Travel_Agents custom field API names', () => {
  const fields = buildTravelAgentCrmFields({
    fields: {
      portalTravelAgentId: 'agency_123',
      agencyName: 'V Visa Travels',
      gstNumber: '29AABCV1234F1ZG',
    },
    customFieldMap: {},
  });

  assert.deepEqual(fields, {
    Name: 'V Visa Travels',
  });
});
