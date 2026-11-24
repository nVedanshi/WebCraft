import * as React from 'react'

export function Card({ children, className }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className || ''}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className || ''}`}>{children}</div>
}

export function CardTitle({ children, className }) {
  return <h3 className={`text-lg font-semibold text-gray-900 leading-none ${className || ''}`}>{children}</h3>
}

export function CardContent({ children, className }) {
  return <div className={`p-6 pt-0 ${className || ''}`}>{children}</div>
}

export function Button({ children, className, variant = 'default', onClick }) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  const variants = {
    default: 'bg-gray-900 text-white hover:bg-gray-800',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-gray-200 bg-white hover:bg-gray-50',
    ghost: 'hover:bg-gray-100 hover:text-gray-900',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className || ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

export function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    />
  )
}

export function Badge({ children, className, variant = 'default' }) {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'text-foreground border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className || ''}`}>
      {children}
    </span>
  )
}

export function Label({ children, className }) {
  return (
    <span className={`text-sm font-medium text-gray-900 peer-disabled:text-gray-400 ${className || ''}`}>
      {children}
    </span>
  )
}

export function useToast() {
  return { toast: () => {} }
}
