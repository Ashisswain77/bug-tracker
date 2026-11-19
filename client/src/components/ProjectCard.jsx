import { Link } from 'react-router-dom'
import { ArrowUpRight, Shield, User, Users } from 'lucide-react'

const STATUS_META = {
  active: {
    label: 'Active',
    dotClass: 'bg-emerald-400',
    badgeClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  on_hold: {
    label: 'On Hold',
    dotClass: 'bg-amber-400',
    badgeClass: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },
  completed: {
    label: 'Completed',
    dotClass: 'bg-sky-400',
    badgeClass: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  },
  archived: {
    label: 'Archived',
    dotClass: 'bg-zinc-500',
    badgeClass: 'border-zinc-700 bg-zinc-800/80 text-zinc-400',
  },
}

const ROLE_META = {
  admin: {
    label: 'Admin',
    badgeClass: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  },
  manager: {
    label: 'Manager',
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  },
  developer: {
    label: 'Developer',
    badgeClass: 'border-zinc-700 bg-zinc-800/80 text-zinc-300',
  },
  viewer: {
    label: 'Viewer',
    badgeClass: 'border-zinc-800 bg-zinc-900 text-zinc-400',
  },
}

export function ProjectCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-48 animate-pulse flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="h-5 w-14 rounded-md bg-zinc-800" />
          <div className="h-5 w-20 rounded-full bg-zinc-800" />
        </div>
        <div className="mt-3.5 h-5 w-3/5 rounded bg-zinc-800" />
        <div className="mt-2.5 space-y-1.5">
          <div className="h-3.5 w-full rounded bg-zinc-800/70" />
          <div className="h-3.5 w-4/5 rounded bg-zinc-800/70" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3.5">
        <div className="h-4 w-28 rounded bg-zinc-800" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 rounded bg-zinc-800" />
          <div className="h-4 w-12 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  )
}

export default function ProjectCard({ project }) {
  const statusMeta = STATUS_META[project?.status] || STATUS_META.active
  const roleKey = project?.userRole || 'viewer'
  const roleMeta = ROLE_META[roleKey] || ROLE_META.viewer
  const ownerName = project?.owner?.name || project?.owner?.email || 'Unknown owner'
  const memberCount = Array.isArray(project?.members) ? project.members.length : 1

  return (
    <Link
      to={`/projects/${project._id}`}
      className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-sm transition duration-150 hover:border-zinc-700 hover:bg-zinc-900/90 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
    >
      <div>
        {/* Top bar: Key badge + Status pill */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-indigo-300">
            {project.key}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusMeta.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} aria-hidden="true" />
            {statusMeta.label}
          </span>
        </div>

        {/* Project title */}
        <div className="mt-3 flex items-start justify-between gap-2">
          <h2 className="line-clamp-1 text-base font-semibold tracking-tight text-zinc-100 transition group-hover:text-white">
            {project.name}
          </h2>
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-400"
          />
        </div>

        {/* Project description */}
        <p className="mt-1.5 line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-zinc-400">
          {project.description ? (
            project.description
          ) : (
            <span className="italic text-zinc-500">No description provided</span>
          )}
        </p>
      </div>

      {/* Footer metadata: Owner, Role, and Member count */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/70 pt-3.5 text-xs text-zinc-400">
        <div className="flex min-w-0 items-center gap-1.5" title={`Owner: ${ownerName}`}>
          <User className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
          <span className="truncate">{ownerName}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${roleMeta.badgeClass}`}
            title={`Your role: ${roleMeta.label}`}
          >
            <Shield className="h-3 w-3" aria-hidden="true" />
            {roleMeta.label}
          </span>

          <span
            className="inline-flex items-center gap-1 text-zinc-400"
            title={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
          >
            <Users className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            <span>{memberCount}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
