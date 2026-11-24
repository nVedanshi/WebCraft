import { forwardRef } from 'react'
import { clsx } from 'clsx'

/**
 * Input — text input with variants and states.
 *
 * Sizes: sm, md, lg
 * States: default, error, disabled
 */
const sizes = {
  sm: 'input-sm',
  md: '',
  lg: 'input-lg',
}

export const Input = forwardRef(function Input(
  { className = '', size = 'md', error = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={clsx(
        'input',
        sizes[size],
        error && 'border-danger focus:border-danger focus:ring-danger',
        className
      )}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea(
  { className = '', rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={clsx('input resize-none', className)}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select(
  { className = '', children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={clsx('input appearance-none cursor-pointer', className)}
      {...props}
    >
      {children}
    </select>
  )
})

export default Input