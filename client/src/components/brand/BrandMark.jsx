import { clsx } from 'clsx'
import { Command } from 'lucide-react'

/**
 * BrandMark — the WebCraft brand mark extracted from the existing logo
 * markup used in PublicLayout.jsx and Sidebar.jsx.
 *
 * Renders the Command icon inside a rounded accent square, followed by the
 * wordmark "WebCraft".
 *
 * @param {Object} props
 * @param {string} [props.className] — extra classes for the container
 * @param {string} [props.size] — 'sm' | 'md' | 'lg' (default 'md')
 * @param {boolean} [props.withText] — show the wordmark (default true)
 */
export function BrandMark({ className = '', size = 'md', withText = true }) {
  const sizes = {
    sm: { box: 'w-6 h-6', icon: 'w-4 h-4', text: 'text-sm font-semibold' },
    md: { box: 'w-8 h-8', icon: 'w-5 h-5', text: 'font-bold text-lg' },
    lg: { box: 'w-10 h-10', icon: 'w-6 h-6', text: 'font-bold text-xl' },
  }
  const s = sizes[size]

  return (
    <span className={clsx('flex items-center gap-2', className)}>
      <div
        className={clsx(
          'rounded-lg bg-accent flex items-center justify-center flex-shrink-0',
          s.box,
        )}
      >
        <Command className={clsx(s.icon, 'text-white')} />
      </div>
      {withText && (
        <span className={clsx(s.text, 'text-foreground')}>
          WebCraft
        </span>
      )}
    </span>
  )
}

export default BrandMark
