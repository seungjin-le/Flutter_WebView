export type PostStatus = 'published' | 'draft' | 'scheduled' | 'private' | 'archived'

export type Post = {
  id: string
  title: string
  body: string
  tags: string[]
  author: string
  category: string
  status: PostStatus
  showOn: string[]
  date: string
  updated: string
  views: number
  pinned: boolean
}

export type PostSearchQuery = {
  field: string
  kw: string
  category: string
  author: string
  from: string
  to: string
  status: string[]
  showOn: string[]
  sort: string
  size: string
  pinned: boolean
}
