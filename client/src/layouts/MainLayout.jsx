import { Outlet } from 'react-router-dom'
import { Bug } from 'lucide-react'

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400">
            <Bug className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Bug Tracker</span>
        </div>
      </header>

      <main className="flex flex-1">
        <Outlet />
      </main>
    </div>
  )
}

