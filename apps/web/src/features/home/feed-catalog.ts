import catalog from './feed-items.json'

export type FeedItem = {
  id: string
  title: string
  subtitle: string
  detail: string
  author: string
  level: number
  ageLabel: string
  tags: string[]
  art: string[]
  background: string
  likes: number
  comments: number
  shares: number
  players: number
  followed: boolean
  src: string
}

export const feedItems: FeedItem[] = catalog

export const followingItems: FeedItem[] = catalog
  .filter((item) => item.followed)
  .sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || Number(a.id.slice(1)) - Number(b.id.slice(1)),
  )
