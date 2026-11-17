import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  stripSearchParams,
} from '@tanstack/react-router'
import { Toaster } from './components/ui/Toaster'
import {
  defaultPostSearchParams,
  postSearchSchema,
  type PostSearchParams,
} from './features/posts/post-search'
import { PostsPage } from './features/posts/PostsPage'

const RootLayout = () => (
  <>
    <Outlet />
    <Toaster />
  </>
)
const rootRoute = createRootRoute({ component: RootLayout })
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: PostsPage,
  // Partial keeps <Link to="/"> valid without params; the page fills in the defaults.
  validateSearch: (search: Record<string, unknown>): Partial<PostSearchParams> =>
    postSearchSchema.parse(search),
  search: { middlewares: [stripSearchParams(defaultPostSearchParams)] },
})
const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/components',
  component: lazyRouteComponent(
    () => import('./features/components-gallery/ComponentsGalleryPage'),
    'ComponentsGalleryPage',
  ),
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, componentsRoute]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
