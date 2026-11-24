import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

/**
 * Spinner — loading indicator.
 *
 * Sizes: sm, md, lg
 */
const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
}

export function Spinner({ size = 'md', className = '', ...props }) {
  return (
    <Loader2
      className={clsx('animate-spin text-accent', sizes[size], className)}
      {...props}
    />
  )
}

/**
 * Skeleton — placeholder for loading content.
 */
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={clsx('skeleton', className)}
      {...props}
    />
  )
}

export function SkeletonText({ lines = 3, className = '', ...props }) {
  return (
    <div className={clsx('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '', ...props }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-elevated p-6',
        className
      )}
      {...props}
    >
      <Skeleton className="mb-4 h-4 w-1/4" />
      <Skeleton className="mb-2 h-3 w-3/4" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}

export default Spinner