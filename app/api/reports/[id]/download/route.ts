import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { ReportData } from '@/services/reports/generate'
import { generatePdf } from '@/services/reports/pdf'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await prisma.generatedReport.findUnique({ where: { id: params.id } })
  if (!report || report.workspaceId !== session.user.workspaceId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (report.status !== 'READY' || !report.data) {
    return Response.json({ error: 'Report not ready' }, { status: 409 })
  }

  const reportData = report.data as unknown as ReportData & { pdfCache?: string }
  const slug = report.title.replace(/[^a-z0-9]/gi, '_').slice(0, 60)
  const filename = `${slug}_${report.startDate}_${report.endDate}.pdf`

  // Serve cached PDF if available
  if (reportData.pdfCache) {
    const buffer = Buffer.from(reportData.pdfCache, 'base64')
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // Generate PDF and cache it for future downloads
  const buffer = await generatePdf(reportData, report.title, report.startDate, report.endDate, report.createdAt)
  const pdfCache = (buffer as Buffer).toString('base64')

  prisma.generatedReport.update({
    where: { id: report.id },
    data: { data: { ...(report.data as object), pdfCache } },
  }).catch(() => {})

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
