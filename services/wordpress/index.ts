export interface WpOverview {
  totalPosts: number
  published: number
  drafts: number
  scheduled: number
  totalPages: number
  totalComments: number
  pendingComments: number
  totalCategories: number
}

export interface WpPost {
  id: number
  title: string
  status: 'publish' | 'draft' | 'private' | 'future'
  date: string // ISO
  link: string
  commentCount: number
  categories: number[]
}

export interface WpCategory {
  id: number
  name: string
  slug: string
  count: number
}

export interface WpReport {
  overview: WpOverview
  recentPosts: WpPost[]
  categories: WpCategory[]
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

  const [publishedRes, draftsRes, scheduledRes, pagesRes, commentsRes, pendingCommentsRes, categoriesRes, recentRes] = await Promise.all([
    fetch(`${base}/wp-json/wp/v2/posts?per_page=1&status=publish&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/posts?per_page=1&status=draft&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/posts?per_page=1&status=future&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/pages?per_page=1&status=publish&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/comments?per_page=1&status=approved&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/comments?per_page=1&status=hold&_fields=id`, { headers }),
    fetch(`${base}/wp-json/wp/v2/categories?per_page=20&orderby=count&order=desc&_fields=id,name,slug,count`, { headers }),
    fetch(`${base}/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc&status=publish,draft,future&_fields=id,title,status,date,link,comment_count,categories`, { headers }),
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
    categories: number[]
  }

  type WpApiCategory = {
    id: number
    name: string
    slug: string
    count: number
  }

  const published = parseInt(publishedRes.headers.get('X-WP-Total') ?? '0', 10)
  const drafts = draftsRes.ok ? parseInt(draftsRes.headers.get('X-WP-Total') ?? '0', 10) : 0
  const scheduled = scheduledRes.ok ? parseInt(scheduledRes.headers.get('X-WP-Total') ?? '0', 10) : 0
  const totalPages = pagesRes.ok ? parseInt(pagesRes.headers.get('X-WP-Total') ?? '0', 10) : 0
  const totalComments = commentsRes.ok ? parseInt(commentsRes.headers.get('X-WP-Total') ?? '0', 10) : 0
  const pendingComments = pendingCommentsRes.ok ? parseInt(pendingCommentsRes.headers.get('X-WP-Total') ?? '0', 10) : 0
  const totalPosts = published + drafts + scheduled

  const rawCategories: WpApiCategory[] = categoriesRes.ok ? await categoriesRes.json() : []
  const categories: WpCategory[] = rawCategories
    .filter((c) => c.count > 0)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }))

  const totalCategories = categories.length

  const rawPosts: WpApiPost[] = recentRes.ok ? await recentRes.json() : []

  const recentPosts: WpPost[] = rawPosts.map((p) => ({
    id: p.id,
    title: p.title.rendered.replace(/<[^>]+>/g, ''),
    status: (['publish', 'draft', 'private', 'future'].includes(p.status) ? p.status : 'private') as WpPost['status'],
    date: p.date,
    link: p.link,
    commentCount: p.comment_count ?? 0,
    categories: p.categories ?? [],
  }))

  return {
    overview: { totalPosts, published, drafts, scheduled, totalPages, totalComments, pendingComments, totalCategories },
    recentPosts,
    categories,
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

  const categories: WpCategory[] = [
    { id: 1, name: 'PPC & Paid Ads', slug: 'ppc-paid-ads', count: 18 },
    { id: 2, name: 'SEO & Organic', slug: 'seo-organic', count: 14 },
    { id: 3, name: 'Analytics', slug: 'analytics', count: 11 },
    { id: 4, name: 'Social Media', slug: 'social-media', count: 8 },
    { id: 5, name: 'Strategy', slug: 'strategy', count: 6 },
    { id: 6, name: 'Case Studies', slug: 'case-studies', count: 4 },
  ]

  const recentPosts: WpPost[] = Array.from({ length: Math.min(postCount, 10) }, (_, i) => {
    const d = new Date(end)
    d.setDate(d.getDate() - Math.floor(seeded(i + 1) * dayCount))
    const statusRoll = seeded(i + 2)
    const status: WpPost['status'] = statusRoll > 0.2 ? 'publish' : statusRoll > 0.1 ? 'future' : 'draft'
    return {
      id: 100 + i,
      title: titles[i % titles.length],
      status,
      date: d.toISOString(),
      link: `https://example.com/blog/post-${100 + i}`,
      commentCount: Math.floor(seeded(i + 3) * 24),
      categories: [categories[i % categories.length].id],
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const published = recentPosts.filter((p) => p.status === 'publish').length
  const drafts = recentPosts.filter((p) => p.status === 'draft').length
  const scheduled = recentPosts.filter((p) => p.status === 'future').length

  return {
    overview: {
      totalPosts: 47 + published,
      published: 41,
      drafts: 6,
      scheduled: 3,
      totalPages: 12,
      totalComments: 183,
      pendingComments: 7,
      totalCategories: categories.length,
    },
    recentPosts,
    categories,
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
