type SpinnerProps = {
  size?: number | string
  /** Accessible name. Pass null when the spinner is decorative (next to visible text). */
  label?: string | null
  className?: string
}

export const Spinner = ({ size = 16, label = '로딩 중', className }: SpinnerProps) => (
  <svg
    role={label === null ? undefined : 'status'}
    aria-label={label ?? undefined}
    aria-hidden={label === null ? true : undefined}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={['block shrink-0 animate-spinner', className].filter(Boolean).join(' ')}
  >
    <path d="M12 2v4" />
    <path d="m16.2 7.8 2.9-2.9" />
    <path d="M18 12h4" />
    <path d="m16.2 16.2 2.9 2.9" />
    <path d="M12 18v4" />
    <path d="m4.9 19.1 2.9-2.9" />
    <path d="M2 12h4" />
    <path d="m4.9 4.9 2.9 2.9" />
  </svg>
)
