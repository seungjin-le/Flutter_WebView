import type { Post, PostSearchQuery } from './post-types'

export type PostSort = { id: 'title' | 'date' | 'updated' | 'views'; desc: boolean }

const latest: PostSort = { id: 'date', desc: true }
const sortByKey = new Map<string, PostSort>([
  ['latest', latest],
  ['updated', { id: 'updated', desc: true }],
  ['views', { id: 'views', desc: true }],
  ['title', { id: 'title', desc: false }],
])

export const sortFromQuery = (sort: string | undefined): PostSort =>
  sortByKey.get(sort ?? '') ?? latest

const titleAndBody = (post: Post) => [post.title, post.body]
const searchTexts = new Map<string, (post: Post) => string[]>([
  ['title', (post) => [post.title]],
  ['body', (post) => [post.body]],
  ['tag', (post) => post.tags],
])

export const filterPosts = (rows: Post[], query: Partial<PostSearchQuery> | null): Post[] => {
  const kw = (query?.kw ?? '').trim().toLowerCase()
  const textsOf = searchTexts.get(query?.field ?? '') ?? titleAndBody
  return rows.filter((r) => {
    if (kw && !textsOf(r).some((text) => text.toLowerCase().includes(kw))) return false
    if (!query) return true
    if (query.category && query.category !== 'all' && r.category !== query.category) return false
    if (query.author && r.author !== query.author) return false
    if (query.status?.length && !query.status.includes(r.status)) return false
    if (query.showOn?.length && !query.showOn.some((place) => r.showOn.includes(place)))
      return false
    if (query.from && r.date < query.from) return false
    if (query.to && r.date > query.to) return false
    if (query.pinned && !r.pinned) return false
    return true
  })
}

const compare = (a: Post, b: Post, id: PostSort['id']) => {
  if (id === 'views') return a.views - b.views
  return a[id] < b[id] ? -1 : a[id] > b[id] ? 1 : 0
}

export const sortPosts = (rows: Post[], sort: PostSort): Post[] => {
  const dir = sort.desc ? -1 : 1
  return rows.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return compare(a, b, sort.id) * dir
  })
}

export const paginate = (total: number, pageSize: number, page: number) => {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return { pages, page: Math.max(0, Math.min(page, pages - 1)) }
}

export const pageNumbers = (page: number, pages: number): number[] => {
  const n = Math.min(5, pages)
  const start = Math.max(0, Math.min(page - 2, pages - n))
  return Array.from({ length: n }, (_, i) => start + i)
}
