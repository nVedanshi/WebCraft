import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js'

const SESSION_KEY = 'scissor-reveal-played'
const MIN_LOAD_TIME_MS = 300
const MAX_DURATION_MS = 900
const REDUCED_MOTION_DURATION_MS = 150

/**
 * ScissorReveal — plays once per browser session when the app takes
 * more than 300ms to become ready.
 *
 * A full-screen overlay with two triangular blades that slide apart
 * along a diagonal cut (top-right to bottom-left), guided by an SVG
 * line that draws as the blades separate. After the reveal completes
 * (max 900ms, or 150ms under reduced motion) the component unmounts
 * itself. Never blocks input: the overlay always has
 * pointer-events: none so clicks pass through to the app beneath.
 *
 * Intended to be lazy-loaded via React.lazy in the app entry point.
 */
export function ScissorReveal() {
  const reduced = usePrefersReducedMotion()
  const duration = reduced ? REDUCED_MOTION_DURATION_MS : MAX_DURATION_MS
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    // One-time playback per browser session.
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setPlaying(false)
      return
    }

    // Only play if the app took more than 300ms to be ready.
    const navStart =
      performance.timing?.navigationStart ?? performance.now() - MIN_LOAD_TIME_MS
    const loadTime = performance.now() - navStart
    if (loadTime <= MIN_LOAD_TIME_MS) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setPlaying(false)
      return
    }

    sessionStorage.setItem(SESSION_KEY, '1')
    setPlaying(true)

    // Trigger the CSS transition after mount.
    const raf = requestAnimationFrame(() => setActive(true))

    // Auto-unmount after the reveal duration.
    timerRef.current = setTimeout(() => {
      setPlaying(false)
    }, duration)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      cancelAnimationFrame(raf)
    }
  }, [duration, SESSION_KEY])

  if (!playing) return null

  const lineLength = Math.sqrt(2 * 100 * 100) // diagonal of 100x100 SVG ≈ 141.4

  return (
    <div
      data-testid="scissor-reveal-overlay"
      className={`scissor-reveal-overlay ${active ? 'scissor-reveal-active' : ''}`}
      style={{ pointerEvents: 'none' }}
    >
      <svg
        data-testid="scissor-reveal-line"
        className="scissor-reveal-line"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100vw',
          height: '100vh',
          display: 'block',
        }}
      >
        <line
          x1="100"
          y1="0"
          x2="0"
          y2="100"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeDasharray={lineLength}
          strokeDashoffset={active ? '0' : lineLength}
          style={{
            transition: `stroke-dashoffset ${duration}ms ease-out`,
          }}
        />
      </svg>

      {/* Left blade — top-left triangle, slides left */}
      <div
        className="scissor-reveal-blade scissor-reveal-left"
        style={{
          transform: active ? 'translateX(0)' : 'translateX(-100%)',
          transition: `transform ${duration}ms ease-out`,
        }}
      />

      {/* Right blade — bottom-right triangle, slides right */}
      <div
        className="scissor-reveal-blade scissor-reveal-right"
        style={{
          transform: active ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform ${duration}ms ease-out`,
        }}
      />
    </div>
  )
}

export default ScissorReveal
