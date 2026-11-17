import { useId, useRef, useState, type ReactNode } from 'react'
import { useDismiss } from '../../hooks/use-dismiss'
import { useExitAnimation } from '../../hooks/use-exit-animation'
import { ChevronUpDownIcon } from '../ui/icons'
import { filterNavGroups, navGroups, type NavItemId } from './sidebar-nav'

export type SidebarProps = {
  /** Controlled when `onToggle` is given; otherwise only the initial state. */
  collapsed?: boolean
  onToggle?: () => void
  activeItem?: NavItemId
}

const hideWhenCollapsed = 'group-data-[state=collapsed]/sb:hidden'

const SvgIcon = ({
  children,
  className = 'size-4',
}: {
  children: ReactNode
  className?: string
}) => (
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
    {children}
  </svg>
)

const Avatar = () => (
  <span
    aria-hidden="true"
    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-shell-border text-[13px] font-semibold text-shell-strong"
  >
    관
  </span>
)

const Identity = ({ className = '' }: { className?: string }) => (
  <span className={`flex min-w-0 flex-col leading-[1.3] ${className}`}>
    <span className="text-sm font-semibold text-shell-strong">[관리자명]</span>
    <span className="truncate text-xs text-shell-muted">[admin@도메인]</span>
  </span>
)

const Tip = ({ label }: { label: string }) => (
  <span
    data-tip=""
    className="pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-60 hidden -translate-y-1/2 rounded-md bg-shell-strong px-2.5 py-1.5 text-xs leading-[normal] font-normal whitespace-nowrap text-subtle group-hover/mi:block group-focus-visible/mi:block"
  >
    {label}
  </span>
)

const rowBase =
  'group/mi relative flex w-full items-center gap-2 px-2 text-left text-sm no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[state=collapsed]/sb:w-8 group-data-[state=collapsed]/sb:justify-center group-data-[state=collapsed]/sb:px-0'
const rowIdle = 'text-shell-muted-strong hover:bg-shell-hover hover:text-shell-strong'
const menuItem =
  'flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-2 py-1.5 text-left text-sm text-shell-foreground outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-ring'

export const Sidebar = ({ collapsed, onToggle, activeItem = 'posts' }: SidebarProps) => {
  // Hooks
  const userRef = useRef<HTMLDivElement>(null)
  const [innerCollapsed, setInnerCollapsed] = useState(collapsed ?? false)
  const [active, setActive] = useState(activeItem)
  const [prevActiveItem, setPrevActiveItem] = useState(activeItem)
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { mounted, closing } = useExitAnimation(menuOpen)
  const searchId = useId()
  useDismiss(userRef, menuOpen, () => setMenuOpen(false))

  // Computed
  const isCollapsed = onToggle ? !!collapsed : innerCollapsed
  const toggleLabel = isCollapsed ? '사이드바 펼치기' : '사이드바 접기'
  const groups = filterNavGroups(navGroups, isCollapsed ? '' : query)

  // Watchers
  const [prevCollapsed, setPrevCollapsed] = useState(isCollapsed)
  if (activeItem !== prevActiveItem) {
    setPrevActiveItem(activeItem)
    setActive(activeItem)
  }
  // Any collapse change (rail, external header button) closes the account menu.
  if (isCollapsed !== prevCollapsed) {
    setPrevCollapsed(isCollapsed)
    setMenuOpen(false)
  }

  // Handlers
  const handleCloseMenu = () => setMenuOpen(false)

  const handleToggle = () => {
    if (onToggle) onToggle()
    else setInnerCollapsed(!isCollapsed)
  }

  return (
    <aside
      aria-label="관리자 메뉴"
      data-state={isCollapsed ? 'collapsed' : 'expanded'}
      className="group/sb relative box-border flex h-full min-h-[900px] w-64 shrink-0 flex-col border-r border-shell-border bg-subtle font-sans text-shell-muted-strong transition-[width] duration-200 ease-[ease] data-[state=collapsed]:w-12"
    >
      {menuOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="메뉴 닫기"
          onClick={handleCloseMenu}
          className="fixed inset-0 z-40 m-0 cursor-default border-0 bg-transparent p-0"
        />
      )}

      <div className="flex flex-col gap-2 p-2">
        <div className="flex h-12 items-center gap-2 px-2 group-data-[state=collapsed]/sb:px-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <SvgIcon>
              <path d="m12 2 10 5-10 5L2 7z" />
              <path d="m2 17 10 5 10-5" />
              <path d="m2 12 10 5 10-5" />
            </SvgIcon>
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-sm leading-[1.3] font-semibold text-shell-strong ${hideWhenCollapsed}`}
          >
            [사이트명]
          </span>
        </div>

        <div className={`relative ${hideWhenCollapsed}`}>
          <label htmlFor={searchId} className="sr-only">
            메뉴 검색
          </label>
          <SvgIcon className="pointer-events-none absolute top-2 left-2 size-4 text-shell-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </SvgIcon>
          <input
            id={searchId}
            type="search"
            placeholder="메뉴 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="box-border h-8 w-full rounded-md border border-shell-border bg-white pr-2 pl-8 text-sm text-shell-strong outline-none placeholder:text-shell-muted focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <nav
        aria-label="주 메뉴"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto group-data-[state=collapsed]/sb:overflow-visible"
      >
        {groups.map((group) => (
          <div key={group.label || 'root'} className="flex flex-col p-2">
            {group.label && (
              <div
                className={`flex h-8 items-center px-2 text-xs font-medium text-shell-muted ${hideWhenCollapsed}`}
              >
                {group.label}
              </div>
            )}
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {group.items.map((item) => {
                const current = item.id === active
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={current ? 'page' : undefined}
                      aria-label={isCollapsed ? item.label : undefined}
                      onClick={() => setActive(item.id)}
                      className={`${rowBase} h-8 cursor-pointer rounded-md border-0 ${current ? 'bg-primary-soft font-medium text-primary-hover' : `bg-transparent ${rowIdle}`}`}
                    >
                      <SvgIcon className="size-4 shrink-0">
                        <path d={item.icon} />
                      </SvgIcon>
                      <span className={`min-w-0 flex-1 truncate ${hideWhenCollapsed}`}>
                        {item.label}
                      </span>
                      {isCollapsed && <Tip label={item.label} />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="m-0 p-4 text-[13px] leading-[normal] text-shell-muted">
            일치하는 메뉴가 없습니다.
          </p>
        )}
      </nav>

      <div className="p-2">
        <div ref={userRef} className={`relative ${menuOpen ? 'z-50' : ''}`}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={isCollapsed ? '계정' : undefined}
            onClick={() => setMenuOpen(!menuOpen)}
            className={`${rowBase} h-12 cursor-pointer rounded-lg border-0 bg-transparent group-data-[state=collapsed]/sb:h-8 ${rowIdle}`}
          >
            <Avatar />
            <Identity className={`flex-1 ${hideWhenCollapsed}`} />
            <ChevronUpDownIcon className={`size-4 text-shell-muted ${hideWhenCollapsed}`} />
            {isCollapsed && <Tip label="계정" />}
          </button>
          {mounted && (
            <div
              role="menu"
              aria-label="계정 메뉴"
              className={`absolute right-0 bottom-[calc(100%+4px)] left-0 z-50 box-border min-w-56 origin-bottom-left rounded-lg border border-shell-border bg-white p-1 shadow-[0_10px_15px_-3px_rgba(0,0,0,.08),0_4px_6px_-4px_rgba(0,0,0,.06)] group-data-[state=collapsed]/sb:right-auto group-data-[state=collapsed]/sb:bottom-0 group-data-[state=collapsed]/sb:left-[calc(100%+8px)] ${
                closing
                  ? 'pointer-events-none animate-sb-pop-out group-data-[state=collapsed]/sb:animate-sb-pop-out-side'
                  : 'animate-sb-pop-in group-data-[state=collapsed]/sb:animate-sb-pop-in-side'
              }`}
            >
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar />
                <Identity />
              </div>
              <div aria-hidden="true" className="-mx-1 my-1 h-px bg-shell-border" />
              <button type="button" role="menuitem" onClick={handleCloseMenu} className={menuItem}>
                <SvgIcon>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a7 7 0 0 1 16 0v1" />
                </SvgIcon>
                내 계정
              </button>
              <div aria-hidden="true" className="-mx-1 my-1 h-px bg-shell-border" />
              <button type="button" role="menuitem" onClick={handleCloseMenu} className={menuItem}>
                <SvgIcon>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </SvgIcon>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        tabIndex={-1}
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={handleToggle}
        className="absolute inset-y-0 -right-2 z-20 m-0 w-4 cursor-ew-resize border-0 bg-transparent p-0 after:absolute after:inset-y-0 after:left-[7px] after:w-0.5 after:bg-transparent after:transition-colors hover:after:bg-shell-border"
      />
    </aside>
  )
}
