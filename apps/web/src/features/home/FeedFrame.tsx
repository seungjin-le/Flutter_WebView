import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FeedItem } from './feed-catalog'

type FeedFrameProps = {
  item: FeedItem
  active: boolean
  interactive?: boolean
  onShare?: () => void
}

export const FeedFrame = ({ item, active, interactive = false, onShare }: FeedFrameProps) => {
  // Hooks
  const frame = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)

  // Watchers
  useLayoutEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== 'null' || !frame.current || event.source !== frame.current.contentWindow)
        return
      const message = event.data
      if (message?.__lb !== 1 || message.proto !== 1) return
      if (message.type === 'ready') setStatus('ready')
      if (message.type === 'share' && interactive) onShare?.()
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [interactive, onShare])

  useEffect(() => {
    if (status !== 'ready') return
    // Sandboxed documents have an opaque origin; address only this iframe's window.
    frame.current?.contentWindow?.postMessage(
      {
        __lb: 1,
        proto: 1,
        type: 'visible',
        payload: { visible: active },
      },
      '*',
    )
  }, [active, status])

  useEffect(() => {
    if (!active || status !== 'loading') return
    const timeout = window.setTimeout(() => setStatus('failed'), 15000)
    return () => window.clearTimeout(timeout)
  }, [active, status])

  // Handlers
  const handleRetry = () => {
    setAttempt(attempt + 1)
    setStatus('loading')
  }

  return (
    <div className="feed-frame">
      {status === 'loading' && (
        <div
          className="feed-frame-loading"
          style={{ background: item.background }}
          role="status"
          aria-label="콘텐츠 불러오는 중"
        >
          {item.art[0] && <img src={item.art[0]} alt="" />}
        </div>
      )}
      {status === 'failed' ? (
        <div className="feed-frame-fallback">
          <p>콘텐츠를 불러오지 못했어.</p>
          <button type="button" onClick={handleRetry}>
            다시 시도
          </button>
        </div>
      ) : (
        <iframe
          key={attempt}
          ref={frame}
          src={item.src}
          title={item.title + (interactive ? ' 참여' : ' 미리보기')}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          tabIndex={interactive ? 0 : -1}
          aria-hidden={interactive ? undefined : true}
          data-ready={status === 'ready'}
          onError={() => setStatus('failed')}
        />
      )}
    </div>
  )
}
