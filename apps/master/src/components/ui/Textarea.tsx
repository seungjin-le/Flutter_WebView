import { useId, type TextareaHTMLAttributes } from 'react'

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-invalid'> & {
  label?: string
  description?: string
  errorText?: string
  invalid?: boolean
}

export const Textarea = ({
  label,
  description,
  errorText,
  invalid = false,
  id,
  disabled,
  className,
  ...rest
}: TextareaProps) => {
  // Hooks
  const autoId = useId()

  // Computed
  const controlId = id ?? autoId
  const showError = invalid && !!errorText
  const describedBy =
    [description && `${controlId}-desc`, showError && `${controlId}-err`]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className="flex w-full flex-col gap-3 font-sans text-foreground">
      {label && (
        <label
          htmlFor={controlId}
          className={[
            'text-sm leading-[1.375] font-medium select-none',
            invalid ? 'text-destructive' : '',
            disabled ? 'opacity-50' : '',
          ].join(' ')}
        >
          {label}
        </label>
      )}
      <textarea
        id={controlId}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={[
          'field-sizing-content block min-h-16 w-full resize-none rounded-md border bg-transparent px-3 py-2 font-[inherit] text-sm leading-5 text-foreground shadow-control outline-none transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          invalid
            ? 'border-destructive shadow-none ring-3 ring-destructive/[.12] placeholder:text-destructive/60 focus-visible:ring-destructive/20'
            : 'border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/30',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {description && (
        <p
          id={`${controlId}-desc`}
          className={`text-sm leading-normal ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {description}
        </p>
      )}
      {showError && (
        <p id={`${controlId}-err`} role="alert" className="text-sm leading-normal text-destructive">
          {errorText}
        </p>
      )}
    </div>
  )
}
