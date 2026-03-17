import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, FileText, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f6f8f7_0%,#eef6f2_45%,#ffffff_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-10 px-6 py-16">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            BiteRunr Admin
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            This admin package only hosts BiteRunr&apos;s public policy pages.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            The dashboard code that was previously here referenced app routes,
            Convex modules, and UI components that do not exist in this package.
            The homepage now stays within the scope documented for `admin`.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="border border-border bg-card p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.08)]">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-xl font-medium">Privacy policy</h2>
            </div>
            <p className="mb-6 text-sm leading-6 text-muted-foreground">
              View the current BiteRunr privacy policy published by this app.
            </p>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 border border-foreground bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:translate-x-1"
            >
              Open privacy page
              <ArrowRight className="size-4" />
            </Link>
          </section>

          <section className="border border-border bg-card p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.08)]">
            <div className="mb-4 flex items-center gap-3">
              <FileText className="size-5 text-primary" />
              <h2 className="text-xl font-medium">Package scope</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              If you want a real operational dashboard, it should live in a
              dedicated admin app with its own routes, shared UI, and Convex API
              surface instead of reaching into the mobile app repository
              structure.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
