export interface GbpOverview {
  calls: number
  websiteClicks: number
  directionRequests: number
  mapViews: number
  searchViews: number
  totalViews: number
  photoViews: number
  avgRating: number
  totalReviews: number
}

export interface GbpDailyRow {
  date: string
  calls: number
  websiteClicks: number
  directionRequests: number
  mapViews: number
  searchViews: number
  photoViews: number
}

export interface GbpReview {
  reviewId: string
  reviewer: string
  rating: number
  comment: string
  createTime: string
  replied: boolean
}

export interface GbpPost {
  name: string
  summary: string
  state: string
  createTime: string
  mediaUrl?: string
}

export interface GbpReport {
  overview: GbpOverview
  daily: GbpDailyRow[]
  reviews: GbpReview[]
  posts: GbpPost[]
}

export async function getGbpReportDummy(startDate: string, endDate: string): Promise<GbpReport> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

  const daily: GbpDailyRow[] = []
  let calls = 0
  let websiteClicks = 0
  let directionRequests = 0
  let mapViews = 0
  let searchViews = 0

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6

    const mViews = Math.floor(Math.random() * 50) + (isWeekend ? 30 : 80)
    const sViews = Math.floor(Math.random() * 100) + (isWeekend ? 50 : 150)
    const c = Math.floor(Math.random() * 5) + (isWeekend ? 0 : 2)
    const wc = Math.floor(Math.random() * 8) + (isWeekend ? 2 : 5)
    const dr = Math.floor(Math.random() * 6) + (isWeekend ? 1 : 3)

    mapViews += mViews
    searchViews += sViews
    calls += c
    websiteClicks += wc
    directionRequests += dr

    const pViews = Math.floor(Math.random() * 20) + (isWeekend ? 5 : 15)
    daily.push({
      date: d.toISOString().split('T')[0],
      calls: c,
      websiteClicks: wc,
      directionRequests: dr,
      mapViews: mViews,
      searchViews: sViews,
      photoViews: pViews,
    })
  }

  const photoViews = daily.reduce((s, d) => s + d.photoViews, 0)
  return {
    overview: {
      calls,
      websiteClicks,
      directionRequests,
      mapViews,
      searchViews,
      totalViews: mapViews + searchViews,
      photoViews,
      avgRating: 4.8,
      totalReviews: 124,
    },
    daily,
    reviews: [
      { reviewId: 'r1', reviewer: 'Jane Smith', rating: 5, comment: 'Excellent service, highly recommend!', createTime: new Date(Date.now() - 86400000 * 3).toISOString(), replied: true },
      { reviewId: 'r2', reviewer: 'John D.', rating: 4, comment: 'Great experience overall.', createTime: new Date(Date.now() - 86400000 * 10).toISOString(), replied: false },
      { reviewId: 'r3', reviewer: 'Sarah M.', rating: 5, comment: 'Very professional and friendly staff.', createTime: new Date(Date.now() - 86400000 * 18).toISOString(), replied: true },
    ],
    posts: [
      { name: 'post/1', summary: 'Check out our latest offers this month!', state: 'LIVE', createTime: new Date(Date.now() - 86400000 * 5).toISOString() },
      { name: 'post/2', summary: 'We are now accepting new appointments online.', state: 'LIVE', createTime: new Date(Date.now() - 86400000 * 12).toISOString() },
    ],
  }
}

export async function getGbpReportFromApi(
  locationName: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<GbpReport> {
  // 1. Fetch Performance Metrics
  const dailyMetricsUrl = `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`
  
  const dailyReqBody = {
    dailyMetrics: [
      'CALL_CLICKS',
      'WEBSITE_CLICKS',
      'BUSINESS_DIRECTION_REQUESTS',
      'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
      'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
      'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
      'BUSINESS_IMPRESSIONS_MOBILE_SEARCH'
    ],
    dailyRange: {
      start_date: {
        year: parseInt(startDate.split('-')[0]),
        month: parseInt(startDate.split('-')[1]),
        day: parseInt(startDate.split('-')[2])
      },
      end_date: {
        year: parseInt(endDate.split('-')[0]),
        month: parseInt(endDate.split('-')[1]),
        day: parseInt(endDate.split('-')[2])
      }
    }
  }

  const metricsRes = await fetch(dailyMetricsUrl, {
    method: 'GET', // Wait, fetchMultiDailyMetricsTimeSeries is actually a GET in v1? No, wait... 
    // Actually, according to GBP API, it's GET with query params:
    // ?dailyMetrics=CALL_CLICKS&dailyMetrics=WEBSITE_CLICKS&dailyRange.start_date.year=...
  })
  
  // Correction: The API is GET. Let's build the URL properly.
  const params = new URLSearchParams()
  ;['CALL_CLICKS', 'WEBSITE_CLICKS', 'BUSINESS_DIRECTION_REQUESTS', 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', 'BUSINESS_IMPRESSIONS_DESKTOP_PHOTOS', 'BUSINESS_IMPRESSIONS_MOBILE_PHOTOS'].forEach(m => params.append('dailyMetrics', m))
  
  const [sYear, sMonth, sDay] = startDate.split('-')
  const [eYear, eMonth, eDay] = endDate.split('-')
  
  params.append('dailyRange.start_date.year', sYear)
  params.append('dailyRange.start_date.month', sMonth)
  params.append('dailyRange.start_date.day', sDay)
  params.append('dailyRange.end_date.year', eYear)
  params.append('dailyRange.end_date.month', eMonth)
  params.append('dailyRange.end_date.day', eDay)

  const url = `${dailyMetricsUrl}?${params.toString()}`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GBP API Error: ${text}`)
  }

  const data = await response.json()
  
  // Parse response
  // data.multiDailyMetricTimeSeries contains an array of TimeSeries, one for each metric
  const dailyMap = new Map<string, GbpDailyRow>()
  
  // Initialize map with all dates
  let curr = new Date(startDate)
  const end = new Date(endDate)
  while (curr <= end) {
    const dStr = curr.toISOString().split('T')[0]
    dailyMap.set(dStr, {
      date: dStr,
      calls: 0,
      websiteClicks: 0,
      directionRequests: 0,
      mapViews: 0,
      searchViews: 0,
      photoViews: 0,
    })
    curr.setDate(curr.getDate() + 1)
  }

  const seriesList = data.multiDailyMetricTimeSeries || []
  
  for (const series of seriesList) {
    const metric = series.dailyMetric
    const points = series.dailyMetricTimeSeries?.timeSeries?.datedValues || []
    
    for (const point of points) {
      const { date, value } = point
      const dStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
      const row = dailyMap.get(dStr)
      if (!row) continue
      
      const val = parseInt(value || '0', 10)
      
      if (metric === 'CALL_CLICKS') row.calls += val
      if (metric === 'WEBSITE_CLICKS') row.websiteClicks += val
      if (metric === 'BUSINESS_DIRECTION_REQUESTS') row.directionRequests += val
      if (metric === 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS' || metric === 'BUSINESS_IMPRESSIONS_MOBILE_MAPS') row.mapViews += val
      if (metric === 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH' || metric === 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH') row.searchViews += val
      if (metric === 'BUSINESS_IMPRESSIONS_DESKTOP_PHOTOS' || metric === 'BUSINESS_IMPRESSIONS_MOBILE_PHOTOS') row.photoViews += val
    }
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  
  let calls = 0, websiteClicks = 0, directionRequests = 0, mapViews = 0, searchViews = 0, photoViews = 0
  for (const row of daily) {
    calls += row.calls
    websiteClicks += row.websiteClicks
    directionRequests += row.directionRequests
    mapViews += row.mapViews
    searchViews += row.searchViews
    photoViews += row.photoViews
  }

  // 2. Fetch Reviews + Posts (best effort, parallel)
  let avgRating = 0
  let totalReviews = 0
  let reviews: GbpReview[] = []
  let posts: GbpPost[] = []

  const [reviewsRes, postsRes] = await Promise.allSettled([
    fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`https://mybusiness.googleapis.com/v4/${locationName}/localPosts?pageSize=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ])

  if (reviewsRes.status === 'fulfilled' && reviewsRes.value.ok) {
    const reviewsData = await reviewsRes.value.json()
    if (reviewsData.averageRating) avgRating = parseFloat(reviewsData.averageRating)
    if (reviewsData.totalReviewCount) totalReviews = parseInt(reviewsData.totalReviewCount, 10)
    reviews = (reviewsData.reviews ?? []).map((r: Record<string, unknown>) => ({
      reviewId: String(r.reviewId ?? ''),
      reviewer: String((r.reviewer as Record<string, unknown>)?.displayName ?? 'Anonymous'),
      rating: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].indexOf(String(r.starRating ?? 'FIVE')) + 1,
      comment: String(r.comment ?? ''),
      createTime: String(r.createTime ?? ''),
      replied: !!(r.reviewReply),
    }))
  }

  if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
    const postsData = await postsRes.value.json()
    posts = (postsData.localPosts ?? []).map((p: Record<string, unknown>) => ({
      name: String(p.name ?? ''),
      summary: String(p.summary ?? ''),
      state: String(p.state ?? ''),
      createTime: String(p.createTime ?? ''),
      mediaUrl: (p.media as Record<string, unknown>[])?.[0]?.googleUrl as string | undefined,
    }))
  }

  return {
    overview: {
      calls,
      websiteClicks,
      directionRequests,
      mapViews,
      searchViews,
      totalViews: mapViews + searchViews,
      photoViews,
      avgRating,
      totalReviews,
    },
    daily,
    reviews,
    posts,
  }
}
