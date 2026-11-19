import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { buildProjectsQueryParams, getProjects } from '@/services/project.service.js'

export const PROJECTS_QUERY_KEY = 'projects'

export function useProjects(filters = {}) {
  const queryParams = buildProjectsQueryParams(filters)

  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, queryParams],
    queryFn: ({ signal }) => getProjects(queryParams, { signal }),
    placeholderData: keepPreviousData,
  })
}
