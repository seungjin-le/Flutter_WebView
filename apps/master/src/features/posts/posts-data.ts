import { AUTHORS, CATEGORIES } from './post-search'
import type { Post, PostStatus } from './post-types'

const authorKeys = AUTHORS.map((option) => option.value)
const categoryKeys = CATEGORIES.filter((option) => option.value !== 'all').map(
  (option) => option.value,
)
const statuses: PostStatus[] = [
  'published',
  'published',
  'draft',
  'scheduled',
  'published',
  'private',
  'archived',
]
const tagPool = ['소식', '가이드', '이벤트']
const showPools = [['main'], ['list'], ['main', 'notice'], []]

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Deterministic mock: views are a permutation of 24 values, updated is never before the created date.
export const createSamplePosts = (today = new Date()): Post[] =>
  Array.from({ length: 24 }, (_, i) => {
    const daysAgo = (n: number) =>
      toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n))
    const no = String(i + 1).padStart(2, '0')
    return {
      id: `POST-${1024 - i}`,
      title: `[게시글 제목 ${no}]`,
      body: `${no}번 글의 본문입니다.${i % 4 === 0 ? ' 중요 공지 포함' : ''}`,
      tags: [tagPool[i % 3], ...(i % 4 === 0 ? ['중요'] : [])],
      author: authorKeys[i % 5],
      category: categoryKeys[i % 3],
      status: statuses[i % 7],
      showOn: showPools[i % 4],
      date: daysAgo(i * 2),
      updated: daysAgo(Math.min(i * 2, (i * 5) % 11)),
      views: ((i * 7) % 24) * 130 + 50,
      pinned: i % 7 === 0,
    }
  })
