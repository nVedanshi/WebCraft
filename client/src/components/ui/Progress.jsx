import { clsx } from 'clsx'

/**
 * Progress — progress bar component.
 *
 * Variants: default, success, warning, danger
 * Props: value (0-100), max, size (sm, md, lg), showLabel
 */
const variants = {
  default: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

const sizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export function Progress({
  value = 0,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  className = '',
  ...props
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={clsx('', className)} {...props}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-secondary">{value}/{max}</span>
          <span className="text-xs text-secondary">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={clsx('progress', sizes[size])}>
        <div
          className={clsx('progress-bar', variants[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default Progress