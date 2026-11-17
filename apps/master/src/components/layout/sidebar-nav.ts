export type NavItemId =
  | 'dashboard'
  | 'posts'
  | 'pages'
  | 'categories'
  | 'media'
  | 'members'
  | 'roles'
  | 'banners'
  | 'popups'
  | 'notices'
  | 'settings'
  | 'logs'

export type NavItem = { id: NavItemId; label: string; icon: string }
export type NavGroup = { label: string; items: NavItem[] }

export const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      {
        id: 'dashboard',
        label: '대시보드',
        icon: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
      },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      {
        id: 'posts',
        label: '게시글',
        icon: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M8 13h8 M8 17h5',
      },
      {
        id: 'pages',
        label: '페이지',
        icon: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M3 9h18 M9 21V9',
      },
      {
        id: 'categories',
        label: '카테고리',
        icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      },
      {
        id: 'media',
        label: '미디어 라이브러리',
        icon: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 7a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M21 15l-5-5L5 21',
      },
    ],
  },
  {
    label: '회원',
    items: [
      {
        id: 'members',
        label: '회원 목록',
        icon: 'M9 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1 M16 3.5a4 4 0 0 1 0 7.5 M22 21v-1a6 6 0 0 0-4-5.6',
      },
      {
        id: 'roles',
        label: '권한 그룹',
        icon: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z M9 12l2 2 4-4',
      },
    ],
  },
  {
    label: '운영',
    items: [
      {
        id: 'banners',
        label: '배너',
        icon: 'M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M6 10h8 M6 14h5',
      },
      {
        id: 'popups',
        label: '팝업',
        icon: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 9h8v7H8z',
      },
      {
        id: 'notices',
        label: '공지사항',
        icon: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.9 1.9 0 0 0 3.4 0',
      },
    ],
  },
  {
    label: '설정',
    items: [
      {
        id: 'settings',
        label: '사이트 설정',
        icon: 'M4 6h10 M18 6h2 M4 12h4 M12 12h8 M4 18h12 M16 4a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M10 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M18 16a2 2 0 1 0 0 4a2 2 0 1 0 0-4z',
      },
      { id: 'logs', label: '활동 로그', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
    ],
  },
]

export const filterNavGroups = (groups: NavGroup[], query: string): NavGroup[] => {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
    }))
    .filter((group) => group.items.length > 0)
}
