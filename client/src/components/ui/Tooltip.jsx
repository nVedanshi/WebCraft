import { useState } from 'react'
import { clsx } from 'clsx'

/**
 * Tooltip — hover/focus tooltip.
 *
 * Positions: top, bottom, left, right
 */
const positions = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  right: 'left-full ml-2 top-1/2 -translate-y-1/2',
}

export function Tooltip({ children, content, position = 'top', className = '', ...props }) {
  const [show, setShow] = useState(false)

  return (
    <div
      className={clsx('relative inline-block', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      {...props}
    >
      {children}
      {show && content && (
        <div
          className={clsx(
            'absolute z-50 px-2 py-1 text-xs bg-elevated border border-border rounded-md shadow-lg whitespace-nowrap pointer-events-none animate-fade-in',
            positions[position]
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export default Tooltip