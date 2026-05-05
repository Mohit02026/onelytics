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
  PageBreak,
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

// ─── format helpers ───────────────────────────────────────────────────────────

const n = (v: unknown) => (typeof v === 'number' ? v : 0)
const fmt$ = (v: unknown) =>
  '$' + n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (v: unknown) => n(v).toLocaleString('en-US')
const fmtPct = (v: unknown, decimals = 2) => `${n(v).toFixed(decimals)}%`
const fmtX = (v: unknown) => `${n(v).toFixed(2)}x`
const fmtDelta = (d: number) => `${d > 0 ? '+' : ''}${d}%`
const fmtSec = (v: unknown) => {
  const s = n(v)
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

// ─── colour palette ───────────────────────────────────────────────────────────

const C = {
  headerBg: '1E3A5F',     // dark navy — table header fill
  headerText: 'FFFFFF',   // white text in headers
  altRow: 'F0F4F8',       // alternate data row tint
  divider: 'E2E8F0',      // border colour
  accent: '2563EB',       // blue accent
  green: '16A34A',
  red: 'DC2626',
  muted: '6B7280',
  black: '111827',
}

// ─── docx primitives ─────────────────────────────────────────────────────────

const border = { style: 'single' as const, size: 4, color: C.divider }
const allBorders = { top: border, bottom: border, left: border, right: border }

function spacer(lines = 1) {
  return Array.from({ length: lines }, () => new Paragraph({ text: '' }))
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] })
}

function dividerLine() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: C.divider, color: 'auto' },
            borders: { top: border, bottom: border, left: border, right: border },
            children: [new Paragraph({ text: '' })],
          }),
        ],
      }),
    ],
  })
}

function heading1(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 120 },
  })
}

function heading2(text: string, pageBreakBefore = false) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    pageBreakBefore,
    spacing: { before: 320, after: 160 },
  })
}

function heading3(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
  })
}

function hCell(text: string, widthPct?: number) {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: C.headerBg, color: 'auto' },
    borders: allBorders,
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: C.headerText, size: 18 })],
      }),
    ],
  })
}

function dCell(text: string, opts: { bold?: boolean; color?: string; alt?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    shading: opts.alt ? { type: ShadingType.CLEAR, fill: C.altRow, color: 'auto' } : undefined,
    borders: allBorders,
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold ?? false, color: opts.color ?? C.black, size: 18 })],
      }),
    ],
  })
}

// 2-column key/value table used for platform overview metrics
function kvTable(rows: [string, string][], twoCol = true): Table {
  const chunks: [string, string][][] = []
  if (twoCol) {
    for (let i = 0; i < rows.length; i += 2) chunks.push(rows.slice(i, i + 2))
  } else {
    rows.forEach((r) => chunks.push([r]))
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: chunks.map((pair, ri) => {
      const alt = ri % 2 === 1
      const cells: TableCell[] = []
      for (const [label, value] of pair) {
        cells.push(
          new TableCell({
            shading: alt ? { type: ShadingType.CLEAR, fill: C.altRow, color: 'auto' } : undefined,
            borders: allBorders,
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: C.muted, size: 18 })] })],
          }),
          new TableCell({
            shading: alt ? { type: ShadingType.CLEAR, fill: C.altRow, color: 'auto' } : undefined,
            borders: allBorders,
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: value, color: C.black, size: 18 })] })],
          })
        )
      }
      // pad to 4 cells if only one pair
      while (cells.length < 4) {
        cells.push(new TableCell({ borders: allBorders, children: [new Paragraph({ text: '' })] }))
      }
      return new TableRow({ children: cells })
    }),
  })
}

// Generic data table with header row
function dataTable(headers: string[], rows: string[][], colWidths?: number[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => hCell(h, colWidths?.[i])),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell) => dCell(cell, { alt: ri % 2 === 1 })),
        })
      ),
    ],
  })
}

// ─── section builders ─────────────────────────────────────────────────────────

type El = Paragraph | Table

function buildCover(title: string, startDate: string, endDate: string, createdAt: Date): El[] {
  return [
    ...spacer(4),
    new Paragraph({
      children: [new TextRun({ text: 'MARKETING PERFORMANCE REPORT', bold: true, size: 48, color: C.accent })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 36, color: C.black })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Reporting Period: ${startDate}  →  ${endDate}`, size: 24, color: C.muted })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Generated: ${new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        size: 22,
        color: C.muted,
        italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    dividerLine(),
    pageBreak(),
  ]
}

function buildExecutiveSummary(data: ReportData): El[] {
  const s = data.executiveSummary
  const els: El[] = [
    heading2('Executive Summary'),
    kvTable([
      ['Total Ad Spend', fmt$(s.totalSpend)],
      ['Total Impressions', fmtN(s.totalImpressions)],
      ['Total Clicks', fmtN(s.totalClicks)],
      ['Total Conversions', fmtN(s.totalConversions)],
      ['Average CTR', fmtPct(s.avgCtr)],
      ['Average CPA', fmt$(s.avgCpa)],
    ]),
    ...spacer(),
    heading3('Period-over-Period Comparison'),
    dataTable(
      ['Metric', 'Current Period', 'Previous Period', 'Change'],
      data.momComparisons.map((m) => [
        m.label,
        m.format === 'money' ? fmt$(m.current) : m.format === 'pct' ? fmtPct(m.current) : fmtN(m.current),
        m.format === 'money' ? fmt$(m.previous) : m.format === 'pct' ? fmtPct(m.previous) : fmtN(m.previous),
        fmtDelta(m.delta),
      ]),
      [35, 22, 22, 21]
    ),
  ]
  return els
}

function buildChannelSummary(data: ReportData): El[] {
  if (data.channels.length === 0) return []
  const totalSpend = data.channels.reduce((s, c) => s + c.spend, 0)
  return [
    ...spacer(),
    heading3('Channel Performance Summary'),
    dataTable(
      ['Channel', 'Spend', 'Share', 'Impressions', 'Clicks', 'CTR', 'CPM', 'Conv.', 'CPA', 'ROAS'],
      [
        ...data.channels.map((c) => [
          c.channel,
          fmt$(c.spend),
          totalSpend > 0 ? `${((c.spend / totalSpend) * 100).toFixed(1)}%` : '—',
          fmtN(c.impressions),
          fmtN(c.clicks),
          fmtPct(c.ctr),
          fmt$(c.cpm),
          fmtN(c.conversions),
          fmt$(c.cpa),
          c.roas ? fmtX(c.roas) : '—',
        ]),
        // Totals row
        ['TOTAL', fmt$(totalSpend), '100%',
          fmtN(data.executiveSummary.totalImpressions),
          fmtN(data.executiveSummary.totalClicks),
          fmtPct(data.executiveSummary.avgCtr),
          '—',
          fmtN(data.executiveSummary.totalConversions),
          fmt$(data.executiveSummary.avgCpa),
          '—'],
      ]
    ),
  ]
}

function buildGoogleAds(p: Record<string, unknown>): El[] {
  const ov = p.overview as Record<string, unknown> | null
  if (!ov) return []
  const campaigns = (p.campaigns as Record<string, unknown>[] | undefined) ?? []
  const source = p.source as string | undefined

  const els: El[] = [
    heading2('Google Ads', true),
  ]

  if (source === 'ga4') {
    els.push(new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: '⚠ Data sourced from GA4 linked account (Google Ads API pending approval)', italics: true, color: C.muted, size: 18 })],
    }))
  }

  els.push(kvTable([
    ['Ad Spend', fmt$(ov.spend)],
    ['Clicks', fmtN(ov.clicks)],
    ['Impressions', fmtN(ov.impressions)],
    ['CPC', fmt$(ov.cpc)],
    ['ROAS', ov.roas ? fmtX(ov.roas) : '—'],
    ['Conversions', ov.conversions != null ? fmtN(ov.conversions) : '—'],
  ]))

  if (campaigns.length > 0) {
    els.push(...spacer(), heading3('Campaigns'))
    els.push(dataTable(
      ['Campaign', 'Spend', 'Clicks', 'Impressions', 'CPC', 'ROAS'],
      campaigns.slice(0, 10).map((c) => [
        String(c.name ?? ''),
        fmt$(c.spend),
        fmtN(c.clicks),
        fmtN(c.impressions),
        fmt$(c.cpc),
        c.roas ? fmtX(c.roas) : '—',
      ]),
      [34, 13, 12, 15, 13, 13]
    ))
  }

  return els
}

function buildMeta(p: Record<string, unknown>): El[] {
  const ov = p.overview as Record<string, unknown> | null
  if (!ov) return []
  const campaigns = (p.campaigns as Record<string, unknown>[] | undefined) ?? []

  const els: El[] = [
    heading2('Meta Ads', true),
    kvTable([
      ['Ad Spend', fmt$(ov.spend)],
      ['Reach', fmtN(ov.reach)],
      ['Impressions', fmtN(ov.impressions)],
      ['Clicks', fmtN(ov.clicks)],
      ['CTR', fmtPct(ov.ctr)],
      ['CPM', fmt$(ov.cpm)],
      ['Frequency', n(ov.frequency).toFixed(2) + 'x'],
      ['Conversions', fmtN(ov.conversions)],
      ['CPA', fmt$(ov.cpa)],
      ['ROAS', ov.roas ? fmtX(ov.roas) : '—'],
      ['Video Views', fmtN(ov.videoViews)],
      ['', ''],
    ]),
  ]

  if (campaigns.length > 0) {
    els.push(...spacer(), heading3('Campaigns'))
    els.push(dataTable(
      ['Campaign', 'Status', 'Spend', 'Reach', 'Impressions', 'CTR', 'Conv.', 'ROAS'],
      campaigns.slice(0, 10).map((c) => [
        String(c.name ?? ''),
        String(c.status ?? ''),
        fmt$(c.spend),
        fmtN(c.reach),
        fmtN(c.impressions),
        fmtPct(c.ctr),
        fmtN(c.conversions),
        c.roas ? fmtX(c.roas) : '—',
      ]),
      [28, 12, 11, 10, 12, 9, 9, 9]
    ))
  }

  return els
}

function buildTikTok(p: Record<string, unknown>): El[] {
  const ov = p.overview as Record<string, unknown> | null
  if (!ov) return []
  const campaigns = (p.campaigns as Record<string, unknown>[] | undefined) ?? []

  const els: El[] = [
    heading2('TikTok Ads', true),
    kvTable([
      ['Ad Spend', fmt$(ov.spend)],
      ['Reach', fmtN(ov.reach)],
      ['Impressions', fmtN(ov.impressions)],
      ['Clicks', fmtN(ov.clicks)],
      ['CTR', fmtPct(ov.ctr)],
      ['CPM', fmt$(ov.cpm)],
      ['Frequency', n(ov.frequency).toFixed(2) + 'x'],
      ['Conversions', fmtN(ov.conversions)],
      ['CPA', fmt$(ov.cpa)],
      ['ROAS', ov.roas ? fmtX(ov.roas) : '—'],
      ['Video Views', fmtN(ov.videoViews)],
      ['Video View Rate', fmtPct(ov.videoViewRate)],
    ]),
  ]

  if (campaigns.length > 0) {
    els.push(...spacer(), heading3('Campaigns'))
    els.push(dataTable(
      ['Campaign', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Video Views', 'Conv.', 'ROAS'],
      campaigns.slice(0, 10).map((c) => [
        String(c.name ?? ''),
        fmt$(c.spend),
        fmtN(c.impressions),
        fmtN(c.clicks),
        fmtPct(c.ctr),
        fmtN(c.videoViews),
        fmtN(c.conversions),
        c.roas ? fmtX(c.roas) : '—',
      ]),
      [28, 11, 12, 9, 9, 12, 9, 10]
    ))
  }

  return els
}

function buildLinkedIn(p: Record<string, unknown>): El[] {
  const ov = p.overview as Record<string, unknown> | null
  if (!ov) return []
  const campaigns = (p.campaigns as Record<string, unknown>[] | undefined) ?? []

  const els: El[] = [
    heading2('LinkedIn Ads', true),
    kvTable([
      ['Ad Spend', fmt$(ov.spend)],
      ['Impressions', fmtN(ov.impressions)],
      ['Clicks', fmtN(ov.clicks)],
      ['CTR', fmtPct(ov.ctr)],
      ['CPM', fmt$(ov.cpm)],
      ['Conversions', fmtN(ov.conversions)],
      ['Cost/Conv.', fmt$(ov.costPerConversion)],
      ['Eng. Rate', fmtPct(ov.engagementRate)],
      ['Likes', fmtN(ov.likes)],
      ['Comments', fmtN(ov.comments)],
      ['Shares', fmtN(ov.shares)],
      ['Follows', fmtN(ov.follows)],
    ]),
  ]

  if (campaigns.length > 0) {
    els.push(...spacer(), heading3('Campaigns'))
    els.push(dataTable(
      ['Campaign', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conv.', 'Cost/Conv.', 'Likes'],
      campaigns.slice(0, 10).map((c) => [
        String(c.name ?? ''),
        fmt$(c.spend),
        fmtN(c.impressions),
        fmtN(c.clicks),
        fmtPct(c.ctr),
        fmtN(c.conversions),
        fmt$(c.costPerConversion),
        fmtN(c.likes),
      ]),
      [28, 11, 12, 9, 9, 9, 13, 9]
    ))
  }

  return els
}

function buildOrganic(ga4: Record<string, unknown> | null | undefined, gsc: Record<string, unknown> | null | undefined): El[] {
  if (!ga4 && !gsc) return []
  const els: El[] = [heading2('Organic Performance', true)]

  if (ga4?.overview) {
    const ov = ga4.overview as Record<string, unknown>
    const topPages = (ga4.topPages as Record<string, unknown>[] | undefined) ?? []
    els.push(heading3('Website Analytics (GA4)'))
    els.push(kvTable([
      ['Sessions', fmtN(ov.sessions)],
      ['Users', fmtN(ov.users)],
      ['New Users', fmtN(ov.newUsers)],
      ['Pageviews', fmtN(ov.pageviews)],
      ['Bounce Rate', fmtPct(ov.bounceRate)],
      ['Avg. Session', fmtSec(ov.avgSessionDuration)],
    ]))

    if (topPages.length > 0) {
      els.push(...spacer(), heading3('Top Pages'))
      els.push(dataTable(
        ['Page', 'Pageviews', '% of Total', 'Avg. Time on Page'],
        topPages.slice(0, 10).map((p) => [
          String(p.page ?? '').slice(0, 60),
          fmtN(p.pageviews),
          fmtPct(p.percentage),
          fmtSec(p.avgTimeOnPage),
        ]),
        [50, 16, 16, 18]
      ))
    }
  }

  if (gsc?.overview) {
    const ov = gsc.overview as Record<string, unknown>
    const keywords = (gsc.keywords as Record<string, unknown>[] | undefined) ?? []
    els.push(...spacer(), heading3('Search Console (GSC)'))
    els.push(kvTable([
      ['Total Clicks', fmtN(ov.clicks)],
      ['Impressions', fmtN(ov.impressions)],
      ['Avg. CTR', fmtPct(n(ov.ctr) * 100)],
      ['Avg. Position', n(ov.position).toFixed(1)],
    ]))

    if (keywords.length > 0) {
      els.push(...spacer(), heading3('Top Keywords'))
      els.push(dataTable(
        ['Keyword', 'Clicks', 'Impressions', 'CTR', 'Position'],
        keywords.slice(0, 15).map((k) => [
          String(k.keyword ?? ''),
          fmtN(k.clicks),
          fmtN(k.impressions),
          fmtPct(n(k.ctr) * 100),
          n(k.position).toFixed(1),
        ]),
        [44, 14, 16, 13, 13]
      ))
    }
  }

  return els
}

function buildWordPress(wp: Record<string, unknown>): El[] {
  const ov = wp.overview as Record<string, unknown> | null
  if (!ov) return []

  return [
    heading2('Content Performance', true),
    heading3('WordPress'),
    kvTable([
      ['Published Posts', fmtN(ov.published)],
      ['Draft Posts', fmtN(ov.drafts)],
      ['Scheduled Posts', fmtN(ov.scheduled)],
      ['Total Pages', fmtN(ov.totalPages)],
      ['Total Comments', fmtN(ov.totalComments)],
      ['Pending Comments', fmtN(ov.pendingComments)],
    ]),
  ]
}

function buildAiInsights(narrative: string): El[] {
  if (!narrative || narrative.trim() === '') return []
  const els: El[] = [
    heading2('AI Insights', true),
  ]
  for (const line of narrative.split('\n')) {
    const clean = line.replace(/^[•\-\*]\s*/, '').trim()
    if (clean) {
      els.push(new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: clean, size: 20, color: C.black })],
      }))
    }
  }
  return els
}

function buildFooter(createdAt: Date): El[] {
  return [
    ...spacer(2),
    dividerLine(),
    new Paragraph({
      spacing: { before: 120 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: `Generated by Onelytics · ${new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        color: C.muted,
        italics: true,
        size: 16,
      })],
    }),
  ]
}

// ─── document assembler ───────────────────────────────────────────────────────

function buildDoc(
  title: string,
  startDate: string,
  endDate: string,
  createdAt: Date,
  data: ReportData
): Document {
  const p = data.platforms ?? {}
  const children: El[] = []

  // Cover
  children.push(...buildCover(title, startDate, endDate, createdAt))

  // Executive summary + channel summary
  children.push(...buildExecutiveSummary(data))
  children.push(...buildChannelSummary(data))

  // Paid channels — only render if platform data present
  if (p.googleAds?.overview) children.push(...buildGoogleAds(p.googleAds as Record<string, unknown>))
  if (p.meta?.overview) children.push(...buildMeta(p.meta as Record<string, unknown>))
  if (p.tiktok?.overview) children.push(...buildTikTok(p.tiktok as Record<string, unknown>))
  if (p.linkedin?.overview) children.push(...buildLinkedIn(p.linkedin as Record<string, unknown>))

  // Organic
  children.push(...buildOrganic(
    p.ga4 as Record<string, unknown> | null | undefined,
    p.gsc as Record<string, unknown> | null | undefined
  ))

  // Content
  if (p.wordpress) children.push(...buildWordPress(p.wordpress as Record<string, unknown>))

  // AI insights — only if narrative exists
  if (data.aiNarrative?.trim()) children.push(...buildAiInsights(data.aiNarrative))

  // Footer
  children.push(...buildFooter(createdAt))

  return new Document({ sections: [{ children }] })
}
