import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CircleAlert,
  FolderKanban,
  Hash,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import { PROJECTS_QUERY_KEY } from '@/hooks/useProjects.js'
import { createProject, parseProjectApiError } from '@/services/project.service.js'
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_KEY_MAX,
  PROJECT_NAME_MAX,
  sanitizeProjectKeyInput,
  suggestProjectKey,
  validateCreateProjectForm,
} from '@/utils/projectValidation.js'

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'

export default function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const dialogRef = useRef(null)
  const nameInputRef = useRef(null)
  const previousFocusRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
  })
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (response) => {
      const createdProject = response?.data?.project
      if (createdProject?._id) {
        queryClient.setQueryData(['project', createdProject._id], response)
      }
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] })

      setFormData({ name: '', key: '', description: '' })
      setIsKeyManuallyEdited(false)
      setFieldErrors({})
      setFormError('')

      if (typeof onCreated === 'function') {
        onCreated(createdProject)
      }
      if (typeof onClose === 'function') {
        onClose()
      }
      if (createdProject?._id) {
        navigate(`/projects/${createdProject._id}`)
      }
    },
    onError: (err) => {
      const parsed = parseProjectApiError(err, 'Unable to create project. Please try again.')
      if (parsed.details && Object.keys(parsed.details).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...parsed.details }))
      }
      setFormError(parsed.message)
    },
  })

  const isSubmitting = createMutation.isPending

  // Manage focus restoration and body scroll lock when modal opens/closes
  useEffect(() => {
    if (!isOpen) return undefined

    previousFocusRef.current = document.activeElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = setTimeout(() => {
      nameInputRef.current?.focus()
    }, 0)

    return () => {
      clearTimeout(focusTimer)
      document.body.style.overflow = originalOverflow
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleRequestClose = () => {
    if (isSubmitting) return
    setFormData({ name: '', key: '', description: '' })
    setIsKeyManuallyEdited(false)
    setFieldErrors({})
    setFormError('')
    onClose?.()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      handleRequestClose()
      return
    }

    if (event.key === 'Tab' && dialogRef.current) {
      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      handleRequestClose()
    }
  }

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (formError) {
      setFormError('')
    }
  }

  const handleNameChange = (event) => {
    const nextName = event.target.value
    setFormData((prev) => ({
      ...prev,
      name: nextName,
      key: isKeyManuallyEdited ? prev.key : suggestProjectKey(nextName),
    }))
    clearFieldError('name')
    if (!isKeyManuallyEdited) {
      clearFieldError('key')
    }
  }

  const handleKeyChange = (event) => {
    const sanitized = sanitizeProjectKeyInput(event.target.value)
    setIsKeyManuallyEdited(Boolean(sanitized))
    setFormData((prev) => ({
      ...prev,
      key: sanitized,
    }))
    clearFieldError('key')
  }

  const handleResetSuggestedKey = () => {
    const suggested = suggestProjectKey(formData.name)
    setIsKeyManuallyEdited(false)
    setFormData((prev) => ({ ...prev, key: suggested }))
    clearFieldError('key')
  }

  const handleDescriptionChange = (event) => {
    const nextDescription = event.target.value
    setFormData((prev) => ({ ...prev, description: nextDescription }))
    clearFieldError('description')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setFormError('')
    const { isValid, errors, values } = validateCreateProjectForm(formData)
    if (!isValid) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    createMutation.mutate(values)
  }

  const previewKey = formData.key || suggestProjectKey(formData.name) || 'KEY'

  return (
    <div
      role="presentation"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        aria-describedby="create-project-subtitle"
        className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/70 sm:p-7"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-indigo-400">
              <FolderKanban className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="create-project-title"
                className="text-lg font-semibold tracking-tight text-zinc-100"
              >
                Create Project
              </h2>
              <p id="create-project-subtitle" className="mt-0.5 text-xs text-zinc-400">
                Set up a dedicated workspace for tracking issues and releases.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Top-level API error banner */}
        {formError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="mt-5 space-y-4">
          {/* Project Name */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="project-name" className="block text-xs font-medium text-zinc-300">
                Project name <span className="text-indigo-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                {formData.name.trim().length}/{PROJECT_NAME_MAX}
              </span>
            </div>
            <input
              ref={nameInputRef}
              id="project-name"
              name="name"
              type="text"
              autoComplete="off"
              maxLength={PROJECT_NAME_MAX}
              placeholder="e.g. Analytical Engine"
              value={formData.name}
              onChange={handleNameChange}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'project-name-error' : undefined}
              className={`w-full rounded-lg border bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                fieldErrors.name
                  ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                  : 'border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
            {fieldErrors.name && (
              <p id="project-name-error" className="mt-1.5 text-xs text-red-400">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Project Key */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="project-key" className="block text-xs font-medium text-zinc-300">
                Project key <span className="text-indigo-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                {isKeyManuallyEdited && formData.name.trim() && (
                  <button
                    type="button"
                    onClick={handleResetSuggestedKey}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 transition hover:text-indigo-300"
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    <span>Auto-suggest</span>
                  </button>
                )}
                <span className="text-[11px] text-zinc-500">
                  Issue prefix: <code className="font-mono text-zinc-300">{previewKey}-1</code>
                </span>
              </div>
            </div>
            <div className="relative">
              <Hash
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
              />
              <input
                id="project-key"
                name="key"
                type="text"
                autoComplete="off"
                maxLength={PROJECT_KEY_MAX}
                placeholder="AE"
                value={formData.key}
                onChange={handleKeyChange}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.key)}
                aria-describedby={fieldErrors.key ? 'project-key-error' : 'project-key-hint'}
                className={`w-full rounded-lg border bg-zinc-950/90 py-2.5 pr-3.5 pl-9 font-mono text-sm uppercase tracking-wider text-zinc-100 placeholder-zinc-500 transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  fieldErrors.key
                    ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                    : 'border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {fieldErrors.key ? (
              <p id="project-key-error" className="mt-1.5 text-xs text-red-400">
                {fieldErrors.key}
              </p>
            ) : (
              <p id="project-key-hint" className="mt-1.5 text-[11px] text-zinc-500">
                2–10 uppercase letters or numbers, starting with a letter. Cannot be changed later.
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="project-description"
                className="block text-xs font-medium text-zinc-300"
              >
                Description <span className="text-zinc-500">(optional)</span>
              </label>
              <span
                className={`text-[11px] ${
                  formData.description.trim().length > PROJECT_DESCRIPTION_MAX
                    ? 'text-red-400'
                    : 'text-zinc-500'
                }`}
              >
                {formData.description.trim().length}/{PROJECT_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="project-description"
              name="description"
              rows={3}
              placeholder="Briefly describe the goals, scope, or team owning this project…"
              value={formData.description}
              onChange={handleDescriptionChange}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? 'project-description-error' : undefined}
              className={`w-full resize-none rounded-lg border bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                fieldErrors.description
                  ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                  : 'border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
              }`}
            />
            {fieldErrors.description && (
              <p id="project-description-error" className="mt-1.5 text-xs text-red-400">
                {fieldErrors.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800/80 pt-4">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Creating project…</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
