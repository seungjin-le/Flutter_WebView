import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import App from './App'
import { BottomNav } from './components/layout/BottomNav'
import { HomeFeedPage } from './features/home/HomeFeedPage'
import { PrototypeTabs } from './features/prototype-tabs/PrototypeTabs'
import { pagePaths } from './page-paths'

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
  createRoute({ getParentRoute, path: pagePaths.benefits }),
  createRoute({ getParentRoute, path: pagePaths.profile }),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface HistoryState {
    fromPrototypePlayer?: boolean
  }
  interface Register {
    router: typeof router
  }
}
