export interface WpOverview {
  totalPosts: number
  published: number
  drafts: number
  totalComments: number
}

export interface WpPost {
  id: number
  title: string
  status: 'publish' | 'draft' | 'private'
  date: string // ISO
  link: string
  commentCount: number
}

export interface WpReport {
  overview: WpOverview
  recentPosts: WpPost[]
  dateRange: { startDate: string; endDate: string }
}

// ─── Real WordPress REST API ──────────────────────────────────────────────────
// Uses Application Passwords (Basic Auth): user:appPassword → base64

export async function getWpReportFromApi(
  siteUrl: string,
  credentials: string, // base64 encoded "user:appPassword"
  startDate: string,
  endDate: string
): Promise<WpReport> {
  const base = siteUrl.replace(/\/$/, '')
  const headers = { Authorization: `Basic ${credentials}` }

  // Fetch site-wide counts (no date filter) + recent posts in parallel
  const [publishedRes, draftsRes, commentsRes, recentRes] = await Promise.all([
    fetch(`${base}/wp-json/wp/v2/posts?per_page=1&status=publish&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/posts?per_page=1&status=draft&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/comments?per_page=1&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc&status=publish,draft&_fields=id,title,status,date,link,comment_count`, { headers }),
  ])

  if (!publishedRes.ok) {
    const err = await publishedRes.json().catch(() => ({}))
    throw new Error(`WordPress API error: ${(err as { message?: string }).message ?? publishedRes.status}`)
  }

  type WpApiPost = {
    id: number
    title: { rendered: string }
    status: string
    date: string
    link: string
    comment_count: number
  }

  const published = parseInt(publishedRes.headers.get('X-WP-Total') ?? '0', 10)
  const drafts = draftsRes.ok ? parseInt(draftsRes.headers.get('X-WP-Total') ?? '0', 10) : 0
  const totalComments = commentsRes.ok ? parseInt(commentsRes.headers.get('X-WP-Total') ?? '0', 10) : 0
  const totalPosts = published + drafts

  const rawPosts: WpApiPost[] = recentRes.ok ? await recentRes.json() : []

  const recentPosts: WpPost[] = rawPosts.map((p) => ({
    id: p.id,
    title: p.title.rendered.replace(/<[^>]+>/g, ''),
    status: (p.status === 'publish' ? 'publish' : p.status === 'draft' ? 'draft' : 'private') as WpPost['status'],
    date: p.date,
    link: p.link,
    commentCount: p.comment_count ?? 0,
  }))

  return {
    overview: { totalPosts, published, drafts, totalComments },
    recentPosts,
    dateRange: { startDate, endDate },
  }
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

function seeded(n: number) {
  const x = Math.sin(n + 11) * 10000
  return x - Math.floor(x)
}

export function getWpReportDummy(startDate: string, endDate: string): WpReport {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000)
  const postCount = Math.floor(dayCount / 3) + 4

  const titles = [
    'How to Reduce Ad Spend Without Losing Conversions',
    'GA4 Migration: What You Need to Know',
    'Search Console Secrets for Higher Rankings',
    'Understanding ROAS in Google Ads',
    'Meta Ads vs Google Ads: Which Drives Better ROI',
    'Building a Unified Marketing Dashboard',
    'The Complete Guide to UTM Parameters',
    'Improving Your Quality Score in 2025',
    'Keyword Research for PPC Campaigns',
    'Understanding Attribution Models',
  ]

  const recentPosts: WpPost[] = Array.from({ length: Math.min(postCount, 10) }, (_, i) => {
    const d = new Date(end)
    d.setDate(d.getDate() - Math.floor(seeded(i + 1) * dayCount))
    return {
      id: 100 + i,
      title: titles[i % titles.length],
      status: seeded(i + 2) > 0.15 ? 'publish' : 'draft',
      date: d.toISOString(),
      link: `https://example.com/blog/post-${100 + i}`,
      commentCount: Math.floor(seeded(i + 3) * 24),
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as WpPost[]

  const published = recentPosts.filter((p) => p.status === 'publish').length
  const drafts = recentPosts.filter((p) => p.status === 'draft').length

  return {
    overview: {
      totalPosts: 47,
      published: 41,
      drafts: 6,
      totalComments: 183,
    },
    recentPosts,
    dateRange: { startDate, endDate },
  }
}

export const DUMMY_CREDENTIALS = 'dummy_wp_credentials'

export async function getWpReport(
  siteUrl: string,
  credentials: string,
  startDate: string,
  endDate: string
): Promise<WpReport> {
  if (credentials === DUMMY_CREDENTIALS) return getWpReportDummy(startDate, endDate)
  return getWpReportFromApi(siteUrl, credentials, startDate, endDate)
}
