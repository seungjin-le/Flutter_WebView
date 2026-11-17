import { useState } from 'react'

/** Controlled when `value` is defined; otherwise keeps its own state seeded by `defaultValue`. */
export const useControllable = <T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
) => {
  const [inner, setInner] = useState(defaultValue)
  const current = value === undefined ? inner : value
  const set = (next: T) => {
    if (value === undefined) setInner(next)
    onChange?.(next)
  }
  return [current, set] as const
}
