import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import IORedisMock from 'ioredis-mock';
import { runApplicationKit, resumeApplicationKit } from '@/server/careers/application-kit/application-kit.service';
import { readCheckpoint } from '@/server/careers/application-kit/application-kit.service';

const connection = process.env.REDIS_URL ? new IORedis(process.env.REDIS_URL) : new IORedisMock();

const worker = new Worker(
  'careers-application-kit',
  async (job) => {
    const input = job.data || {};
    const runId = String(input.runId ?? '');
    const candidateId = String(input.candidateId ?? '');
    const jobId = String(input.jobId ?? '');
    const jobSummary = input.jobSummary || undefined;

    const existing = runId ? await readCheckpoint(runId) : null;
    const result = existing ? await resumeApplicationKit({ input: { runId, candidateId, jobId, jobSummary }, state: existing }) : await runApplicationKit({ runId, candidateId, jobId, jobSummary });

    return {
      ok: result.errors.length === 0,
      status: result.status,
      jobId,
      warnings: result.warnings,
      errors: result.errors,
      requestHash: result.requestHash,
    };
  },
  { connection, concurrency: 1 },
);

worker.on('failed', (job, err) => {
  console.log(`careers-application-kit failed: ${job?.id}: ${err?.message || err}`);
});

worker.on('completed', (job, result) => {
  console.log(`careers-application-kit completed: ${job?.id}: ${result?.status}`);
});

console.log('BullMQ careers-application-kit worker ready');
