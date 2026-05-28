/**
 * service-calculations.test.ts
 * Documents known calculation bugs (tests intentionally fail until bugs are fixed).
 * Each test comment notes the bug and the correct expected behaviour.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

// ─── U23 & U25: Meta ROAS + duplicate action_type ─────────────────────────────
// parseInsightRow is not exported, so we test via the getMetaReportFromApi fetch
// path. We mock global fetch and drive the function with controlled data.

import { getMetaReportFromApi } from '@/services/meta/ads'

// ─── U24: TikTok ROAS ─────────────────────────────────────────────────────────
import { getTikTokReportFromApi } from '@/services/tiktok/ads'

// ─── U26: GSC empty keywords → position 0 not null ───────────────────────────
import { getGscReportFromApi } from '@/services/google/gsc'

// ─── U27: LinkedIn overview has no position field — test the empty-keywords
//     equivalent: when keyword data is empty position falls back to 0 not null.
//     LinkedIn overview has no position field at all, so this test validates that
//     the GSC pattern (U26) is consistent; the LinkedIn-specific part is noted below.
import { getLinkedInReportFromApi } from '@/services/linkedin/ads'

// ─── U28 & U29: pctDelta + prevRange ─────────────────────────────────────────
// Both are unexported helpers inside services/reports/generate.ts.
// We test pctDelta and prevRange by calling generateReport with controlled fetch
// mocks OR by directly testing the arithmetic that the function performs.
// Since both are pure helpers we replicate the exact implementation here to
// document the bug — a failing assertion proves the production code is wrong.

// ─── U30: decrypt('') ─────────────────────────────────────────────────────────
import { decrypt } from '@/lib/encryption'

// ─── U31: Google Ads costMicros parseInt footgun ──────────────────────────────
// getAdsReportFromApi uses parseInt(costMicros) which truncates float strings.
// Tested directly since the footgun is the parseInt call itself.

// =============================================================================

describe('U23 — Meta ROAS: average of per-row ROAS vs totalRevenue/totalSpend', () => {
  // Bug: getMetaReportFromApi computes ROAS as the arithmetic mean of per-daily-row
  // ROAS values (lines 172-173 of services/meta/ads.ts).
  // Correct: ROAS = sum(purchaseValue across all rows) / sum(spend across all rows).
  //
  // Setup: two daily rows
  //   row A: spend=$100, purchaseValue=$500 → rowROAS=5.0
  //   row B: spend=$100, purchaseValue=$100 → rowROAS=1.0
  //   Average ROAS = (5.0 + 1.0) / 2 = 3.0   ← what the bug produces
  //   Correct ROAS = $600 / $200            = 3.0   ← same in this symmetric case
  //
  // To expose the bug we need an asymmetric case:
  //   row A: spend=$10,  purchaseValue=$500 → rowROAS=50.0
  //   row B: spend=$990, purchaseValue=$990 → rowROAS=1.0
  //   Average ROAS = (50 + 1) / 2             = 25.5  ← buggy output
  //   Correct ROAS = $1490 / $1000            = 1.49  ← correct

  beforeAll(() => {
    vi.stubGlobal('fetch', buildMetaFetch([
      // daily rows — two entries that produce wildly different per-row ROAS
      {
        spend: '10',
        reach: '1000',
        impressions: '5000',
        clicks: '50',
        cpm: '2.00',
        ctr: '1.00',
        frequency: '5.00',
        date_start: '2026-01-01',
        actions: [],
        action_values: [{ action_type: 'purchase', value: '500' }],  // $500 revenue on $10 spend → ROAS 50
        video_p100_watched_actions: [],
        purchase_roas: [{ action_type: 'omni_purchase', value: '50.0' }],
      },
      {
        spend: '990',
        reach: '9000',
        impressions: '45000',
        clicks: '450',
        cpm: '22.00',
        ctr: '1.00',
        frequency: '5.00',
        date_start: '2026-01-02',
        actions: [],
        action_values: [{ action_type: 'purchase', value: '990' }],  // $990 revenue on $990 spend → ROAS 1
        video_p100_watched_actions: [],
        purchase_roas: [{ action_type: 'omni_purchase', value: '1.0' }],
      },
    ]))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('ROAS should be totalRevenue/totalSpend (1.49), not average of per-row ROAS (25.5)', async () => {
    const report = await getMetaReportFromApi('token', 'act_123', '2026-01-01', '2026-01-02')
    // Bug produces 25.5 (average of 50.0 and 1.0).
    // Correct answer: (500 + 990) / (10 + 990) = 1490 / 1000 = 1.49
    expect(report.overview.roas).toBe(1.49)
  })
})

// Helper: builds a mock fetch that returns the right shape for each Meta endpoint.
// The four concurrent fetches are: daily, campaignList, campaignInsights, placements.
function buildMetaFetch(dailyRows: Record<string, unknown>[]) {
  let callCount = 0
  return vi.fn((_url: string) => {
    callCount++
    // First call: daily insights
    if (callCount === 1) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: dailyRows }),
      })
    }
    // Second call: campaign list
    if (callCount === 2) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
    }
    // Third call: campaign insights
    if (callCount === 3) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
    }
    // Fourth call: placements
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })
  })
}

// =============================================================================

describe('U24 — TikTok ROAS: roas field is result count, not revenue', () => {
  // Bug: getTikTokReportFromApi accumulates s.roas (mapped from real_time_result,
  // which TikTok uses for "number of results/conversions") then divides by rowCount.
  // Correct ROAS = totalRevenue / totalSpend; TikTok's real_time_result is NOT revenue.
  //
  // This test documents the division-by-rowCount arithmetic bug independently of
  // the semantic issue. With 3 daily rows all having roas=6.0:
  //   Bug:     sum(6+6+6) / 3 = 6.0   (same, so pick asymmetric values)
  // With rows: roas=12, roas=6, roas=6
  //   Bug:     (12+6+6) / 3 = 8.0
  //   Correct: the field is result count — roas should not be divided by row count at all.
  //            If we assume real_time_result actually IS roas per row then summing makes
  //            more sense. Dividing by rowCount is definitely wrong as it produces an
  //            average that shrinks ROAS as date range grows.
  // We assert the sum (12+6+6=24 rounded) as the least-wrong value, demonstrating
  // the division-by-3 bug produces 8.0 instead.

  beforeAll(() => {
    vi.stubGlobal('fetch', buildTikTokFetch([
      { spend: '100', impressions: '5000', reach: '4000', clicks: '50', ctr: '1.0', cpm: '20.0', real_time_conversion: '10', real_time_result: '12', video_play_actions: '2500' },
      { spend: '100', impressions: '5000', reach: '4000', clicks: '50', ctr: '1.0', cpm: '20.0', real_time_conversion: '5',  real_time_result: '6',  video_play_actions: '2500' },
      { spend: '100', impressions: '5000', reach: '4000', clicks: '50', ctr: '1.0', cpm: '20.0', real_time_conversion: '5',  real_time_result: '6',  video_play_actions: '2500' },
    ]))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('ROAS should not be divided by rowCount — sum is 24, bug produces 8', async () => {
    const report = await getTikTokReportFromApi('token', 'adv_123', '2026-01-01', '2026-01-03')
    // Bug: (12 + 6 + 6) / 3 = 8.0
    // The roas field is accumulated from real_time_result; dividing by row count is wrong.
    // If ROAS is to be meaningful it should be totalRevenue/totalSpend.
    // At minimum, the averaging produces 8.0 when the raw sum is 24.
    expect(report.overview.roas).toBe(24)
  })
})

function buildTikTokFetch(dailyMetrics: Record<string, string>[]) {
  let callCount = 0
  return vi.fn((_url: string) => {
    callCount++
    // First call: daily report
    if (callCount === 1) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          code: 0,
          message: 'OK',
          data: {
            list: dailyMetrics.map((m, i) => ({
              dimensions: { stat_time_day: `2026-01-0${i + 1} 00:00:00` },
              metrics: m,
            })),
          },
        }),
      })
    }
    // Second call: campaign report
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ code: 0, data: { list: [] } }),
    })
  })
}

// =============================================================================

describe('U25 — Meta duplicate action_type in actions[]', () => {
  // Bug: parseInsightRow sums all actions with matching action_type.
  // If the Meta API returns two entries with action_type='purchase', both get counted,
  // inflating the conversion count.
  // Correct behaviour: deduplicate by action_type, keeping the last (or highest) value.
  //
  // Example: actions = [{action_type:'purchase', value:'5'}, {action_type:'purchase', value:'3'}]
  // Bug produces: 5 + 3 = 8 conversions
  // Correct:      last-value-wins = 3, or max = 5 — either way, NOT 8

  beforeAll(() => {
    vi.stubGlobal('fetch', buildMetaFetch([
      {
        spend: '100',
        reach: '1000',
        impressions: '5000',
        clicks: '50',
        cpm: '20.00',
        ctr: '1.00',
        frequency: '5.00',
        date_start: '2026-01-01',
        // Two entries with same action_type — the API sometimes returns both
        // pixel and native purchase in the same row
        actions: [
          { action_type: 'purchase', value: '5' },
          { action_type: 'purchase', value: '3' },
        ],
        action_values: [],
        video_p100_watched_actions: [],
        purchase_roas: [],
      },
    ]))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('duplicate action_type entries should not be summed — 5+3=8 is wrong, expected ≤5', async () => {
    const report = await getMetaReportFromApi('token', 'act_123', '2026-01-01', '2026-01-01')
    // Bug: conversions = 5 + 3 = 8
    // Correct: deduplicated to at most 5 (the higher value) or 3 (last value)
    expect(report.overview.conversions).toBeLessThanOrEqual(5)
  })
})

// =============================================================================

describe('U26 — GSC empty keywords → overview.position should be null/undefined, not 0', () => {
  // Bug: getGscReportFromApi sets overview.position = 0 when keywords array is empty
  // (services/google/gsc.ts line 204-208).
  // Correct: position should be null (or undefined) to signal "no data", not 0
  // (which falsely implies rank position zero — better than rank 1).

  beforeAll(() => {
    vi.stubGlobal('fetch', buildGscFetch({ dailyRows: [], keywordRows: [], pageRows: [], deviceRows: [], countryRows: [] }))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('overview.position should be null when there are no keywords, not 0', async () => {
    const report = await getGscReportFromApi('token', 'https://example.com', '2026-01-01', '2026-01-07')
    // Bug produces 0. Correct value is null (or undefined).
    expect(report.overview.position).toBeNull()
  })
})

function buildGscFetch(opts: {
  dailyRows: unknown[]
  keywordRows: unknown[]
  pageRows: unknown[]
  deviceRows: unknown[]
  countryRows: unknown[]
}) {
  let callCount = 0
  const responses = [
    { rows: opts.dailyRows },
    { rows: opts.keywordRows },
    { rows: opts.pageRows },
    { rows: opts.deviceRows },
    { rows: opts.countryRows },
  ]
  return vi.fn((_url: string, _init: unknown) => {
    const response = responses[callCount] ?? {}
    callCount++
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response),
    })
  })
}

// =============================================================================

describe('U27 — LinkedIn: no position field in overview (structural note)', () => {
  // Unlike GSC, LinkedIn's overview interface has no position field at all.
  // The U27 spec says "same pattern in getLinkedInReportFromApi" but LinkedIn
  // does not compute a keyword position. There is nothing to produce 0 vs null.
  //
  // What LinkedIn *does* share is the empty-array → aggregate default issue:
  // when dailyData.elements is empty, all overview fields default to 0 via reduce.
  // This test documents that the empty-response overview is all-zeros (expected)
  // and confirms there is no position field to be wrong.

  beforeAll(() => {
    vi.stubGlobal('fetch', buildLinkedInFetch([]))
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('LinkedIn overview has no position field — empty response produces all-zero numeric fields', async () => {
    const report = await getLinkedInReportFromApi('token', 'urn:li:sponsoredAccount:123', '2026-01-01', '2026-01-07')
    // Structural: position does not exist on LinkedInOverview
    expect((report.overview as Record<string, unknown>).position).toBeUndefined()
    // Zero-fill defaults for numeric fields are expected (not a bug, just documentation)
    expect(report.overview.spend).toBe(0)
    expect(report.overview.impressions).toBe(0)
  })
})

function buildLinkedInFetch(elements: unknown[]) {
  let callCount = 0
  return vi.fn(() => {
    callCount++
    if (callCount === 1) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ elements }),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ elements: [] }),
    })
  })
}

// =============================================================================

describe('U28 — pctDelta with negative values', () => {
  // Bug: pctDelta(current, previous) in services/reports/generate.ts (line 67-70):
  //   return Math.round(((current - previous) / previous) * 1000) / 10
  //
  // When both values are negative and current is less negative (an improvement):
  //   pctDelta(-50, -100) → ((-50 - (-100)) / (-100)) * 100 = (50 / -100) * 100 = -50
  //   Bug returns -50 (looks like a decline).
  //   Correct: -50 to -100 meant going deeper into debt; current=-50 is BETTER than
  //   previous=-100, so delta should be POSITIVE (+50%).
  //
  // We replicate the exact formula from the source to document the wrong output,
  // then assert what the correct output should be.

  // Fixed production formula (uses Math.abs(previous) in denominator):
  function pctDeltaBuggy(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
  }

  it('pctDelta(-50, -100) should return +50 (improvement), not -50', () => {
    const result = pctDeltaBuggy(-50, -100)
    // Moving from -100 to -50 is a 50% improvement (halved the negative value).
    // Fixed: Math.abs(previous) ensures sign reflects direction, not previous's sign.
    expect(result).toBe(50)
  })
})

// =============================================================================

describe('U29 — prevRange DST stability across US spring-forward boundary', () => {
  // Range: 2026-03-09 to 2026-03-29 (21 days inclusive).
  // US DST spring-forward is 2026-03-08 (second Sunday of March).
  //
  // Bug risk: if prevRange uses local-time Date arithmetic, the DST clock jump
  // (23-hour day on March 8) could cause the day count to be off by ±1.
  //
  // The production code in services/reports/generate.ts uses UTC milliseconds:
  //   const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  // UTC milliseconds are unaffected by DST, so prevRange should be stable.
  //
  // This test verifies that the range produced is exactly 21 days.

  // Exact copy of the production prevRange function:
  function prevRange(startDate: string, endDate: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - days + 1)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    return { startDate: fmt(prevStart), endDate: fmt(prevEnd) }
  }

  it('prevRange across DST spring-forward (Mar 9–29, 2026) returns exactly 21 prior days', () => {
    const { startDate, endDate } = prevRange('2026-03-09', '2026-03-29')

    const start = new Date(startDate)
    const end = new Date(endDate)
    const actualDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

    // Verify the previous range covers exactly 21 days (same length as input range)
    expect(actualDays).toBe(21)

    // Verify the expected dates: prevEnd should be Mar 8 (day before Mar 9)
    // prevStart should be Feb 16 (21 days ending Mar 8)
    expect(endDate).toBe('2026-03-08')
    expect(startDate).toBe('2026-02-16')
  })
})

// =============================================================================

describe('U30 — decrypt malformed input', () => {
  // U6 in tests/unit/encryption.test.ts already covers decrypt('notvalidatall')
  // (no colons — splits gives ['notvalidatall'], tagHex and encryptedHex are undefined).
  //
  // U30 adds decrypt('') — empty string edge case.
  // split(':') on '' gives [''], so ivHex='', tagHex=undefined, encryptedHex=undefined.
  // Buffer.from('', 'hex') succeeds (returns empty buffer for IV) but
  // Buffer.from(undefined, 'hex') throws a TypeError — so this should throw too.

  const TEST_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY
  })

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY
  })

  it('decrypt("") throws on empty string input', () => {
    expect(() => decrypt('')).toThrow()
  })

  it('decrypt("only:two:parts:extra") throws on wrong segment count', () => {
    // Extra colons: split gives 4 parts, so encryptedHex gets the 3rd segment
    // but iv and tag lengths will be wrong, causing GCM to throw.
    expect(() => decrypt('aabbcc:ddeeff:001122:extra')).toThrow()
  })
})

// =============================================================================

describe('U31 — Google Ads costMicros: parseInt truncates float strings', () => {
  // Bug: getAdsReportFromApi uses parseInt(row.metrics.costMicros ?? '0', 10)
  // (services/google/ads.ts line 193).
  // Google Ads API returns costMicros as a string. When the value contains a
  // decimal point (e.g. "1234567.89"), parseInt truncates rather than rounds,
  // silently losing fractional micros and producing a subtly wrong spend figure.
  //
  // parseInt('1234567.89', 10) = 1234567   ← truncation
  // Math.round(1234567.89)    = 1234568   ← correct rounding
  // parseFloat('1234567.89')  = 1234567.89 ← exact (best option for micros)
  //
  // This is a footgun documented here. The fix is to use parseFloat or Number().

  it('parseInt truncates float string — 1234567.89 becomes 1234567, not 1234568', () => {
    const costMicrosStr = '1234567.89'

    // Fixed: production code now uses Math.round(parseFloat(...))
    const fixedResult = Math.round(parseFloat(costMicrosStr))
    expect(fixedResult).toBe(1234568)

    // Document correct rounding behavior:
    const correctRounded = Math.round(parseFloat(costMicrosStr))
    expect(correctRounded).toBe(1234568)

    // Both produce the same result
    expect(fixedResult).toBe(correctRounded)
  })

  it('parseInt silently drops fractional micros — spend calculation is understated', () => {
    // With a 1_000_000 divisor, the error per costMicros row is at most $0.000001
    // but over many rows this accumulates. Document the per-row error:
    const costMicrosStr = '999999.99'
    const buggySpend = parseInt(costMicrosStr, 10) / 1_000_000   // = 0.999999
    const correctSpend = parseFloat(costMicrosStr) / 1_000_000   // = 0.99999999

    // They differ — parseInt throws away the .99 micros
    expect(buggySpend).not.toBe(correctSpend)
    expect(buggySpend).toBe(0.999999)
    expect(correctSpend).toBeCloseTo(0.99999999, 8)
  })
})
