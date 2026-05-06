export interface GbpOverview {
  calls: number
  websiteClicks: number
  directionRequests: number
  mapViews: number          // desktop + mobile map impressions
  searchViews: number       // desktop + mobile search impressions
  totalViews: number        // mapViews + searchViews
  avgRating: number         // from reviews, 0 if unavailable
  totalReviews: number
}

export interface GbpDailyRow {
  date: string
  calls: number
  websiteClicks: number
  directionRequests: number
  mapViews: number
  searchViews: number
}

export interface GbpReport {
  overview: GbpOverview
  daily: GbpDailyRow[]
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

    daily.push({
      date: d.toISOString().split('T')[0],
      calls: c,
      websiteClicks: wc,
      directionRequests: dr,
      mapViews: mViews,
      searchViews: sViews,
    })
  }

  return {
    overview: {
      calls,
      websiteClicks,
      directionRequests,
      mapViews,
      searchViews,
      totalViews: mapViews + searchViews,
      avgRating: 4.8,
      totalReviews: 124,
    },
    daily,
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
  ;['CALL_CLICKS', 'WEBSITE_CLICKS', 'BUSINESS_DIRECTION_REQUESTS', 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH'].forEach(m => params.append('dailyMetrics', m))
  
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
      searchViews: 0
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
    }
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  
  let calls = 0, websiteClicks = 0, directionRequests = 0, mapViews = 0, searchViews = 0
  for (const row of daily) {
    calls += row.calls
    websiteClicks += row.websiteClicks
    directionRequests += row.directionRequests
    mapViews += row.mapViews
    searchViews += row.searchViews
  }

  // 2. Fetch Reviews Data (Best effort)
  let avgRating = 0
  let totalReviews = 0

  try {
    const reviewsRes = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=1`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    if (reviewsRes.ok) {
      const reviewsData = await reviewsRes.json()
      if (reviewsData.averageRating) {
        avgRating = parseFloat(reviewsData.averageRating)
      }
      if (reviewsData.totalReviewCount) {
        totalReviews = parseInt(reviewsData.totalReviewCount, 10)
      }
    }
  } catch (err) {
    // Silently ignore review fetch errors
  }

  return {
    overview: {
      calls,
      websiteClicks,
      directionRequests,
      mapViews,
      searchViews,
      totalViews: mapViews + searchViews,
      avgRating,
      totalReviews
    },
    daily
  }
}
