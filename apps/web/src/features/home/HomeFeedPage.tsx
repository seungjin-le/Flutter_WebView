import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { FeedCard } from './FeedCard'
import { FeedFrame } from './FeedFrame'
import { FeedPlayer } from './FeedPlayer'
import { feedItems, followingItems, type FeedItem } from './feed-catalog'
import './home-feed.css'

const withAds = (items: FeedItem[]) =>
  items.flatMap((item, index): (FeedItem | null)[] =>
    (index + 1) % 5 === 0 && index < items.length - 1 ? [item, null] : [item],
  )
const lists = {
  recommended: withAds(feedItems),
  following: withAds(followingItems),
}

const FeedClock = ({ running }: { running: boolean }) => {
  const [seconds, setSeconds] = useState(0)
  const ticking = running && seconds < 180
  useEffect(() => {
    if (!ticking) return
    const timer = window.setInterval(() => setSeconds((n) => Math.min(n + 1, 180)), 1000)
    return () => window.clearInterval(timer)
  }, [ticking])
  return (
    <span className="feed-clock" aria-label="피드 둘러본 시간">
      👀 {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} /3:00
    </span>
  )
}

export const HomeFeedPage = () => {
  // Hooks
  const scroll = useRef<HTMLDivElement>(null)
  const openedFromFeed = useRef<string | null>(null)
  const [windowState, setWindowState] = useState({ index: 0, loaded: [0, 1] })
  const [visible, setVisible] = useState(!document.hidden)
  const search = useSearch({ from: '/' })
  const { feed, play, view } = search
  const initialPlay = useRef(play)
  const mode = view === 'following' ? 'following' : 'recommended'
  const navigate = useNavigate({ from: '/' })
  const router = useRouter()

  // Computed
  const cards = lists[mode]
  const player = feedItems.find((item) => item.id === play)

  // Watchers
  useLayoutEffect(() => {
    const root = scroll.current
    const device = root?.closest('#root')
    if (!root || !device) return
    const resize = () => {
      const width = device.clientWidth
      const height = Math.max(root.clientHeight, device.clientHeight - 56, 1)
      const scale = root.clientHeight / height
      root.style.setProperty('--preview-width', width + 'px')
      root.style.setProperty('--preview-height', height + 'px')
      root.style.setProperty('--preview-scale', String(scale))
      root.style.setProperty(
        '--preview-left',
        Math.max(0, (root.clientWidth - width * scale) / 2) + 'px',
      )
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(root)
    observer.observe(device)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const root = scroll.current
    if (!root) return
    const elements = Array.from(root.querySelectorAll('article'))
    const target = initialPlay.current ?? feed
    const start = Math.max(
      0,
      cards.findIndex((item) => item && item.id === target),
    )
    root.scrollTop = elements[start]?.offsetTop ?? 0
    setWindowState({ index: start, loaded: [start - 1, start, start + 1] })
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue
          const index = elements.findIndex((element) => element === entry.target)
          if (index < 0) continue
          setWindowState((previous) =>
            previous.index === index
              ? previous
              : {
                  index,
                  loaded: [
                    ...new Set([
                      ...previous.loaded.filter((n) => Math.abs(n - index) <= 2),
                      index - 1,
                      index,
                      index + 1,
                    ]),
                  ],
                },
          )
        }
      },
      { root, threshold: 0.6 },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [cards, feed])

  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  // Handlers
  const handleMode = (next: keyof typeof lists) => {
    initialPlay.current = undefined
    scroll.current?.scrollTo({ top: 0 })
    void navigate({
      to: '/',
      search: { view: next === 'following' ? next : undefined },
      replace: true,
    })
  }
  const handleOpen = (item: FeedItem) => {
    openedFromFeed.current = item.id
    void navigate({ to: '/', search: { ...search, play: item.id }, resetScroll: false })
  }
  const handleClose = () => {
    initialPlay.current = undefined
    if (openedFromFeed.current === play && router.history.canGoBack()) router.history.back()
    else
      void navigate({
        to: '/',
        search: { ...search, feed: play, play: undefined },
        replace: true,
        resetScroll: false,
      })
  }

  return (
    <main className="home-feed">
      <h1 className="sr-only">홈 피드</h1>
      <header className="home-feed-header">
        <button
          type="button"
          aria-pressed={mode === 'recommended'}
          onClick={() => handleMode('recommended')}
        >
          추천
        </button>
        <button
          type="button"
          aria-pressed={mode === 'following'}
          onClick={() => handleMode('following')}
        >
          팔로잉
        </button>
        <FeedClock running={visible && !player} />
        <details className="feed-notifications">
          <summary aria-label="알림">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 7-2.5 9h17C20.5 15 18 14 18 8ZM10 20c1 2 3 2 4 0" />
            </svg>
          </summary>
          <p>새 알림이 없어.</p>
        </details>
      </header>
      <div
        className="home-feed-scroll"
        aria-label="홈 피드"
        role="region"
        tabIndex={0}
        ref={scroll}
      >
        {cards.map((item, index) => (
          <article
            key={item?.id ?? 'ad-' + index}
            aria-label={item?.title ?? '광고'}
            data-active={index === windowState.index}
          >
            {item ? (
              <FeedCard
                item={item}
                cover={index === 0}
                onPlay={() => handleOpen(item)}
                preview={
                  index > 0 && windowState.loaded.includes(index) ? (
                    <FeedFrame
                      item={item}
                      active={visible && !player && windowState.index === index}
                    />
                  ) : undefined
                }
              />
            ) : (
              <div className="feed-ad">
                <small>광고</small>
                <span aria-hidden="true">🧃</span>
                <h2>상큼한 하루의 시작</h2>
                <p>피드 광고 · 보상 없음</p>
              </div>
            )}
          </article>
        ))}
        {cards.length === 0 && <p>볼 수 있는 콘텐츠가 없어.</p>}
      </div>
      {player && <FeedPlayer item={player} visible={visible} onClose={handleClose} />}
    </main>
  )
}
