import { Link } from 'react-router-dom'
import { ArrowRight, Bug, Activity, CircleCheck, CircleAlert, FolderKanban, Loader2 } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth.js'
import { useAuth } from '@/context/AuthContext.jsx'

function ApiStatus() {
  const { data, isLoading, isError } = useHealth()

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-zinc-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Checking API…
      </span>
    )
  }

  if (isError) {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-400">
        <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" /> API unreachable
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-400">
      <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> API online · DB {data?.data?.database}
    </span>
  )
}

export default function HomePage() {
  const { user } = useAuth()

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg shadow-indigo-500/5">
        <Bug className="h-7 w-7 text-indigo-400" aria-hidden="true" />
      </div>

      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Bug Tracker</h1>
      {user?.name && (
        <p className="mt-2 text-sm font-medium text-indigo-400">
          Welcome back, {user.name}
        </p>
      )}
      <p className="mt-4 max-w-xl text-balance text-zinc-400">
        Plan, track, and resolve issues across your projects. A focused workspace for modern
        engineering teams.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-xs font-medium text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-400"
        >
          <FolderKanban className="h-4 w-4" aria-hidden="true" />
          <span>Open My Projects</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs">
        <Activity className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
        <ApiStatus />
      </div>
    </section>
  )
}
