import { Job } from 'bullmq'
import { syncQueue } from '@/workers/bullmq'
import { getGa4Report } from '@/services/google/ga4'
import { prisma } from '@/lib/db'

export interface Ga4SyncJobData {
  workspaceId: string
  propertyId: string
  startDate: string
  endDate: string
}

export async function enqueueGa4Sync(data: Ga4SyncJobData) {
  return syncQueue.add('sync:ga4', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}

export async function processGa4SyncJob(job: Job<Ga4SyncJobData>) {
  const { workspaceId, propertyId, startDate, endDate } = job.data

  const report = await getGa4Report(workspaceId, propertyId, startDate, endDate)

  await prisma.analyticsCache.upsert({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId,
        provider: 'ga4',
        dataType: 'report',
        dateRange: `${startDate}:${endDate}`,
      },
    },
    update: { data: report as object, fetchedAt: new Date() },
    create: {
      workspaceId,
      provider: 'ga4',
      dataType: 'report',
      dateRange: `${startDate}:${endDate}`,
      data: report as object,
    },
  })
}
