import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getGa4Report } from '@/services/google/ga4'
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = schema.safeParse({
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
  })
  if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 })

  const workspaceId = session.user.workspaceId
  const { startDate, endDate } = parsed.data

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 404 })

  // Check cache first
  const cacheKey = `${startDate}:${endDate}`
  const cached = await prisma.analyticsCache.findUnique({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId,
        provider: 'ga4',
        dataType: 'report',
        dateRange: cacheKey,
      },
    },
  })

  // Return cache if fresher than 6 hours
  if (cached && Date.now() - cached.fetchedAt.getTime() < 6 * 60 * 60 * 1000) {
    return Response.json(cached.data)
  }

  const report = await getGa4Report(workspaceId, account.propertyId ?? '', startDate, endDate)

  await prisma.analyticsCache.upsert({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId,
        provider: 'ga4',
        dataType: 'report',
        dateRange: cacheKey,
      },
    },
    update: { data: report as object, fetchedAt: new Date() },
    create: {
      workspaceId,
      provider: 'ga4',
      dataType: 'report',
      dateRange: cacheKey,
      data: report as object,
    },
  })

  return Response.json(report)
}
