import { Job } from 'bullmq'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { generateReportForWorkspace } from '@/services/reports/generate-headless'
import { generatePdf } from '@/services/reports/pdf'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Onelytics Reports <reports@info.exchangefour.com>'

interface WeeklyWorkspace {
  id: string
  name: string
  weeklyReportRecipients: string[]
  members: { userId: string }[]
}

export async function processWeeklyReportJob(_job: Job) {
  const workspaces = await prisma.workspace.findMany({
    where: { weeklyReportEnabled: true, weeklyReportRecipients: { isEmpty: false } },
    select: {
      id: true, name: true, weeklyReportRecipients: true,
      // Automated reports have no connected-sender user anymore — attribute
      // them to the workspace owner instead, since GeneratedReport.createdById
      // is a required field.
      members: { where: { role: 'OWNER' }, select: { userId: true }, take: 1 },
    },
  })

  const results = await Promise.allSettled(workspaces.map(sendWeeklyReportForWorkspace))
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[weekly-report] failed for workspace ${workspaces[i].id}:`, r.reason)
    }
  })
  return results
}

// "Jul 12 – Jul 18, 2026" (same month) or "Jul 28 – Aug 3, 2026" (crossing months)
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${startStr} – ${endStr}`
}

async function sendWeeklyReportForWorkspace(ws: WeeklyWorkspace) {
  if (ws.weeklyReportRecipients.length === 0) return
  const ownerId = ws.members[0]?.userId
  if (!ownerId) return // no owner on record — shouldn't happen, skip rather than fail the create() below

  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6) // last 7 days, inclusive
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const startDate = fmt(start)
  const endDate = fmt(end)
  const title = `${ws.name} — Weekly Report`
  const subject = `${title} (${formatDateRange(startDate, endDate)})`

  const reportData = await generateReportForWorkspace(ws.id, startDate, endDate, title)
  const pdf = await generatePdf(reportData, title, startDate, endDate, new Date())
  const filename = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`

  if (!resend) {
    console.log(`\n--- DEV EMAIL: Weekly Report ---\nTo: ${ws.weeklyReportRecipients.join(', ')}\nSubject: ${subject}\n(PDF attached, ${pdf.length} bytes)\n--------------------------------\n`)
  } else {
    const { error } = await resend.emails.send({
      from: FROM,
      to: ws.weeklyReportRecipients,
      subject,
      html: `<p style="font-family:sans-serif;font-size:14px;color:#1f2937;">Your weekly performance report is attached.</p>`,
      attachments: [{ filename, content: pdf }],
    })
    if (error) throw new Error(`Resend send failed: ${error.message}`)
  }

  await prisma.generatedReport.create({
    data: {
      workspaceId: ws.id,
      title,
      startDate,
      endDate,
      status: 'READY',
      data: reportData as object,
      createdById: ownerId,
    },
  })

  await prisma.workspace.update({
    where: { id: ws.id },
    data: { weeklyReportLastSentAt: new Date() },
  })
}
