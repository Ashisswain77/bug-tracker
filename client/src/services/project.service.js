import api from './api.js'

const encodeId = (id, label) => {
  const clean = typeof id === 'string' ? id.trim() : String(id ?? '').trim()
  if (!clean) {
    throw new Error(`${label} is required`)
  }
  return encodeURIComponent(clean)
}

/**
 * Extracts a normalized `{ status, message, code, details }` object from an
 * Axios or service error for consistent UI and hook error handling.
 */
export const parseProjectApiError = (error, fallbackMessage = 'Request failed. Please try again.') => {
  const apiData = error?.response?.data
  const message =
    apiData?.message ||
    (error?.code === 'ERR_NETWORK'
      ? 'Unable to reach the server. Check your connection and try again.'
      : error?.message || fallbackMessage)

  return {
    status: error?.response?.status ?? null,
    code: apiData?.code ?? error?.code ?? null,
    message,
    details: apiData?.details && typeof apiData.details === 'object' ? apiData.details : {},
  }
}

/**
 * Builds clean query parameters for `GET /api/v1/projects`, omitting empty or
 * undefined filter values.
 */
export const buildProjectsQueryParams = ({ page, limit, search, status } = {}) => {
  const params = {}

  if (page !== undefined && page !== null && page !== '') {
    params.page = page
  }
  if (limit !== undefined && limit !== null && limit !== '') {
    params.limit = limit
  }
  if (typeof search === 'string' && search.trim() !== '') {
    params.search = search.trim()
  }
  if (typeof status === 'string' && status.trim() !== '') {
    params.status = status.trim().toLowerCase()
  }

  return params
}

/**
 * Lists projects belonging to the authenticated user (`GET /api/v1/projects`).
 * Supports optional `{ page, limit, search, status }` filters and `{ signal }`.
 */
export const getProjects = async (filters = {}, options = {}) => {
  const { signal, ...queryFilters } = filters ?? {}
  const params = buildProjectsQueryParams(queryFilters)
  const requestSignal = options?.signal ?? signal

  const { data } = await api.get('/projects', {
    params,
    ...(requestSignal ? { signal: requestSignal } : {}),
  })
  return data
}

export const listProjects = getProjects

/**
 * Creates a new project (`POST /api/v1/projects`).
 */
export const createProject = async ({ name, description, key } = {}) => {
  const payload = {
    name,
    key,
    ...(description !== undefined ? { description } : {}),
  }
  const { data } = await api.post('/projects', payload)
  return data
}

/**
 * Retrieves a single project by ID (`GET /api/v1/projects/:projectId`).
 */
export const getProjectById = async (projectId, options = {}) => {
  const id = encodeId(projectId, 'Project ID')
  const { data } = await api.get(`/projects/${id}`, {
    ...(options?.signal ? { signal: options.signal } : {}),
  })
  return data
}

export const getProject = getProjectById

/**
 * Updates allowed project details (`PATCH /api/v1/projects/:projectId`).
 */
export const updateProject = async (projectId, updates = {}) => {
  const id = encodeId(projectId, 'Project ID')
  const payload = {}

  if (updates && typeof updates === 'object') {
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.status !== undefined) payload.status = updates.status
  }

  const { data } = await api.patch(`/projects/${id}`, payload)
  return data
}

/**
 * Permanently deletes a project (`DELETE /api/v1/projects/:projectId`).
 */
export const deleteProject = async (projectId) => {
  const id = encodeId(projectId, 'Project ID')
  const { data } = await api.delete(`/projects/${id}`)
  return data
}

/**
 * Adds a member to a project by email (`POST /api/v1/projects/:projectId/members`).
 */
export const addProjectMember = async (projectId, { email, role } = {}) => {
  const id = encodeId(projectId, 'Project ID')
  const payload = {
    email,
    ...(role !== undefined ? { role } : {}),
  }
  const { data } = await api.post(`/projects/${id}/members`, payload)
  return data
}

/**
 * Removes a member from a project (`DELETE /api/v1/projects/:projectId/members/:userId`).
 */
export const removeProjectMember = async (projectId, userId) => {
  const id = encodeId(projectId, 'Project ID')
  const memberId = encodeId(userId, 'User ID')
  const { data } = await api.delete(`/projects/${id}/members/${memberId}`)
  return data
}

/**
 * Updates a project member's role (`PATCH /api/v1/projects/:projectId/members/:userId/role`).
 * Accepts either a role string or `{ role }`.
 */
export const updateProjectMemberRole = async (projectId, userId, roleOrPayload) => {
  const id = encodeId(projectId, 'Project ID')
  const memberId = encodeId(userId, 'User ID')
  const role =
    roleOrPayload && typeof roleOrPayload === 'object' ? roleOrPayload.role : roleOrPayload

  const { data } = await api.patch(`/projects/${id}/members/${memberId}/role`, { role })
  return data
}
