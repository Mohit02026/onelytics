import { describe, it, expect } from 'vitest'
import { assembleReportData, type AssembleReportInput } from '@/services/reports/generate'

// assembleReportData is the pure assembly step shared by the cookie-forwarding
// report path and the headless (scheduled-job) report path — everything here
// exercises it directly with hand-built platform data, no fetch/DB involved.

const BASE: AssembleReportInput = {
  title: 'Test Report',
  startDate: '2026-07-01',
  endDate: '2026-07-07',
  prev: { startDate: '2026-06-24', endDate: '2026-06-30' },
  sel: ['googleAds', 'meta', 'tiktok', 'linkedin', 'ga4', 'gsc', 'gbp', 'wordpress'],
  ga4: null,
  ads: null,
  meta: null,
  tiktok: null,
  linkedin: null,
  gsc: null,
  gbp: null,
  wordpress: null,
  pAds: null,
  pMeta: null,
  pTiktok: null,
  pLinkedin: null,
  pGa4: null,
  pGsc: null,
  pGbp: null,
}

describe('assembleReportData — channel building', () => {
  it('U35: builds a Google Ads channel when ads overview has spend', () => {
    const result = assembleReportData({
      ...BASE,
      ads: { overview: { spend: 100, impressions: 1000, clicks: 50, ctr: 5, conversions: 10, costPerConversion: 10, roas: 3 } },
    })
    expect(result.channels).toHaveLength(1)
    expect(result.channels[0]).toMatchObject({ channel: 'Google Ads', spend: 100, conversions: 10, roas: 3 })
  })

  it('U36: skips a platform entirely when its data is null', () => {
    const result = assembleReportData({ ...BASE, ads: null, meta: null })
    expect(result.channels).toHaveLength(0)
  })

  it('U37: skips a platform when present but overview.spend is undefined', () => {
    const result = assembleReportData({ ...BASE, ads: { overview: {} } })
    expect(result.channels).toHaveLength(0)
  })

  it('U38: one unreachable platform does not affect the others\' channels', () => {
    // Mirrors the real failure mode hit during manual verification — a platform
    // fetch that failed (and resolved to null) must not blank out the report.
    const result = assembleReportData({
      ...BASE,
      ads: { overview: { spend: 50, impressions: 500, clicks: 25, ctr: 5, conversions: 5, costPerConversion: 10 } },
      wordpress: null, // simulates the unreachable-site case
    })
    expect(result.channels.map((c) => c.channel)).toEqual(['Google Ads'])
    expect(result.platforms?.wordpress).toBeNull()
  })

  it('U39: executiveSummary totals sum correctly across multiple channels', () => {
    const result = assembleReportData({
      ...BASE,
      ads: { overview: { spend: 100, impressions: 1000, clicks: 50, ctr: 5, conversions: 10, costPerConversion: 10 } },
      meta: { overview: { spend: 50, impressions: 500, clicks: 25, ctr: 5, cpm: 100, conversions: 5 } },
    })
    expect(result.executiveSummary.totalSpend).toBe(150)
    expect(result.executiveSummary.totalImpressions).toBe(1500)
    expect(result.executiveSummary.totalClicks).toBe(75)
    expect(result.executiveSummary.totalConversions).toBe(15)
  })
})

describe('assembleReportData — momComparisons', () => {
  it('U40: only includes organic comparisons for platforms in sel', () => {
    const result = assembleReportData({ ...BASE, sel: ['googleAds'] })
    const labels = result.momComparisons.map((m) => m.label)
    expect(labels).toEqual(['Total Ad Spend', 'Total Conversions'])
  })

  it('U41: includes Organic Sessions when ga4 is selected, even with no data', () => {
    const result = assembleReportData({ ...BASE, sel: ['ga4'] })
    const organic = result.momComparisons.find((m) => m.label === 'Organic Sessions')
    expect(organic).toMatchObject({ current: 0, previous: 0, delta: 0 })
  })

  it('U42: previous period of 0 with positive current does not divide by zero', () => {
    const result = assembleReportData({
      ...BASE,
      ads: { overview: { spend: 100, impressions: 0, clicks: 0, ctr: 0, conversions: 0, costPerConversion: 0 } },
      pAds: { overview: { spend: 0 } },
    })
    const spendDelta = result.momComparisons.find((m) => m.label === 'Total Ad Spend')
    expect(spendDelta?.delta).toBe(100)
  })
})

describe('assembleReportData — dailySpend aggregation', () => {
  it('U43: sums daily rows across channels for the same date', () => {
    const result = assembleReportData({
      ...BASE,
      ads: { daily: [{ date: '2026-07-01', spend: 10 }] },
      meta: { daily: [{ date: '2026-07-01', spend: 5 }] },
    })
    expect(result.dailySpend).toEqual([
      { date: '2026-07-01', google: 10, meta: 5, tiktok: 0, linkedin: 0 },
    ])
  })

  it('U44: sorts daily rows chronologically regardless of input order', () => {
    const result = assembleReportData({
      ...BASE,
      ads: { daily: [{ date: '2026-07-03', spend: 1 }, { date: '2026-07-01', spend: 1 }] },
    })
    expect(result.dailySpend.map((d) => d.date)).toEqual(['2026-07-01', '2026-07-03'])
  })
})
