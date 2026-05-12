import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateReport, generateAINarrative } from '@/services/reports/generate'
import { z } from 'zod'
import { headers } from 'next/headers'

const VALID_PLATFORMS = ['googleAds', 'meta', 'tiktok', 'linkedin', 'ga4', 'gsc', 'gbp', 'wordpress'] as const
type Platform = typeof VALID_PLATFORMS[number]

const schema = z.object({
  title: z.string().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selectedPlatforms: z.array(z.enum(VALID_PLATFORMS)).min(1).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const reports = await prisma.generatedReport.findMany({
    where: { workspaceId: session.user.workspaceId },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(reports)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { title, startDate, endDate, selectedPlatforms } = parsed.data
  const platforms: Platform[] = selectedPlatforms ?? [...VALID_PLATFORMS]
  const workspaceId = session.user.workspaceId
  const userId = session.user.id

  // Create placeholder row
  const report = await prisma.generatedReport.create({
    data: {
      workspaceId,
      title,
      startDate,
      endDate,
      status: 'GENERATING',
      createdById: userId,
    },
    select: { id: true, title: true, status: true },
  })

  // Generate synchronously (fast enough with caching; background jobs can be added later)
  const headerStore = headers()
  const cookie = headerStore.get('cookie') ?? ''
  const baseUrl = process.env.NEXTAUTH_URL!

  try {
    const data = await generateReport(workspaceId, startDate, endDate, title, baseUrl, cookie, platforms)
    await prisma.generatedReport.update({
      where: { id: report.id },
      data: { status: 'READY', data: data as object },
    })

    // Fire AI narrative in background — does not block the response
    generateAINarrative(data).then(async (narrative) => {
      if (!narrative) return
      const current = await prisma.generatedReport.findUnique({ where: { id: report.id }, select: { data: true } })
      if (!current?.data) return
      await prisma.generatedReport.update({
        where: { id: report.id },
        data: { data: { ...(current.data as object), aiNarrative: narrative }, summary: narrative },
      })
    }).catch(() => {})

    return Response.json({ ...report, status: 'READY' })
  } catch (err) {
    await prisma.generatedReport.update({
      where: { id: report.id },
      data: { status: 'FAILED' },
    })
    console.error('Report generation failed:', err)
    return Response.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
