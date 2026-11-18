import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { pagePaths } from '../../page-paths'
import { feedItems } from '../home/feed-catalog'
import { setPrototypeGuest, subscribeHomeActivity } from './home-activity'

const names = { explore: '탐색', benefits: '혜택', profile: '프로필' } as const
const contentIds = new Set(feedItems.map((item) => item.id))
const isTab = (value: unknown): value is keyof typeof names =>
  value === 'explore' || value === 'benefits' || value === 'profile'

export const PrototypeTabs = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const router = useRouter()
  const index = useRouterState({ select: (state) => state.location.state.__TSR_index })
  const segment = pathname.split('/')[1]
  const tab = isTab(segment) && pathname === pagePaths[segment] ? segment : 'inactive'
  const active = tab !== 'inactive'
  const navigate = useNavigate()
  const frame = useRef<HTMLIFrameElement>(null)
  const lastPublicTab = useRef<{ tab: 'home' | 'explore'; index: number | null }>({
    tab: 'home',
    index: null,
  })
  const [visited, setVisited] = useState(active)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [fullTab, setFullTab] = useState<keyof typeof names | null>(null)

  useLayoutEffect(() => {
    if (pathname === '/' || tab === 'explore') {
      lastPublicTab.current = { tab: tab === 'explore' ? 'explore' : 'home', index }
    }
    if (active) setVisited(true)
    const receive = (event: MessageEvent) => {
      if (!frame.current || event.source !== frame.current.contentWindow || event.origin !== 'null')
        return
      const message = event.data
      if (message?.type === 'prototype-ready') {
        setStatus('ready')
        return
      }
      if (message?.type === 'prototype-guest' && typeof message.guest === 'boolean') {
        setPrototypeGuest(message.guest)
        return
      }
      if (!active || document.hidden || status !== 'ready') return
      if (message?.type === 'prototype-layout' && typeof message.full === 'boolean') {
        setFullTab(message.full ? tab : null)
        return
      }
      if (message?.type === 'prototype-cancel') {
        const previous = lastPublicTab.current
        if (tab === 'explore' || message.tab !== previous.tab) return
        if (previous.index !== null && previous.index + 1 === index && router.history.canGoBack()) {
          router.history.back()
        } else {
          void navigate({ to: pagePaths[previous.tab], replace: true })
        }
        return
      }
      if (message?.type !== 'prototype-open') return
      const destination: unknown = message.tab
      if (destination === 'home') {
        const { feed, play } = message
        if (
          (feed !== undefined && !contentIds.has(feed)) ||
          (play !== undefined && !contentIds.has(play))
        )
          return
        void navigate({
          to: '/',
          search: { feed, play },
          state: { fromPrototypePlayer: play !== undefined },
        })
      } else if (isTab(destination) && destination !== tab) {
        void navigate({ to: pagePaths[destination] })
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [active, index, navigate, pathname, router, status, tab])

  useEffect(() => {
    if (status !== 'ready') return
    // An allow-scripts sandbox has an opaque origin. Only send to this window.
    const sync = () =>
      frame.current?.contentWindow?.postMessage(
        {
          type: 'prototype-tab',
          tab: document.hidden ? 'inactive' : tab,
          returnTab: lastPublicTab.current.tab,
        },
        '*',
      )
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [status, tab])

  useEffect(() => {
    if (status !== 'ready' || !frame.current?.contentWindow) return
    const child = frame.current.contentWindow
    return subscribeHomeActivity((activity) => {
      child.postMessage({ type: 'prototype-activity', ...activity }, '*')
    })
  }, [status])

  useEffect(() => {
    if (!active || status !== 'loading') return
    const timer = window.setTimeout(() => setStatus('failed'), 15000)
    return () => window.clearTimeout(timer)
  }, [active, status])

  if (!active && !visited) return null
  return (
    <main
      className="prototype-tabs"
      data-fullscreen={status === 'ready' && fullTab === tab}
      hidden={!active}
      aria-label={active ? names[tab] : undefined}
    >
      {status === 'failed' ? (
        <div role="alert">
          <p>화면을 불러오지 못했어.</p>
          <button
            type="button"
            onClick={() => {
              setAttempt(attempt + 1)
              setStatus('loading')
            }}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <iframe
          key={attempt}
          ref={frame}
          title={active ? names[tab] : '탭 화면'}
          src="/prototype-tabs/index.html"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          onError={() => setStatus('failed')}
        />
      )}
    </main>
  )
}
