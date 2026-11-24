import { clsx } from 'clsx'

/**
 * Card — container component with variants.
 *
 * Variants: default, elevated, hoverable
 * Padding: none, sm, md, lg
 */
const variants = {
  default: 'card',
  elevated: 'card shadow-card',
  hoverable: 'card card-hover',
  borderless: 'bg-elevated',
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) {
  return (
    <div
      className={clsx(
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={clsx('text-lg font-semibold text-foreground', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={clsx('text-sm text-secondary mt-1', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={clsx('', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={clsx('mt-4 flex items-center justify-end gap-2', className)} {...props}>
      {children}
    </div>
  )
}

export default Card
