import { useEffect, useRef, useState } from 'react'
import { recordHomeActivity } from '../prototype-tabs/home-activity'
import { FeedFrame } from './FeedFrame'
import type { FeedItem } from './feed-catalog'

export const FeedPlayer = ({
  item,
  visible,
  onClose,
}: {
  item: FeedItem
  visible: boolean
  onClose: () => void
}) => {
  // Hooks
  const dialog = useRef<HTMLDialogElement>(null)

  const [showShare, setShowShare] = useState(false)
  const link = new URL('/', window.location.origin)
  link.searchParams.set('feed', item.id)

  // Watchers
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="feed-player"
      aria-label={item.title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header>
        <button type="button" aria-label="닫기" onClick={onClose}>
          ×
        </button>
        <strong>{item.title}</strong>
        <small>AI로 생성됨</small>
      </header>
      <FeedFrame
        key={item.id}
        item={item}
        active={visible && !showShare}
        interactive
        onShare={() => {
          setShowShare(true)
          recordHomeActivity({ act: 'share', id: item.id })
        }}
      />
      {showShare && (
        <section className="feed-player-share" aria-label="콘텐츠 공유">
          <label>
            공유 링크
            <input readOnly value={link.href} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <button type="button" onClick={() => setShowShare(false)}>
            공유 닫기
          </button>
        </section>
      )}
    </dialog>
  )
}
