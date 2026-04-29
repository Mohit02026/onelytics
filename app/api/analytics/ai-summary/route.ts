import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const schema = z.object({
  totalAdSpend: z.number(),
  googleAdSpend: z.number(),
  metaAdSpend: z.number(),
  totalImpressions: z.number(),
  totalClicks: z.number(),
  organicClicks: z.number(),
  sessions: z.number(),
  avgPosition: z.number(),
  connected: z.object({
    google: z.boolean(),
    meta: z.boolean(),
    wordpress: z.boolean(),
    gsc: z.boolean(),
  }),
  dateRange: z.object({ startDate: z.string(), endDate: z.string() }),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI summary not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid data' }, { status: 400 })

  const d = parsed.data
  const days = Math.round(
    (new Date(d.dateRange.endDate).getTime() - new Date(d.dateRange.startDate).getTime()) / 86400000
  ) + 1

  const lines: string[] = [
    `Date range: ${d.dateRange.startDate} to ${d.dateRange.endDate} (${days} days)`,
    `Total ad spend: $${d.totalAdSpend.toFixed(2)} (Google Ads: $${d.googleAdSpend.toFixed(2)}, Meta: $${d.metaAdSpend.toFixed(2)})`,
    `Total paid impressions: ${d.totalImpressions.toLocaleString()}`,
    `Total paid clicks: ${d.totalClicks.toLocaleString()}`,
  ]
  if (d.connected.gsc) lines.push(`Organic search clicks: ${d.organicClicks.toLocaleString()}, avg position: ${d.avgPosition.toFixed(1)}`)
  if (d.connected.google) lines.push(`Website sessions (GA4): ${d.sessions.toLocaleString()}`)

  const prompt = `You are a concise marketing analyst. Based on this data, write a 2-3 sentence performance summary followed by exactly 3 bullet-point insights. Be specific with numbers. Do not add headers. Format: paragraph summary, then bullet points starting with •.

Marketing data:
${lines.join('\n')}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return Response.json({ summary: text })
}
