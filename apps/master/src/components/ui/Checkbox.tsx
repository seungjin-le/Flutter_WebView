import { useId, useState } from 'react'

export type CheckboxProps = {
  label: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  id?: string
}

export const Checkbox = ({
  label,
  checked,
  defaultChecked = false,
  onCheckedChange,
  id,
}: CheckboxProps) => {
  // Hooks
  const [inner, setInner] = useState(defaultChecked)
  const autoId = useId()

  // Computed
  const controlId = id ?? autoId
  const on = checked ?? inner

  // Handlers
  const handleToggle = () => {
    if (checked === undefined) setInner(!on)
    onCheckedChange?.(!on)
  }

  return (
    <div className="group flex items-center gap-3 font-sans text-foreground">
      <button
        type="button"
        id={controlId}
        role="checkbox"
        aria-checked={on}
        onClick={handleToggle}
        className={[
          'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border p-0 text-white shadow-control outline-none [transition:background-color_.15s_ease,border-color_.15s_ease,box-shadow_.15s_ease,transform_.1s_ease] active:scale-[.88]',
          'group-hover:shadow-none group-hover:ring-3 group-hover:ring-primary/15 focus-visible:border-ring focus-visible:shadow-none focus-visible:ring-3 focus-visible:ring-primary/30',
          on
            ? 'border-primary bg-primary'
            : 'border-border bg-transparent group-hover:border-primary-light',
        ].join(' ')}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path
            d="M20 6 9 17l-5-5"
            style={{
              strokeDasharray: 22,
              strokeDashoffset: on ? 0 : 22,
              transition: 'stroke-dashoffset .22s ease .04s',
            }}
          />
        </svg>
      </button>
      <label
        htmlFor={controlId}
        className="cursor-pointer select-none text-sm leading-none font-medium"
      >
        {label}
      </label>
    </div>
  )
}
