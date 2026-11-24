import { clsx } from 'clsx'
import { Inbox, Search, AlertCircle, FileQuestion } from 'lucide-react'

/**
 * EmptyState — meaningful empty states for lists, searches, etc.
 *
 * Variants: default, search, error, no-data
 * Props: icon, title, description, action
 */
const icons = {
  default: Inbox,
  search: Search,
  error: AlertCircle,
  'no-data': FileQuestion,
}

export function EmptyState({
  variant = 'default',
  icon: CustomIcon,
  title,
  description,
  action,
  className = '',
  ...props
}) {
  const Icon = CustomIcon || icons[variant] || Inbox

  return (
    <div
      className={clsx('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
      {...props}
    >
      <Icon className="w-12 h-12 text-muted mb-4" />
      {title && (
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-secondary max-w-md mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export default EmptyState
