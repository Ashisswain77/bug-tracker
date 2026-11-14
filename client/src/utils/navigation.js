export function resolveRedirectPath(from) {
  if (!from || typeof from.pathname !== 'string') return '/'
  if (from.pathname === '/login' || from.pathname === '/register') return '/'
  return `${from.pathname}${from.search || ''}${from.hash || ''}`
}

