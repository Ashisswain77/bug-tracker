import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import CreateProjectModal from '@/components/CreateProjectModal.jsx'
import ProjectCard, { ProjectCardSkeleton } from '@/components/ProjectCard.jsx'
import { useDebouncedValue } from '@/hooks/useDebouncedValue.js'
import { useProjects } from '@/hooks/useProjects.js'
import { parseProjectApiError } from '@/services/project.service.js'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const PAGE_LIMIT = 9
const SKELETON_COUNT = 6

export default function ProjectsPage({ onCreateProject }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialSearch = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || ''
  const rawPage = Number(searchParams.get('page'))
  const currentPage = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1

  const [searchInput, setSearchInput] = useState(initialSearch)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(searchInput, 250)

  const { data, isLoading, isFetching, isError, error, refetch } = useProjects({
    page: currentPage,
    limit: PAGE_LIMIT,
    search: debouncedSearch,
    status: statusFilter,
  })

  const projects = data?.data?.projects ?? []
  const pagination = data?.data?.pagination ?? {
    total: 0,
    page: currentPage,
    limit: PAGE_LIMIT,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  }

  const hasActiveFilters = Boolean(debouncedSearch.trim() || statusFilter)

  const updateUrlParams = (updates) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '' || (key === 'page' && val === 1)) {
        next.delete(key)
      } else {
        next.set(key, String(val))
      }
    })
    setSearchParams(next, { replace: true })
  }

  const handleSearchChange = (event) => {
    const value = event.target.value
    setSearchInput(value)
    updateUrlParams({ search: value.trim(), page: 1 })
  }

  const handleClearSearch = () => {
    setSearchInput('')
    updateUrlParams({ search: '', page: 1 })
  }

  const handleStatusChange = (nextStatus) => {
    updateUrlParams({ status: nextStatus, page: 1 })
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || (pagination.totalPages > 0 && nextPage > pagination.totalPages)) {
      return
    }
    updateUrlParams({ page: nextPage })
  }

  const handleCreateClick = () => {
    setIsCreateModalOpen(true)
    if (typeof onCreateProject === 'function') {
      onCreateProject()
    }
  }

  const apiError = isError ? parseProjectApiError(error, 'Failed to load projects.') : null
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
              My Projects
            </h1>
            {!isLoading && !isError && (
              <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                {pagination.total}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Manage and track issues across your engineering workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Search & Status filter bar */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="search"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search by project name or key…"
            aria-label="Search projects by name or key"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 py-2 pr-8 pl-9 text-xs text-zinc-100 placeholder-zinc-500 transition outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div
          role="group"
          aria-label="Filter projects by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          {STATUS_FILTERS.map((item) => {
            const active = statusFilter === item.value
            return (
              <button
                key={item.value || 'all'}
                type="button"
                onClick={() => handleStatusChange(item.value)}
                aria-pressed={active}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                    : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                }`}
              >
                {item.label}
              </button>
            )
          })}

          {isFetching && !isLoading && (
            <Loader2
              aria-label="Refreshing projects"
              className="ml-1.5 h-3.5 w-3.5 animate-spin text-indigo-400"
            />
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="mt-6 flex-1">
        {isLoading ? (
          <div
            role="status"
            aria-label="Loading projects"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <ProjectCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/5 px-6 py-14 text-center"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
              <CircleAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-zinc-100">Unable to load projects</h2>
            <p className="mt-1 max-w-md text-xs text-zinc-400">{apiError?.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Try again</span>
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-indigo-400">
              <FolderKanban className="h-6 w-6" aria-hidden="true" />
            </div>
            {hasActiveFilters ? (
              <>
                <h2 className="text-base font-semibold text-zinc-100">No matching projects</h2>
                <p className="mt-1 max-w-md text-xs text-zinc-400">
                  No projects matched your current search or status filter. Try adjusting your
                  filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear filters</span>
                </button>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-zinc-100">No projects yet</h2>
                <p className="mt-1 max-w-md text-xs text-zinc-400">
                  Get started by creating your first project to track issues and collaborate with
                  your team.
                </p>
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-400"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Create Project</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {!isLoading && !isError && pagination.total > 0 && (
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-zinc-800/80 pt-5 text-xs text-zinc-400 sm:flex-row">
          <p>
            Showing <span className="font-medium text-zinc-200">{rangeStart}</span>–
            <span className="font-medium text-zinc-200">{rangeEnd}</span> of{' '}
            <span className="font-medium text-zinc-200">{pagination.total}</span> projects
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage || isFetching}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Previous</span>
            </button>

            <span className="px-2 text-zinc-400">
              Page <span className="font-medium text-zinc-200">{pagination.page}</span> of{' '}
              <span className="font-medium text-zinc-200">{pagination.totalPages}</span>
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage || isFetching}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </section>
  )
}
