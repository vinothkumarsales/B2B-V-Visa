import { Queue } from 'bullmq';
import Redis from 'ioredis';
import type { GenerateApplicationKitInput } from '@/server/careers/application-kit/types';

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export const applicationKitQueue = new Queue('careers-application-kit', { connection });

export async function enqueueApplicationKitTask(payload: GenerateApplicationKitInput) {
  return applicationKitQueue.add('application-kit-task', payload, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 1500 },
    removeOnComplete: true,
  });
}
