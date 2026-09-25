import { Worker, Queue } from 'bullmq';
import { redis } from '@/lib/redis';
import { processWeeklyReportJob } from '@/workers/weekly-report-send';

// Placeholder for future sync jobs (e.g. GA4, Google Ads)
export const syncQueue = new Queue('sync-jobs', {
  connection: redis,
});

// The pre-rewrite code registered these under different repeat options (no
// tz, different pattern/name) — BullMQ keys repeatables by name+options, so
// it never replaced them on its own. Remove the stale ones explicitly;
// no-op once cleaned up.
syncQueue.removeRepeatable('send-weekly-report', { pattern: '0 9 * * 1' });
syncQueue.removeRepeatable('reconcile-bounces', { pattern: '0 8 * * *' });
// One-off retry slots used today to catch up this week's send while the
// worker-startup bugs got fixed in turn (never ran at all → redis config →
// Chromium version mismatch). All superseded now that '30 15 * * 5' is back.
syncQueue.removeRepeatable('send-weekly-report', { pattern: '10 18 * * 5', tz: 'Asia/Kolkata' });
syncQueue.removeRepeatable('send-weekly-report', { pattern: '35 18 * * 5', tz: 'Asia/Kolkata' });
syncQueue.removeRepeatable('send-weekly-report', { pattern: '0 19 * * 5', tz: 'Asia/Kolkata' });

// Registering a repeatable job with the same name+pattern is idempotent in
// BullMQ — safe to call on every process start, won't create duplicates.
// Friday 3:30pm IST. Bounce tracking is now Resend's own webhook
// (app/api/webhooks/resend/route.ts) rather than a polling job.
syncQueue.add('send-weekly-report', {}, { repeat: { pattern: '30 15 * * 5', tz: 'Asia/Kolkata' } });

export const syncWorker = new Worker(
  'sync-jobs',
  async (job) => {
    if (job.name === 'send-weekly-report') return processWeeklyReportJob(job);

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
