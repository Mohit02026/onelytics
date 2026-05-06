import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getGscReport } from '@/services/google/gsc'
import { resolveGoogleToken } from '@/services/google/auth'
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  compareStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  compareEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})


export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = schema.safeParse({
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    compareStartDate: searchParams.get('compareStartDate'),
    compareEndDate: searchParams.get('compareEndDate'),
  })
  if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 })

  const workspaceId = session.user.workspaceId
  const { startDate, endDate, compareStartDate, compareEndDate } = parsed.data

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 404 })

  const meta = account.metadata as Record<string, string> | null
  const siteUrl = meta?.gscSiteUrl ?? ''

  const cacheKey = `${startDate}:${endDate}:${compareStartDate ?? 'none'}:${compareEndDate ?? 'none'}`
  const cached = await prisma.analyticsCache.findUnique({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'gsc', dataType: 'report', dateRange: cacheKey,
      },
    },
  })
  if (cached && Date.now() - cached.fetchedAt.getTime() < 6 * 60 * 60 * 1000) {
    return Response.json(cached.data)
  }

  const accessToken = await resolveGoogleToken(workspaceId, account)
  const report = await getGscReport(
    accessToken, siteUrl, startDate, endDate,
    compareStartDate ?? undefined, compareEndDate ?? undefined
  )

  await prisma.analyticsCache.upsert({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'gsc', dataType: 'report', dateRange: cacheKey,
      },
    },
    update: { data: report as object, fetchedAt: new Date() },
    create: {
      workspaceId, provider: 'gsc', dataType: 'report',
      dateRange: cacheKey, data: report as object,
    },
  })

  return Response.json(report)
}
