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

  const data = report.data as unknown as ReportData
  
  // React-pdf renderToBuffer returns a Node Buffer
  const buffer = await generatePdf(data, report.title, report.startDate, report.endDate, report.createdAt)

  const slug = report.title.replace(/[^a-z0-9]/gi, '_').slice(0, 60)
  const filename = `${slug}_${report.startDate}_${report.endDate}.pdf`

  return new Response(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
