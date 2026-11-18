export const pagePaths = {
  home: '/',
  explore: '/explore',
  benefits: '/benefits',
  profile: '/profile',
} as const

export const detailSegments = {
  raffle: 'raffles/$raffleId',
  history: 'history',
  settings: 'settings',
} as const

export const detailPaths = {
  raffle: `${pagePaths.benefits}/${detailSegments.raffle}`,
  history: `${pagePaths.benefits}/${detailSegments.history}`,
  settings: `${pagePaths.profile}/${detailSegments.settings}`,
} as const
