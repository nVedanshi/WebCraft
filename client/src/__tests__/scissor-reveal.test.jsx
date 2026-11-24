import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { ScissorReveal } from '../components/motion/ScissorReveal.jsx'
import { usePrefersReducedMotion } from '../components/motion/usePrefersReducedMotion.js'

// ── Helpers ──
function TestProbe() {
  const reduced = usePrefersReducedMotion()
  return <div data-testid="reduced-motion-probe">{reduced ? 'reduced' : 'full'}</div>
}

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
}

function mockPerformanceTiming(navStart) {
  vi.stubGlobal('performance', {
    ...performance,
    timing: { navigationStart: navStart },
    now: performance.now.bind(performance),
  })
}

beforeEach(() => {
  sessionStorage.clear()
  // matchMedia must be mocked before any component using the hook renders
  mockMatchMedia(false)
  cleanup()
})

afterEach(() => {
  sessionStorage.clear()
  cleanup()
  vi.restoreAllMocks()
})

// ── usePrefersReducedMotion ──
describe('usePrefersReducedMotion', () => {
  it('returns true when prefers-reduced-motion: reduce is active', () => {
    mockMatchMedia(true)
    render(<TestProbe />)
    expect(screen.getByTestId('reduced-motion-probe').textContent).toBe('reduced')
  })

  it('returns false when prefers-reduced-motion is not active', () => {
    mockMatchMedia(false)
    render(<TestProbe />)
    expect(screen.getByTestId('reduced-motion-probe').textContent).toBe('full')
  })
})

// ── ScissorReveal: one-time playback ──
describe('ScissorReveal — one-time playback per session', () => {
  it('renders nothing when already played this session', () => {
    sessionStorage.setItem('scissor-reveal-played', '1')
    render(<ScissorReveal />)
    expect(screen.queryByTestId('scissor-reveal-overlay')).toBeNull()
    expect(screen.queryByTestId('scissor-reveal-line')).toBeNull()
  })

  it('renders the overlay on first session visit', () => {
    mockPerformanceTiming(performance.now() - 1000) // app took 1000ms to load
    render(<ScissorReveal />)
    expect(screen.getByTestId('scissor-reveal-overlay')).toBeDefined()
    expect(screen.getByTestId('scissor-reveal-line')).toBeDefined()
  })

  it('unmounts after the reveal duration', () => {
    vi.useFakeTimers()
    mockPerformanceTiming(performance.now() - 1000)
    render(<ScissorReveal />)
    expect(screen.getByTestId('scissor-reveal-overlay')).toBeDefined()
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(screen.queryByTestId('scissor-reveal-overlay')).toBeNull()
    vi.useRealTimers()
  })

  it('does not play when app loads in under 300ms', () => {
    mockPerformanceTiming(performance.now() - 100) // only 100ms load time
    render(<ScissorReveal />)
    expect(screen.queryByTestId('scissor-reveal-overlay')).toBeNull()
  })
})

// ── ScissorReveal: reduced motion ──
describe('ScissorReveal — reduced motion', () => {
  it('falls back to 150ms crossfade under reduced motion', () => {
    vi.useFakeTimers()
    mockMatchMedia(true)
    mockPerformanceTiming(performance.now() - 1000)
    render(<ScissorReveal />)
    expect(screen.getByTestId('scissor-reveal-overlay')).toBeDefined()
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.queryByTestId('scissor-reveal-overlay')).toBeNull()
    vi.useRealTimers()
  })

  it('still plays once per session under reduced motion', () => {
    vi.useFakeTimers()
    mockMatchMedia(true)
    mockPerformanceTiming(performance.now() - 1000)
    render(<ScissorReveal />)
    expect(screen.getByTestId('scissor-reveal-overlay')).toBeDefined()
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(screen.queryByTestId('scissor-reveal-overlay')).toBeNull()

    // Second render within same session — should not play again
    render(<ScissorReveal />)
    expect(screen.queryByTestId('scissor-reveal-overlay')).toBeNull()
    vi.useRealTimers()
  })
})
