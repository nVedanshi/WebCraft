import { useEffect, useState } from 'react'

/**
 * usePrefersReducedMotion — tracks the user's
 * prefers-reduced-motion media query.
 *
 * Returns true when the user has asked the OS to reduce motion.
 * Updates reactively if the OS setting changes while the app is open.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reduced
}

export default usePrefersReducedMotion
