import { useState, type ReactNode } from 'react'
import type { FeedItem } from './feed-catalog'
import './feed-card.css'

type FeedCardProps = {
  item: FeedItem
  cover: boolean
  preview?: ReactNode
  onPlay: () => void
}

const paths = {
  like: 'M12 20s-7-4.5-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.5-9 9-9 9z',
  comment: 'M4 5h16v11H9l-5 4z',
  share: 'M4 12v7h16v-7M12 3v12M7 8l5-5 5 5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  person: 'M15.5 8A3.5 3.5 0 1 1 8.5 8a3.5 3.5 0 0 1 7 0ZM5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5',
}

const Icon = ({ name }: { name: keyof typeof paths }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={name === 'more' ? 4 : 1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={paths[name]} />
  </svg>
)

const formatCount = (value: number) =>
  value >= 10_000 ? Math.round(value / 1000) / 10 + '만' : value.toLocaleString('ko-KR')

export const FeedCard = ({ item, cover, preview, onPlay }: FeedCardProps) => {
  // Hooks
  const [liked, setLiked] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')

  // Computed
  const likes = item.likes + Number(liked)
  const tags = item.tags.map((tag) => '#' + tag).join(' ')

  // Handlers
  const handleShare = async () => {
    const url = new URL('/', window.location.origin)
    url.searchParams.set('feed', item.id)
    setShareFeedback('')
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url: url.href })
      } else {
        await navigator.clipboard.writeText(url.href)
        setShareFeedback('링크를 복사했어')
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setShareFeedback('링크를 공유할 수 없어')
      }
    }
  }

  return (
    <div className="feed-card" data-cover={cover} style={{ background: item.background }}>
      {cover ? (
        <>
          <svg
            className="feed-card-decor"
            aria-hidden="true"
            viewBox="0 0 420 746"
            preserveAspectRatio="xMidYMid slice"
          >
            <circle cx="350" cy="140" r="130" fill="#5c7d99" opacity=".2" />
            <circle cx="60" cy="560" r="160" fill="white" opacity=".35" />
          </svg>
          <div className="feed-card-body">
            <div className="feed-card-art" data-single={item.art.length === 1}>
              {item.art.slice(0, 3).map((src) => (
                <img key={src} src={src} alt="" />
              ))}
            </div>
            <h2>{item.title}</h2>
            {item.subtitle && <p>{item.subtitle}</p>}
            <p>{item.detail}</p>
            <span className="feed-card-start" aria-hidden="true">
              시작하기
            </span>
          </div>
        </>
      ) : (
        <div className="feed-card-preview">{preview}</div>
      )}
      <div className="feed-card-scrim" />
      <span className="feed-card-ai">AI로 생성됨</span>
      <button
        type="button"
        className="feed-card-open"
        aria-label={cover ? '시작하기' : item.title + ' 시작하기'}
        onClick={onPlay}
      />
      <div className="feed-card-rail">
        <button
          type="button"
          onClick={() => setLiked(!liked)}
          aria-pressed={liked}
          aria-label={'좋아요 ' + likes}
        >
          <Icon name="like" />
          <span>{likes ? formatCount(likes) : '좋아요'}</span>
        </button>
        <span className="feed-card-count" role="img" aria-label={'댓글 ' + item.comments + '개'}>
          <Icon name="comment" />
          <span>{item.comments ? formatCount(item.comments) : '댓글'}</span>
        </span>
        <button type="button" onClick={handleShare} aria-label={'공유 ' + item.shares}>
          <Icon name="share" />
          <span>{item.shares ? formatCount(item.shares) : '공유'}</span>
        </button>
        <details className="feed-card-details">
          <summary aria-label="콘텐츠 더보기">
            <Icon name="more" />
          </summary>
          <div>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <p>{tags}</p>
          </div>
        </details>
      </div>
      <div className="feed-card-meta">
        <span className="feed-card-avatar" aria-hidden="true">
          {item.author.slice(0, 1)}
        </span>
        <div className="feed-card-credit">
          <div className="feed-card-by">
            <span className="feed-card-level">◆ Lv.{item.level}</span>
            <b>{item.author}</b>
            <span>· {item.ageLabel}</span>
          </div>
          <div className="feed-card-tags">
            <span>{tags}</span>
            <span className="feed-card-players">
              <Icon name="person" />
              참여 {formatCount(item.players)}
            </span>
          </div>
        </div>
      </div>
      {shareFeedback && (
        <p className="feed-card-feedback" role="status">
          {shareFeedback}
        </p>
      )}
    </div>
  )
}
