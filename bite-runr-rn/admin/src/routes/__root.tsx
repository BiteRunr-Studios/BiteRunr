import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConvexProvider } from 'convex/react'
import { convex } from '../convex'
import { ThemeProvider } from '../hooks/use-theme'
import { AuthProvider, useAuth } from '../hooks/use-auth'
import { LoginPage } from '../components/login-page'

import appCss from '../styles.css?url'

const themeScript = `
(function() {
  const theme = localStorage.getItem('theme') || 'dark';
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = theme === 'dark' || (theme === 'system' && systemDark);
  if (shouldBeDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();
`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'BiteRunr Dashboard',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  component: RootComponent,
})

const PUBLIC_ROUTES = ['/privacy']

function AuthGate() {
  const { isAuthenticated } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (PUBLIC_ROUTES.includes(pathname)) {
    return <Outlet />
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <ConvexProvider client={convex}>
      <Outlet />
    </ConvexProvider>
  )
}

function RootComponent() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
