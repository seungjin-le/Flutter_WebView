import type { ReactNode } from 'react'

type IconProps = { className?: string }

const createIcon = (paths: ReactNode) => {
  const Icon = ({ className = 'size-4' }: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths}
    </svg>
  )
  return Icon
}

export const CheckIcon = createIcon(<path d="M20 6 9 17l-5-5" />)
export const ChevronDownIcon = createIcon(<path d="m6 9 6 6 6-6" />)
export const ChevronUpDownIcon = createIcon(
  <>
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </>,
)
export const ChevronRightIcon = createIcon(<path d="m9 18 6-6-6-6" />)
export const ChevronLeftIcon = createIcon(<path d="m15 18-6-6 6-6" />)
export const XIcon = createIcon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
)
export const SearchIcon = createIcon(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>,
)
export const PlusIcon = createIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
)
export const MoreHorizontalIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </>,
)
