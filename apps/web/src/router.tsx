import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import App from './App'
import { BottomNav } from './components/layout/BottomNav'
import { HomeFeedPage } from './features/home/HomeFeedPage'
import { PrototypeTabs } from './features/prototype-tabs/PrototypeTabs'
import { detailSegments, pagePaths } from './page-paths'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <PrototypeTabs />
      <BottomNav />
    </>
  ),
  // Keep existing WebView entry URLs capable of running the connection demo.
  notFoundComponent: App,
})

const getParentRoute = () => rootRoute
const benefitsRoute = createRoute({ getParentRoute, path: pagePaths.benefits })
const profileRoute = createRoute({ getParentRoute, path: pagePaths.profile })
const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute,
    path: pagePaths.home,
    component: HomeFeedPage,
    validateSearch: (
      search: Record<string, unknown>,
    ): { feed?: string; play?: string; view?: 'following' } => ({
      view: search.view === 'following' ? 'following' : undefined,
      feed: typeof search.feed === 'string' ? search.feed : undefined,
      play: typeof search.play === 'string' ? search.play : undefined,
    }),
  }),
  createRoute({ getParentRoute, path: '/connection', component: App }),
  createRoute({ getParentRoute, path: pagePaths.explore }),
  benefitsRoute.addChildren([
    createRoute({ getParentRoute: () => benefitsRoute, path: detailSegments.raffle }),
    createRoute({ getParentRoute: () => benefitsRoute, path: detailSegments.history }),
  ]),
  profileRoute.addChildren([
    createRoute({ getParentRoute: () => profileRoute, path: detailSegments.settings }),
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface HistoryState {
    prototypeDocumentTimeOrigin?: number
    fromPrototypePlayer?: boolean
  }
  interface Register {
    router: typeof router
  }
}
