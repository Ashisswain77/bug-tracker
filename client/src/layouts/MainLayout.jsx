import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bug, FolderKanban, Loader2, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'

export default function MainLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const isProjectsActive = pathname.startsWith('/projects')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 transition hover:opacity-90">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400">
                <Bug className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold tracking-tight">Bug Tracker</span>
            </Link>

            {!isLoading && isAuthenticated && (
              <Link
                to="/projects"
                aria-current={isProjectsActive ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  isProjectsActive
                    ? 'bg-zinc-900 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                }`}
              >
                <FolderKanban className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                <span>Projects</span>
              </Link>
            )}
          </div>

          {!isLoading && (
            <nav className="flex items-center gap-2.5">
              {isAuthenticated ? (
                <>
                  <span className="hidden text-xs text-zinc-400 sm:inline">
                    {user?.name || user?.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoggingOut ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                    )}
                    <span>Sign out</span>
                  </button>
                </>
              ) : (
                <>
                  {pathname !== '/login' && (
                    <Link
                      to="/login"
                      className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
                    >
                      Sign in
                    </Link>
                  )}
                  {pathname !== '/register' && (
                    <Link
                      to="/register"
                      className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-400"
                    >
                      Get started
                    </Link>
                  )}
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      <main className="flex flex-1">
        <Outlet />
      </main>
    </div>
  )
}
