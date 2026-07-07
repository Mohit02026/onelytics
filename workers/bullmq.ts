import { Worker, Queue } from 'bullmq';
import { redis } from '@/lib/redis';
import { processWeeklyReportJob } from '@/workers/weekly-report-send';
import { processBounceCheckJob } from '@/workers/weekly-report-bounce-check';

// Placeholder for future sync jobs (e.g. GA4, Google Ads)
export const syncQueue = new Queue('sync-jobs', {
  connection: redis,
});

// Registering a repeatable job with the same name+pattern is idempotent in
// BullMQ — safe to call on every process start, won't create duplicates.
syncQueue.add('send-weekly-report', {}, { repeat: { pattern: '0 9 * * 1' } }); // Monday 9am
syncQueue.add('reconcile-bounces', {}, { repeat: { pattern: '0 8 * * *' } }); // daily 8am

export const syncWorker = new Worker(
  'sync-jobs',
  async (job) => {
    if (job.name === 'send-weekly-report') return processWeeklyReportJob(job);
    if (job.name === 'reconcile-bounces') return processBounceCheckJob(job);

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
