import { Link, useRouterState } from '@tanstack/react-router'
import { MapPin, Package, LayoutDashboard, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './theme-toggle'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/locations', label: 'Locations', icon: MapPin },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </Button>
          <span className="font-semibold">BiteRunr Dashboard</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-sidebar transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-6">
          <div className="flex items-center">
            <Package className="mr-2 size-5 text-primary" />
            <span className="font-semibold text-sidebar-foreground">
              Dashboard
            </span>
          </div>
          <ThemeToggle />
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive =
              item.to === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
