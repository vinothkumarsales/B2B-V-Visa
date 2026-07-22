import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mittoFeatures, mittoJourney, prohibitedMittoClaims } from '../src/components/careers/mitto-career-data.ts';

describe('Mitto Career product language', () => {
  it('models the complete managed candidate journey', () => {
    assert.ok(mittoJourney.length >= 5);
    assert.match(mittoJourney[0]?.[0] ?? '', /upload|profile/i);
    assert.match(mittoJourney.at(-1)?.[0] ?? '', /review|tracking/i);
  });

  it('uses explicit availability labels', () => {
    const allowed = ['Available', 'Demo mode', 'Behind feature flag', 'Coming next'];
    assert.ok(mittoFeatures.every((feature) => allowed.includes(feature.status)));
  });

  it('keeps prohibited outcome claims out of feature copy', () => {
    const copy = JSON.stringify(mittoFeatures).toLowerCase();
    for (const claim of prohibitedMittoClaims) assert.ok(!copy.includes(claim.toLowerCase()));
  });
});
