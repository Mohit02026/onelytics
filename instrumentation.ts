// Next.js calls register() once when the server process boots. This is the
// only place in this deployment that starts the BullMQ worker — without it,
// workers/bullmq.ts is never imported by anything `next start` runs, so the
// weekly-report cron registers nowhere and never fires.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./workers/bullmq')
  }
}
