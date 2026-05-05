import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  ShadingType,
  AlignmentType,
} from 'docx'
import type { ReportData } from '@/services/reports/generate'

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

  const doc = buildDoc(report.title, report.startDate, report.endDate, report.createdAt, data)
  const buffer = new Uint8Array(await Packer.toBuffer(doc))

  const slug = report.title.replace(/[^a-z0-9]/gi, '_').slice(0, 60)
  const filename = `${slug}_${report.startDate}_${report.endDate}.docx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// ─── helpers ────────────────────────────────────────────────────────────────

const HEADER_FILL = 'E9ECEF'
const BORDER_COLOR = 'CCCCCC'

const borderSide = { style: 'single' as const, size: 4, color: BORDER_COLOR }
const allBorders = { top: borderSide, bottom: borderSide, left: borderSide, right: borderSide }

const fmt$ = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (n: number) => n.toLocaleString('en-US')
const fmtPct = (n: number) => `${n.toFixed(2)}%`
const fmtDelta = (n: number) => `${n > 0 ? '+' : ''}${n}%`
const fmtByType = (v: number, fmt: string) =>
  fmt === 'money' ? fmt$(v) : fmt === 'pct' ? fmtPct(v) : fmtN(v)

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } })
}

function spacer() {
  return new Paragraph({ text: '' })
}

function labelValue(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value }),
    ],
  })
}

function headerCell(text: string) {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: HEADER_FILL, color: 'auto' },
    borders: allBorders,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18 })],
      }),
    ],
  })
}

function dataCell(text: string, bold = false, color?: string) {
  return new TableCell({
    borders: allBorders,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold, color, size: 18 })],
      }),
    ],
  })
}

// ─── document builder ───────────────────────────────────────────────────────

function buildDoc(
  title: string,
  startDate: string,
  endDate: string,
  createdAt: Date,
  data: ReportData
): Document {
  const children: (Paragraph | Table)[] = []

  // ── Title ──
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
    })
  )
  children.push(
    new Paragraph({
      spacing: { after: 320 },
      children: [
        new TextRun({ text: `Period: ${startDate} → ${endDate}`, color: '555555' }),
        new TextRun({ text: '   ·   ', color: 'AAAAAA' }),
        new TextRun({
          text: `Generated: ${new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          color: '555555',
        }),
      ],
    })
  )

  // ── Executive Summary ──
  children.push(heading('Executive Summary', HeadingLevel.HEADING_2))
  children.push(labelValue('Total Ad Spend', fmt$(data.executiveSummary.totalSpend)))
  children.push(labelValue('Total Impressions', fmtN(data.executiveSummary.totalImpressions)))
  children.push(labelValue('Total Clicks', fmtN(data.executiveSummary.totalClicks)))
  children.push(labelValue('Total Conversions', fmtN(data.executiveSummary.totalConversions)))
  children.push(labelValue('Average CTR', fmtPct(data.executiveSummary.avgCtr)))
  children.push(labelValue('Average CPA', fmt$(data.executiveSummary.avgCpa)))

  // ── AI Narrative ──
  if (data.aiNarrative) {
    children.push(spacer())
    children.push(heading('AI Insights', HeadingLevel.HEADING_3))
    for (const line of data.aiNarrative.split('\n')) {
      const clean = line.replace(/^[•\-\*]\s*/, '').trim()
      if (clean) children.push(new Paragraph({ text: clean, spacing: { after: 80 } }))
    }
  }

  // ── Period-over-Period Comparison ──
  children.push(spacer())
  children.push(heading('Period-over-Period Comparison', HeadingLevel.HEADING_2))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['Metric', 'Current', 'Previous', 'Change'].map(headerCell),
        }),
        ...data.momComparisons.map(
          (m) =>
            new TableRow({
              children: [
                dataCell(m.label),
                dataCell(fmtByType(m.current, m.format)),
                dataCell(fmtByType(m.previous, m.format)),
                dataCell(fmtDelta(m.delta), true, m.delta >= 0 ? '16A34A' : 'DC2626'),
              ],
            })
        ),
      ],
    })
  )

  // ── Channel Breakdown ──
  if (data.channels.length > 0) {
    const totalSpend = data.channels.reduce((s, c) => s + c.spend, 0)

    children.push(spacer())
    children.push(heading('Channel Performance Breakdown', HeadingLevel.HEADING_2))
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              'Channel',
              'Spend',
              'Share',
              'Impressions',
              'Clicks',
              'CTR',
              'CPM',
              'Conversions',
              'CPA',
            ].map(headerCell),
          }),
          ...data.channels.map(
            (c) =>
              new TableRow({
                children: [
                  dataCell(c.channel),
                  dataCell(fmt$(c.spend)),
                  dataCell(
                    totalSpend > 0
                      ? `${((c.spend / totalSpend) * 100).toFixed(1)}%`
                      : '0%'
                  ),
                  dataCell(fmtN(c.impressions)),
                  dataCell(fmtN(c.clicks)),
                  dataCell(fmtPct(c.ctr)),
                  dataCell(fmt$(c.cpm)),
                  dataCell(fmtN(c.conversions)),
                  dataCell(fmt$(c.cpa)),
                ],
              })
          ),
          // Totals
          new TableRow({
            children: [
              dataCell('TOTAL', true),
              dataCell(fmt$(totalSpend), true),
              dataCell('100%'),
              dataCell(fmtN(data.executiveSummary.totalImpressions), true),
              dataCell(fmtN(data.executiveSummary.totalClicks), true),
              dataCell(fmtPct(data.executiveSummary.avgCtr), true),
              dataCell('—'),
              dataCell(fmtN(data.executiveSummary.totalConversions), true),
              dataCell(fmt$(data.executiveSummary.avgCpa), true),
            ],
          }),
        ],
      })
    )
  }

  children.push(spacer())
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Report generated by Onelytics on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          color: 'AAAAAA',
          italics: true,
          size: 16,
        }),
      ],
    })
  )

  return new Document({ sections: [{ children }] })
}
