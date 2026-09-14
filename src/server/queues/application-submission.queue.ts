import { Queue } from 'bullmq';
import Redis from 'ioredis';

let applicationSubmissionQueue: Queue | null = null;

function queue() {
  if (!applicationSubmissionQueue) {
    const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { lazyConnect: true, maxRetriesPerRequest: null });
    applicationSubmissionQueue = new Queue('careers-application-submission', { connection });
  }
  return applicationSubmissionQueue;
}

export async function enqueueApplicationSubmission(payload: { runId: string; idempotencyKey: string }) {
  return queue().add('submit-approved-application', payload, {
    jobId: payload.idempotencyKey,
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  });
}
