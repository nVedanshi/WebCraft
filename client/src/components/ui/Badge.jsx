import { clsx } from 'clsx'

/**
 * Badge — small status label with variants.
 *
 * Variants: success, warning, danger, info, neutral
 */
const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
}

export function Badge({ children, variant = 'neutral', className = '', ...props }) {
  return (
    <span
      className={clsx('badge', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge