// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GranularityPicker } from '@/components/analytics/granularity-picker'

describe('GranularityPicker', () => {
  // C1
  it('C1: renders Daily, Weekly, Monthly options', () => {
    render(<GranularityPicker value="daily" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument()
  })

  // C2
  it('C2: calls onChange with the correct granularity value on click', () => {
    const onChange = vi.fn()
    render(<GranularityPicker value="daily" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }))
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('weekly')
  })

  // C3
  it('C3: active option has bg-blue-600 class; inactive options do not', () => {
    render(<GranularityPicker value="monthly" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Monthly' }).className).toContain('bg-blue-600')
    expect(screen.getByRole('button', { name: 'Daily' }).className).not.toContain('bg-blue-600')
    expect(screen.getByRole('button', { name: 'Weekly' }).className).not.toContain('bg-blue-600')
  })
})
