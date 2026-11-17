import { useId, useState } from 'react'

export type SwitchProps = {
  label: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  id?: string
}

export const Switch = ({
  label,
  checked,
  defaultChecked = false,
  onCheckedChange,
  id,
}: SwitchProps) => {
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
    <div className="flex items-center gap-2 font-sans text-foreground">
      <button
        type="button"
        id={controlId}
        role="switch"
        aria-checked={on}
        onClick={handleToggle}
        className={[
          'inline-flex h-[18.4px] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0 shadow-control outline-none [transition:all_.15s_ease] focus-visible:border-ring focus-visible:shadow-none focus-visible:ring-3 focus-visible:ring-primary/30',
          on ? 'bg-primary' : 'bg-border',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none block size-4 rounded-full bg-white [transition:transform_.15s_ease]',
            on ? 'translate-x-[calc(100%-2px)]' : 'translate-x-0',
          ].join(' ')}
        />
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
