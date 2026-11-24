import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

/**
 * Toast — notification system using React context.
 *
 * Variants: success, error, info, warning
 * Auto-dismiss after 5s (configurable).
 */
const toastContexts = []
let toastIdCounter = 0

const variants = {
  success: { icon: CheckCircle, className: 'border-success/30 bg-success/10 text-success' },
  error: { icon: AlertCircle, className: 'border-danger/30 bg-danger/10 text-danger' },
  info: { icon: Info, className: 'border-info/30 bg-info/10 text-info' },
  warning: { icon: AlertTriangle, className: 'border-warning/30 bg-warning/10 text-warning' },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const addToast = (toast) => {
      const id = ++toastIdCounter
      setToasts((prev) => [...prev, { ...toast, id }])
      return id
    }
    toastContexts.push(addToast)
    return () => {
      toastContexts.splice(toastContexts.indexOf(addToast), 1)
    }
  }, [])

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => {
        const config = variants[toast.variant || 'info']
        const Icon = config.icon
        return (
          <div
            key={toast.id}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-up max-w-md',
              config.className
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              {toast.title && <p className="font-medium">{toast.title}</p>}
              {toast.message && <p className="text-sm opacity-90">{toast.message}</p>}
            </div>
            {toast.dismissible !== false && (
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      })}
    </div>,
    document.body
  )
}

/**
 * toast — imperative API to show toasts.
 */
export const toast = {
  success: (message, options = {}) => {
    toastContexts.forEach((fn) => fn({ variant: 'success', message, ...options }))
  },
  error: (message, options = {}) => {
    toastContexts.forEach((fn) => fn({ variant: 'error', message, ...options }))
  },
  info: (message, options = {}) => {
    toastContexts.forEach((fn) => fn({ variant: 'info', message, ...options }))
  },
  warning: (message, options = {}) => {
    toastContexts.forEach((fn) => fn({ variant: 'warning', message, ...options }))
  },
}

export default ToastContainer