import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowRight,
  Bug,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 50
const EMAIL_MAX_LENGTH = 254
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_BYTES = 72
const encoder = new TextEncoder()

function validateRegisterForm({ name, email, password, confirmPassword }) {
  const errors = {}
  const cleanName = name.trim().replace(/\s+/g, ' ')
  const cleanEmail = email.trim().toLowerCase()

  if (!cleanName) {
    errors.name = 'Name is required'
  } else if (cleanName.length < NAME_MIN_LENGTH) {
    errors.name = `Name must be at least ${NAME_MIN_LENGTH} characters`
  } else if (cleanName.length > NAME_MAX_LENGTH) {
    errors.name = `Name cannot exceed ${NAME_MAX_LENGTH} characters`
  }

  if (!cleanEmail) {
    errors.email = 'Email is required'
  } else if (cleanEmail.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Please provide a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  } else if (encoder.encode(password).length > PASSWORD_MAX_BYTES) {
    errors.password = `Password cannot exceed ${PASSWORD_MAX_BYTES} bytes`
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    values: { name: cleanName, email: cleanEmail, password },
  }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (_response, variables) => {
      navigate('/login', {
        replace: true,
        state: {
          from: location.state?.from,
          registeredEmail: variables.email,
          message: 'Account created successfully. Please sign in.',
        },
      })
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
          : 'Unable to create account. Please try again.')
      setFormError(message)
    },
  })

  const isSubmitting = registerMutation.isPending

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
    if ((name === 'password' || name === 'confirmPassword') && fieldErrors.confirmPassword) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.confirmPassword
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

    const { isValid, errors, values } = validateRegisterForm(formData)
    if (!isValid) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    registerMutation.mutate(values)
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
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Start tracking and resolving issues with your team.
            </p>
          </div>

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
            {/* Name */}
            <div>
              <label
                htmlFor="register-name"
                className="mb-1.5 block text-xs font-medium text-zinc-300"
              >
                Full name
              </label>
              <div className="relative">
                <User
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
                />
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
                  className={`w-full rounded-lg border bg-zinc-950/90 py-2.5 pr-3.5 pl-9 text-sm text-zinc-100 placeholder-zinc-500 transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.name
                      ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                      : 'border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p id="register-name-error" className="mt-1.5 text-xs text-red-400">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
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
                  id="register-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                  className={`w-full rounded-lg border bg-zinc-950/90 py-2.5 pr-3.5 pl-9 text-sm text-zinc-100 placeholder-zinc-500 transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.email
                      ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                      : 'border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p id="register-email-error" className="mt-1.5 text-xs text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="register-password"
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
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
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
                <p id="register-password-error" className="mt-1.5 text-xs text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="register-confirm-password"
                className="mb-1.5 block text-xs font-medium text-zinc-300"
              >
                Confirm password
              </label>
              <div className="relative">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
                />
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={
                    fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined
                  }
                  className={`w-full rounded-lg border bg-zinc-950/90 py-2.5 pr-10 pl-9 text-sm text-zinc-100 placeholder-zinc-500 transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    fieldErrors.confirmPassword
                      ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                      : 'border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  aria-label={
                    showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                  }
                  aria-pressed={showConfirmPassword}
                  className="absolute top-1/2 right-2.5 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800/80 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:pointer-events-none"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p id="register-confirm-password-error" className="mt-1.5 text-xs text-red-400">
                  {fieldErrors.confirmPassword}
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
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Footer link to login */}
          <div className="mt-6 border-t border-zinc-800/80 pt-5 text-center text-xs text-zinc-400">
            Already have an account?{' '}
            <Link
              to="/login"
              state={location.state?.from ? { from: location.state.from } : undefined}
              className="font-medium text-indigo-400 underline-offset-4 transition hover:text-indigo-300 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

