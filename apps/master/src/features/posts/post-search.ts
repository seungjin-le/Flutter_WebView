import { z } from 'zod'
import type { PostSearchQuery } from './post-types'

type Option = { value: string; label: string }

const options = (pairs: [string, string][]): Option[] =>
  pairs.map(([value, label]) => ({ value, label }))

export const FIELDS = options([
  ['title_body', '제목+내용'],
  ['title', '제목'],
  ['body', '내용'],
  ['tag', '태그'],
])
export const CATEGORIES = options([
  ['all', '전체'],
  ['cat1', '[카테고리 1]'],
  ['cat2', '[카테고리 2]'],
  ['cat3', '[카테고리 3]'],
])
export const SIZES = options([
  ['10', '10개씩'],
  ['20', '20개씩'],
  ['50', '50개씩'],
  ['100', '100개씩'],
])
export const AUTHORS = options([
  ['a', '[작성자 A]'],
  ['b', '[작성자 B]'],
  ['c', '[작성자 C]'],
  ['d', '[작성자 D]'],
  ['e', '[작성자 E]'],
])
export const STATUSES = options([
  ['published', '게시중'],
  ['draft', '임시저장'],
  ['scheduled', '예약'],
  ['private', '비공개'],
  ['archived', '보관'],
])
export const SHOW_POSITIONS = options([
  ['main', '메인 화면'],
  ['list', '목록 상단'],
  ['notice', '공지 영역'],
])
export const SORTS = options([
  ['latest', '최신 등록순'],
  ['updated', '최근 수정순'],
  ['views', '조회수순'],
  ['title', '제목순'],
])

export const initialPostSearch: PostSearchQuery = {
  field: 'title_body',
  kw: '',
  category: 'all',
  author: '',
  from: '',
  to: '',
  status: [],
  showOn: [],
  sort: 'latest',
  size: '20',
  pinned: false,
}

export const validateKeyword = (kw: string) => {
  const trimmed = kw.trim()
  return trimmed && trimmed.length < 2 ? '검색어는 2자 이상 입력하세요.' : ''
}

export const labelOf = (list: Option[], value: string) =>
  list.find((option) => option.value === value)?.label

const dotted = (iso: string) => iso.replace(/-/g, '.')

const rangeLabel = (from: string, to: string) => {
  if (from && to) return `${dotted(from)} - ${dotted(to)}`
  if (from) return `${dotted(from)} -`
  if (to) return `- ${dotted(to)}`
  return ''
}

export type FilterBadge = { label: string; clear: Partial<PostSearchQuery> }

export const buildBadges = (q: PostSearchQuery): FilterBadge[] => {
  const kw = q.kw.trim()
  const range = rangeLabel(q.from, q.to)
  const names = (list: Option[], values: string[]) => values.map((v) => labelOf(list, v)).join(', ')
  const badges: (FilterBadge | false)[] = [
    !!kw && { label: `${labelOf(FIELDS, q.field)}: ${kw}`, clear: { kw: '' } },
    q.category !== 'all' && {
      label: `카테고리: ${labelOf(CATEGORIES, q.category)}`,
      clear: { category: 'all' },
    },
    !!q.author && { label: `작성자: ${labelOf(AUTHORS, q.author)}`, clear: { author: '' } },
    !!range && { label: `등록일: ${range}`, clear: { from: '', to: '' } },
    q.status.length > 0 && { label: `상태: ${names(STATUSES, q.status)}`, clear: { status: [] } },
    q.showOn.length > 0 && {
      label: `노출: ${names(SHOW_POSITIONS, q.showOn)}`,
      clear: { showOn: [] },
    },
    q.pinned && { label: '상단 고정 글만', clear: { pinned: false } },
    q.sort !== 'latest' && { label: `정렬: ${labelOf(SORTS, q.sort)}`, clear: { sort: 'latest' } },
    q.size !== '20' && { label: `목록: ${labelOf(SIZES, q.size)}`, clear: { size: '20' } },
  ]
  return badges.filter((badge): badge is FilterBadge => badge !== false)
}

// Query-string values arrive JSON-parsed, so "2024" or 50 may be numbers.
const text = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (typeof value === 'number' ? String(value) : value), schema)
const inList = (list: Option[]) => (value: string) => list.some((option) => option.value === value)
const choice = (list: Option[], fallback: string) =>
  text(z.string().refine(inList(list))).catch(fallback)
const multiChoice = (list: Option[]) => z.array(z.string().refine(inList(list))).catch([])

/** URL contract of the posts page: every field falls back to its default when invalid. */
export const postSearchSchema = z.object({
  field: choice(FIELDS, initialPostSearch.field),
  kw: text(z.string().refine((kw) => validateKeyword(kw) === '')).catch(initialPostSearch.kw),
  category: choice(CATEGORIES, initialPostSearch.category),
  author: choice([...AUTHORS, { value: '', label: '' }], initialPostSearch.author),
  from: text(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).catch(initialPostSearch.from),
  to: text(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).catch(initialPostSearch.to),
  status: multiChoice(STATUSES),
  showOn: multiChoice(SHOW_POSITIONS),
  sort: choice(SORTS, initialPostSearch.sort),
  size: choice(SIZES, initialPostSearch.size),
  pinned: z.boolean().catch(initialPostSearch.pinned),
  page: z.coerce.number().int().min(1).catch(1),
})

export type PostSearchParams = z.output<typeof postSearchSchema>

export const defaultPostSearchParams: PostSearchParams = { ...initialPostSearch, page: 1 }
