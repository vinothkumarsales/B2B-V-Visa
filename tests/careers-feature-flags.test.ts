import assert from 'node:assert/strict';
import test from 'node:test';
import {
  careersFeatureEnabled,
  careersFeatureSnapshot,
  careersSafeMutationEnabled,
} from '../src/server/careers/feature-flags.ts';

test('careers feature flags default to disabled', () => {
  const previous = process.env.CAREERS_SAAS_ENABLED;
  delete process.env.CAREERS_SAAS_ENABLED;
  assert.equal(careersFeatureEnabled('CAREERS_SAAS_ENABLED'), false);
  process.env.CAREERS_SAAS_ENABLED = previous;
});

test('careers snapshot only enables explicit true values', () => {
  const previousSaas = process.env.CAREERS_SAAS_ENABLED;
  const previousPackages = process.env.CAREERS_PACKAGES_ENABLED;
  const previousUpload = process.env.CAREERS_RESUME_UPLOAD_ENABLED;
  process.env.CAREERS_SAAS_ENABLED = 'true';
  process.env.CAREERS_PACKAGES_ENABLED = 'true';
  process.env.CAREERS_RESUME_UPLOAD_ENABLED = 'false';
  const snapshot = careersFeatureSnapshot();
  assert.equal(snapshot.CAREERS_SAAS_ENABLED, true);
  assert.equal(snapshot.CAREERS_PACKAGES_ENABLED, true);
  assert.equal(snapshot.CAREERS_PAYMENTS_ENABLED, false);
  assert.equal(snapshot.CAREERS_CHECKOUT_ENABLED, false);
  assert.equal(snapshot.CAREERS_PAYMENT_WEBHOOKS_ENABLED, false);
  assert.equal(snapshot.CAREERS_FIXTURE_WEBHOOKS_ENABLED, false);
  assert.equal(snapshot.CAREERS_SERVICE_ACTIVATION_ENABLED, false);
  assert.equal(snapshot.CAREERS_SUBSCRIPTION_ACTIVATION_ENABLED, false);
  assert.equal(snapshot.CAREERS_ACTIVATION_HANDOFF_ENABLED, false);
  assert.equal(snapshot.CAREERS_RESUME_UPLOAD_ENABLED, false);
  process.env.CAREERS_SAAS_ENABLED = previousSaas;
  process.env.CAREERS_PACKAGES_ENABLED = previousPackages;
  process.env.CAREERS_RESUME_UPLOAD_ENABLED = previousUpload;
});

test('careers onboarding mutations require both SaaS and onboarding flags', () => {
  const previousSaas = process.env.CAREERS_SAAS_ENABLED;
  const previousOnboarding = process.env.CAREERS_ONBOARDING_ENABLED;
  process.env.CAREERS_SAAS_ENABLED = 'true';
  process.env.CAREERS_ONBOARDING_ENABLED = 'false';
  assert.equal(careersSafeMutationEnabled(), false);
  process.env.CAREERS_ONBOARDING_ENABLED = 'true';
  assert.equal(careersSafeMutationEnabled(), true);
  process.env.CAREERS_SAAS_ENABLED = previousSaas;
  process.env.CAREERS_ONBOARDING_ENABLED = previousOnboarding;
});
