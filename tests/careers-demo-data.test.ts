import assert from 'node:assert/strict';
import test from 'node:test';
import {
  careersDemoAgents,
  careersDemoApplicationAnswers,
  careersDemoCandidate,
  careersDemoCoverLetter,
  careersDemoMetrics,
  careersDemoRecruiterEmail,
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

test('careers demo includes all required visible agents', () => {
  assert.deepEqual(careersDemoAgents.map((agent) => agent.name), [
    'Candidate Intake Agent',
    'Resume Extraction Agent',
    'Job Discovery Agent',
    'Job Evaluation Agent',
    'Sponsorship Fit Agent',
    'Application Kit Agent',
    'Internal Review Agent',
    'Tracking Agent',
  ]);
  assert.ok(careersDemoAgents.every((agent) => agent.result && agent.completedAt && agent.confidence));
});

test('careers demo includes resume extraction and generated material fixtures', () => {
  assert.equal(careersDemoCandidate.name, 'Manoj Kumar');
  assert.equal(careersDemoCandidate.skills.length, 10);
  assert.ok(careersDemoCandidate.missingInformation.includes('Expected salary'));
  assert.equal(careersDemoCoverLetter.company, 'Northbridge Labs GmbH');
  assert.equal(careersDemoRecruiterEmail.mailboxDraft, 'Planned / demo only');
  assert.equal(careersDemoApplicationAnswers.length, 3);
  assert.ok(careersDemoApplicationAnswers.some((answer) => answer.answer.includes('requires candidate confirmation')));
  assert.ok(careersDemoMetrics.some(([label, value]) => label === 'Cover letters generated' && value === '4'));
});
