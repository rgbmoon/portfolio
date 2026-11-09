import type { ReactNode } from 'react'

import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'

import appCss from '#src/styles.css?url'

interface RootDocumentProps {
  children: ReactNode
}

const RootDocument = ({ children }: RootDocumentProps) => (
  <html lang="en">
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Portfolio' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})
