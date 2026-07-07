import test from 'node:test';
import assert from 'node:assert/strict';
import { getGoogleRedirectUri } from '../src/server/auth/google-oauth.ts';

test('google oauth callback uses the server origin only', () => {
  assert.equal(
    getGoogleRedirectUri('https://business.vvisa.in'),
    'https://business.vvisa.in/api/auth/google/callback',
  );
});
