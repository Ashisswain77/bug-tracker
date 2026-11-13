import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-indigo-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <Link to="/" className="mt-6 text-sm text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline">
        Back to home
      </Link>
    </section>
  )
}

