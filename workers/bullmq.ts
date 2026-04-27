import { Worker, Queue } from 'bullmq';
import { redis } from '@/lib/redis';

// Placeholder for future sync jobs (e.g. GA4, Google Ads)
export const syncQueue = new Queue('sync-jobs', {
  connection: redis,
});

export const syncWorker = new Worker(
  'sync-jobs',
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    console.log('Job data:', job.data);
    // Real implementation will go here in future phases
    return { success: true };
  },
  {
    connection: redis,
  }
);

syncWorker.on('completed', (job) => {
  console.log(`${job.id} has completed!`);
});

syncWorker.on('failed', (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
