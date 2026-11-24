import { clsx } from 'clsx'

/**
 * Tabs — horizontal tab navigation.
 *
 * Props:
 *   tabs: array of { id, label, icon? }
 *   activeTab, onChange
 *   variant: default, pill
 *   size: sm, md
 */
const variants = {
  default: '',
  pill: 'bg-elevated rounded-lg p-1',
}

const sizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <div
      className={clsx(
        variant === 'default' ? 'tabs' : 'inline-flex gap-1 rounded-lg p-1 bg-elevated',
        className
      )}
      {...props}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              variant === 'default' ? 'tab' : 'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? variant === 'default'
                  ? 'tab-active'
                  : 'bg-accent text-white'
                : variant === 'default'
                  ? ''
                  : 'text-secondary hover:text-foreground hover:bg-hover',
              sizes[size]
            )}
          >
            {Icon && <Icon className="w-4 h-4 mr-1.5 inline" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
