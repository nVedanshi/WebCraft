import * as React from 'react'
export function Card({ children, className }) { return <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className || ''}`}>{children}</div> }
export function CardHeader({ children, className }) { return <div className={`flex flex-col space-y-1.5 p-6 ${className || ''}`}>{children}</div> }
export function CardTitle({ children, className }) { return <h3 className={`text-lg font-semibold text-gray-900 leading-none ${className || ''}`}>{children}</h3> }
export function CardContent({ children, className }) { return <div className={`p-6 pt-0 ${className || ''}`}>{children}</div> }
export function Button({ children, className, variant = 'default', onClick }) { return <button className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${className || ''}`} onClick={onClick}>{children}</button> }
export function Input({ className, type = 'text', ...props }) { return <input type={type} className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ${className || ''}`} {...props} /> }
export function Badge({ children, className, variant = 'default' }) { return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className || ''}`}>{children}</span> }
export function Label({ children, className }) { return <span className={`text-sm font-medium text-gray-900 ${className || ''}`}>{children}</span> }
export function useToast() { return { toast: () => {} } }
