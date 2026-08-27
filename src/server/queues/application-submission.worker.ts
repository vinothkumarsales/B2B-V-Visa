import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import IORedisMock from 'ioredis-mock';
import { executeApprovedSubmission } from '@/server/careers/application-submission.service';

const connection = process.env.REDIS_URL ? new IORedis(process.env.REDIS_URL) : new IORedisMock();

const worker = new Worker('careers-application-submission', async job => {
  const runId = String(job.data?.runId || '');
  const idempotencyKey = String(job.data?.idempotencyKey || '');
  const result = await executeApprovedSubmission({ runId, idempotencyKey });
  return { ok: result.status === 'submitted', status: result.status, idempotencyKey };
}, { connection, concurrency: 1 });

worker.on('failed', (job, error) => console.log(`careers-application-submission failed: ${job?.id}: ${error.message}`));
worker.on('completed', (job, result) => console.log(`careers-application-submission completed: ${job.id}: ${result.status}`));
