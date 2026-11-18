import { Link, useRouterState } from '@tanstack/react-router'
import { pagePaths } from '../../page-paths'

const items = [
  { label: '홈', to: pagePaths.home, icon: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /> },
  {
    label: '탐색',
    to: pagePaths.explore,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </>
    ),
  },
  { label: '만들기', to: null, icon: <path d="M12 5v14M5 12h14" /> },
  {
    label: '혜택',
    to: pagePaths.benefits,
    icon: (
      <>
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M3 12h18M12 8v13M12 8C10 1 3 3 6 7q1 1 6 1c2-7 9-5 6-1q-1 1-6 1" />
      </>
    ),
  },
  {
    label: '프로필',
    to: pagePaths.profile,
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>
    ),
  },
] as const

export const BottomNav = () => {
  // Hooks
  const isHome = useRouterState({ select: (state) => state.location.pathname === pagePaths.home })

  return (
    <nav aria-label="하단 메뉴" className="bottom-nav" data-home={isHome}>
      {items.map(({ label, to, icon }) => {
        const isCreate = to === null
        const content = (
          <>
            <span className={isCreate ? 'bottom-nav-create' : undefined}>
              <svg
                aria-hidden="true"
                width={isCreate ? 20 : 22}
                height={isCreate ? 20 : 22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {icon}
              </svg>
            </span>
            {label}
          </>
        )
        return to === null ? (
          <button key={label} type="button" disabled>
            {content}
          </button>
        ) : (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true, includeSearch: false }}
            onClick={(event) => {
              if (
                event.currentTarget.getAttribute('aria-current') === 'page' &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey
              )
                event.preventDefault()
            }}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
