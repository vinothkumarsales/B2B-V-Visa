import assert from 'node:assert/strict';
import test from 'node:test';
import {
  careersDemoJobs,
  careersDemoMaterials,
  careersDemoTimeline,
} from '../src/server/careers/demo-data.ts';

test('careers demo journey covers the full fixture presentation path', () => {
  assert.equal(careersDemoTimeline.length, 12);
  assert.equal(careersDemoTimeline[0].label, 'Resume uploaded');
  assert.equal(careersDemoTimeline.at(-1)?.label, 'Interview task created');
});

test('careers demo data stays fixture-only and useful for the presentation', () => {
  assert.equal(careersDemoJobs.length, 6);
  assert.equal(careersDemoMaterials.length, 4);
  assert.ok(careersDemoJobs.some((job) => job.status === 'Submitted'));
  assert.ok(careersDemoJobs.every((job) => job.company.length > 0 && job.nextStep.length > 0));
});
