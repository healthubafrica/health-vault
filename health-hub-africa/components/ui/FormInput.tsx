import { cn } from '@/lib/utils'
import { forwardRef, InputHTMLAttributes, LabelHTMLAttributes } from 'react'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--form-label-color, var(--color-text-muted))' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 px-3 rounded-xl text-sm border outline-none transition-all duration-150',
            'focus:border-[#6DC43F] focus:ring-2 focus:ring-[#6DC43F]/20',
            error && 'border-[var(--color-emergency)]',
            className
          )}
          style={{
            background: 'var(--color-surface)',
            borderColor: error ? 'var(--color-emergency)' : 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          {...props}
        />
        {hint && !error && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
        )}
        {error && (
          <p className="text-[11px]" style={{ color: 'var(--color-emergency)' }} role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
FormInput.displayName = 'FormInput'

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: React.ReactNode
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--form-label-color, var(--color-text-muted))' }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 px-3 rounded-xl text-sm border outline-none transition-all duration-150 cursor-pointer',
            'focus:border-[#6DC43F] focus:ring-2 focus:ring-[#6DC43F]/20',
            className
          )}
          style={{
            background: 'var(--color-surface)',
            borderColor: error ? 'var(--color-emergency)' : 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-[11px]" style={{ color: 'var(--color-emergency)' }} role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
FormSelect.displayName = 'FormSelect'

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  charCount?: number
  maxChars?: number
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, charCount, maxChars, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--form-label-color, var(--color-text-muted))' }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'px-3 py-2.5 rounded-xl text-sm border outline-none transition-all duration-150 resize-none',
            'focus:border-[#6DC43F] focus:ring-2 focus:ring-[#6DC43F]/20',
            className
          )}
          style={{
            background: 'var(--color-surface)',
            borderColor: error ? 'var(--color-emergency)' : 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          {...props}
        />
        {maxChars !== undefined && (
          <p
            className="text-[11px] text-right"
            style={{ color: (charCount ?? 0) > maxChars ? 'var(--color-emergency)' : 'var(--color-text-muted)' }}
          >
            {charCount ?? 0}/{maxChars}
          </p>
        )}
        {error && (
          <p className="text-[11px]" style={{ color: 'var(--color-emergency)' }} role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
FormTextarea.displayName = 'FormTextarea'
