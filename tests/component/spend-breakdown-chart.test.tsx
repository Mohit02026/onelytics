// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SpendBreakdownChart } from '@/components/analytics/spend-breakdown-chart'

// Minimal daily spend row shape required by UnifiedReport['dailySpend']
const emptyDailySpend = [
  { date: '2024-01-01', google: 0, meta: 0, tiktok: 0, linkedin: 0 },
]

// C7 — SpendBreakdownChart all-zero spend
// When all platform spend is zero and no platforms are connected,
// the component should return null without crashing.
// connected.google = false, connected.meta = false,
// tiktokAdSpend = 0, linkedinAdSpend = 0
// → showGoogle=false, showMeta=false, showTiktok=false, showLinkedin=false → returns null
describe('SpendBreakdownChart', () => {
  it('C7: returns null (renders nothing) when all platform spend is zero and no platforms connected', () => {
    const connected = {
      google: false,
      meta: false,
      wordpress: false,
      gsc: false,
      gbp: false,
    }

    const { container } = render(
      <SpendBreakdownChart
        data={emptyDailySpend}
        connected={connected}
        tiktokAdSpend={0}
        linkedinAdSpend={0}
      />
    )

    // Component should return null — no DOM nodes rendered
    expect(container.firstChild).toBeNull()
  })
})
