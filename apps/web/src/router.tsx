import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen.ts'

/** Creates the router; Start calls it once in the browser and once per request on the server. */
export const getRouter = () => {
  const queryClient = new QueryClient()
  return createRouter({
    routeTree,
    Wrap: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
