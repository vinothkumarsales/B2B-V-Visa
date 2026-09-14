import assert from 'node:assert/strict';
import test from 'node:test';
import {
  careerCandidateFacingStatus,
  careerProfileCompletion,
} from '../src/server/careers/policy.ts';

test('career profile completion reaches 100 for required onboarding answers', () => {
  assert.equal(
    careerProfileCompletion({
      fullName: 'Asha Rao',
      currentCountry: 'India',
      nationality: 'Indian',
      currentTitle: 'Software Engineer',
      experienceYears: 5,
      targetRoles: ['Backend Engineer'],
      sponsorshipRequired: true,
      relocationRequired: true,
    }),
    100,
  );
});

test('career profile completion identifies partial onboarding data', () => {
  assert.equal(
    careerProfileCompletion({
      fullName: 'Asha Rao',
      currentCountry: '',
      nationality: 'Indian',
      currentTitle: '',
      experienceYears: 5,
      targetRoles: [],
      sponsorshipRequired: true,
      relocationRequired: false,
    }),
    63,
  );
});

test('candidate-facing statuses stay non-technical', () => {
  assert.equal(careerCandidateFacingStatus('subscription_active'), 'Search activated');
  assert.equal(careerCandidateFacingStatus('unknown_internal_state'), 'Preparing your service');
});
