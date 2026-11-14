import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowRight,
  Bug,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import { resolveRedirectPath } from '@/utils/navigation.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX_LENGTH = 254
const PASSWORD_MAX_BYTES = 72
const encoder = new TextEncoder()

function validateLoginForm({ email, password }) {
  const errors = {}
  const cleanEmail = email.trim().toLowerCase()

  if (!cleanEmail) {
    errors.email = 'Email is required'
  } else if (cleanEmail.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Please provide a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else if (encoder.encode(password).length > PASSWORD_MAX_BYTES) {
    errors.password = `Password cannot exceed ${PASSWORD_MAX_BYTES} bytes`
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    values: { email: cleanEmail, password },
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    email: location.state?.registeredEmail || '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [infoMessage, setInfoMessage] = useState(location.state?.message || '')
  const [showPassword, setShowPassword] = useState(false)

  const redirectTo = resolveRedirectPath(location.state?.from)

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate(redirectTo, { replace: true })
    },
    onError: (err) => {
      const apiData = err?.response?.data
      if (apiData?.details && typeof apiData.details === 'object') {
        setFieldErrors((prev) => ({ ...prev, ...apiData.details }))
      }
      const message =
        apiData?.message ||
        (err?.code === 'ERR_NETWORK'
          ? 'Unable to reach the server. Check your connection and try again.'
          : 'Unable to sign in. Please try again.')
      setFormError(message)
    },
  })

  const isSubmitting = loginMutation.isPending

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
    if (formError) {
      setFormError('')
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setFormError('')
    setInfoMessage('')

    const { isValid, errors, values } = validateLoginForm(formData)
    if (!isValid) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    loginMutation.mutate(values)
  }

  return (
    <section className="relative flex w-full flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      {/* Subtle Linear-inspired ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_50%_50%_at_50%_0%,rgba(99,102,241,0.12),transparent)]"
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-2xl shadow-black/50 backdrop-blur-sm sm:p-8">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-indigo-400 shadow-inner">
              <Bug className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
              Sign in to Bug Tracker
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* Registration redirect notice */}
          {infoMessage && !formError && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
            >
              <CircleCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Top-level error alert */}
          {formError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-xs font-medium text-zinc-300"
              >
                Email address
              </label>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
                />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  className={`w-full rounded-lg border bg-zinc-950/90 py-2.5 pr-3.5 pl-9 text-sm text-zinc-100 placeholder-zinc-500 transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.email
                      ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                      : 'border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p id="login-email-error" className="mt-1.5 text-xs text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-medium text-zinc-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
                />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                  className={`w-full rounded-lg border bg-zinc-950/90 py-2.5 pr-10 pl-9 text-sm text-zinc-100 placeholder-zinc-500 transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.password
                      ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                      : 'border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-2.5 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800/80 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:pointer-events-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="login-password-error" className="mt-1.5 text-xs text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Footer link to registration */}
          <div className="mt-6 border-t border-zinc-800/80 pt-5 text-center text-xs text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              state={location.state?.from ? { from: location.state.from } : undefined}
              className="font-medium text-indigo-400 underline-offset-4 transition hover:text-indigo-300 hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

