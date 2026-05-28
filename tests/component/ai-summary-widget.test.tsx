// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AiSummaryWidget } from '@/components/analytics/ai-summary-widget'

const mockReport = {
  totalAdSpend: 1000,
  googleAdSpend: 500,
  metaAdSpend: 500,
  totalImpressions: 10000,
  totalClicks: 200,
  organicClicks: 100,
  sessions: 500,
  avgPosition: 3.2,
  connected: ['google', 'meta'],
  dateRange: '30d',
} as any

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AiSummaryWidget', () => {
  // C4
  it('C4: shows loading skeleton while fetch is in-flight', async () => {
    // fetch never resolves — keeps component in loading state
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})))
    render(<AiSummaryWidget report={mockReport} />)

    fireEvent.click(screen.getByRole('button', { name: /generate/i }))

    // Placeholder text disappears and button becomes disabled while loading
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.queryByText(/click generate/i)).not.toBeInTheDocument()
    })
    // Animated skeleton divs rendered
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  // C5
  it('C5: renders summary text when fetch returns successfully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ summary: 'Strong performance across all channels.' }),
    }))
    render(<AiSummaryWidget report={mockReport} />)

    fireEvent.click(screen.getByRole('button', { name: /generate/i }))

    await waitFor(() => {
      expect(screen.getByText('Strong performance across all channels.')).toBeInTheDocument()
    })
  })

  // C6
  it('C6: shows fallback error message when fetch returns 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }))
    render(<AiSummaryWidget report={mockReport} />)

    fireEvent.click(screen.getByRole('button', { name: /generate/i }))

    await waitFor(() => {
      expect(screen.getByText(/ANTHROPIC_API_KEY/)).toBeInTheDocument()
    })
  })

  // C8
  it('C8: shows meaningful fallback error message when fetch returns 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }))
    render(<AiSummaryWidget report={mockReport} />)

    fireEvent.click(screen.getByRole('button', { name: /generate/i }))

    await waitFor(() => {
      // Should show a non-blank error message — not crash, not stay blank
      // The component's catch block sets: 'Failed to generate summary. Try again.'
      expect(screen.getByText(/Failed to generate summary/i)).toBeInTheDocument()
    })
  })
})
