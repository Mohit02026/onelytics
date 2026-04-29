import { Job } from 'bullmq'
import { syncQueue } from '@/workers/bullmq'
import { getGa4Report, DUMMY_TOKEN } from '@/services/google/ga4'
import { refreshAccessToken } from '@/services/google/auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'

export interface Ga4SyncJobData {
  workspaceId: string
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
  const { workspaceId, startDate, endDate } = job.data

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) throw new Error(`No Google account for workspace ${workspaceId}`)

  let accessToken = decrypt(account.accessToken)

  // Refresh if expired (and not a dummy token)
  if (accessToken !== DUMMY_TOKEN) {
    const expiresAt = account.expiresAt?.getTime() ?? 0
    if (Date.now() >= expiresAt - 5 * 60 * 1000 && account.refreshToken) {
      const refreshed = await refreshAccessToken(decrypt(account.refreshToken))
      accessToken = refreshed.accessToken
      await prisma.connectedAccount.update({
        where: { workspaceId_provider: { workspaceId, provider: 'google' } },
        data: {
          accessToken: encrypt(accessToken),
          expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
        },
      })
    }
  }

  const report = await getGa4Report(accessToken, account.propertyId ?? '', startDate, endDate)

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
