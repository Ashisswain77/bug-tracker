import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import { resolveRedirectPath } from '@/utils/navigation.js'

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-1 items-center justify-center px-6 py-24"
      >
        <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" aria-hidden="true" />
          Loading…
        </span>
      </div>
    )
  }

  if (isAuthenticated) {
    const destination = resolveRedirectPath(location.state?.from)
    return <Navigate to={destination} replace />
  }

  return children ?? <Outlet />
}
