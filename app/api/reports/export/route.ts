import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateSinglePlatformPdf } from '@/services/reports/pdf-single'
import { headers } from 'next/headers'
import { z } from 'zod'

const VALID_PLATFORMS = ['googleAds', 'meta', 'tiktok', 'linkedin', 'ga4', 'gsc', 'gbp', 'wordpress'] as const

const PLATFORM_SLUG: Record<string, string> = {
  googleAds: 'ads',
  meta: 'meta',
  tiktok: 'tiktok',
  linkedin: 'linkedin',
  ga4: 'ga4',
  gsc: 'gsc',
  gbp: 'gbp',
  wordpress: 'wordpress',
}

const schema = z.object({
  platform: z.enum(VALID_PLATFORMS),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { platform, startDate, endDate } = parsed.data
  const workspaceId = session.user.workspaceId
  const headerStore = headers()
  const cookie = headerStore.get('cookie') ?? ''
  const baseUrl = process.env.NEXTAUTH_URL!
  const slug = PLATFORM_SLUG[platform]

  // Fetch platform data
  const qs = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ''
  let platformData: Record<string, unknown> | null = null
  try {
    const res = await fetch(`${baseUrl}/api/analytics/${slug}${qs}`, {
      headers: { Cookie: cookie },
    })
    if (res.ok) platformData = await res.json()
  } catch {
    // fall through — will generate empty PDF
  }

  if (!platformData) {
    return Response.json({ error: 'Could not fetch platform data. Ensure the integration is connected.' }, { status: 502 })
  }

  // Get workspace name for the cover page
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  })

  try {
    const pdfBuffer = await generateSinglePlatformPdf({
      platform,
      data: platformData,
      workspaceName: workspace?.name ?? 'Workspace',
      startDate,
      endDate,
    })

    const platformLabels: Record<string, string> = {
      googleAds: 'Google-Ads', meta: 'Meta-Ads', tiktok: 'TikTok-Ads',
      linkedin: 'LinkedIn-Ads', ga4: 'GA4', gsc: 'Search-Console',
      gbp: 'Google-Business', wordpress: 'WordPress',
    }
    const filename = `${platformLabels[platform] ?? platform}-Report-${startDate}-${endDate}.pdf`

    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('Single-platform PDF generation failed:', err)
    return Response.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
