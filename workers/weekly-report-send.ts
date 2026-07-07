import { Job } from 'bullmq'
import { prisma } from '@/lib/db'
import { generateReportForWorkspace } from '@/services/reports/generate-headless'
import type { ReportData } from '@/services/reports/generate'
import { generatePdf } from '@/services/reports/pdf'
import { resolveMailAccessToken } from '@/services/google/mail-auth'
import { sendReportEmail } from '@/services/google/mail-send'

interface WeeklyWorkspace {
  id: string
  name: string
  weeklyReportRecipients: string[]
  weeklyReportSenderId: string | null
}

export async function processWeeklyReportJob(_job: Job) {
  const workspaces = await prisma.workspace.findMany({
    where: { weeklyReportEnabled: true, weeklyReportSenderId: { not: null } },
    select: { id: true, name: true, weeklyReportRecipients: true, weeklyReportSenderId: true },
  })

  const results = await Promise.allSettled(workspaces.map(sendWeeklyReportForWorkspace))
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[weekly-report] failed for workspace ${workspaces[i].id}:`, r.reason)
    }
  })
  return results
}

async function sendWeeklyReportForWorkspace(ws: WeeklyWorkspace) {
  if (!ws.weeklyReportSenderId || ws.weeklyReportRecipients.length === 0) return

  const mailbox = await prisma.connectedMailbox.findUnique({
    where: { userId_provider: { userId: ws.weeklyReportSenderId, provider: 'google' } },
  })
  if (!mailbox) {
    // Sender's mailbox is gone but the workspace wasn't updated — disable
    // rather than fail silently every run.
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { weeklyReportEnabled: false, weeklyReportSenderId: null },
    })
    return
  }

  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6) // last 7 days, inclusive
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const startDate = fmt(start)
  const endDate = fmt(end)
  const title = `${ws.name} — Weekly Report`

  const reportData = await generateReportForWorkspace(ws.id, startDate, endDate, title)
  const pdf = await generatePdf(reportData, title, startDate, endDate, new Date())
  const accessToken = await resolveMailAccessToken(ws.weeklyReportSenderId)

  await sendReportEmail({
    accessToken,
    from: mailbox.emailAddress,
    to: ws.weeklyReportRecipients,
    subject: title,
    html: buildEmailHtml(reportData, ws.name),
    attachment: {
      filename: `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      contentType: 'application/pdf',
      data: pdf as Buffer,
    },
  })

  await prisma.generatedReport.create({
    data: {
      workspaceId: ws.id,
      title,
      startDate,
      endDate,
      status: 'READY',
      data: reportData as object,
      createdById: ws.weeklyReportSenderId,
    },
  })

  await prisma.workspace.update({
    where: { id: ws.id },
    data: { weeklyReportLastSentAt: new Date() },
  })
}

function buildEmailHtml(data: ReportData, workspaceName: string): string {
  const es = data.executiveSummary
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; color: #1f2937;">
      <h2 style="margin-bottom: 4px;">${workspaceName} — Weekly Performance Report</h2>
      <p style="color: #6b7280; margin-top: 0;">${data.dateRange.startDate} to ${data.dateRange.endDate}</p>
      <p>
        Total spend: <strong>$${es.totalSpend.toFixed(2)}</strong> ·
        Conversions: <strong>${es.totalConversions}</strong> ·
        Avg CPA: <strong>$${es.avgCpa.toFixed(2)}</strong>
      </p>
      <p style="color: #6b7280;">Full report attached as PDF.</p>
    </div>
  `
}
