export const PROJECT_NAME_MIN = 2
export const PROJECT_NAME_MAX = 100
export const PROJECT_DESCRIPTION_MAX = 2000
export const PROJECT_KEY_MIN = 2
export const PROJECT_KEY_MAX = 10
export const PROJECT_KEY_REGEX = /^[A-Z][A-Z0-9]{1,9}$/

/**
 * Normalizes raw user input for a project key: uppercase alphanumeric only,
 * capped at 10 characters.
 */
export function sanitizeProjectKeyInput(raw = '') {
  if (typeof raw !== 'string') return ''
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, PROJECT_KEY_MAX)
}

/**
 * Automatically suggests a 2–10 character uppercase project key starting with
 * a letter from a project name (e.g. "Bug Tracker" -> "BT", "Engine" -> "ENG").
 */
export function suggestProjectKey(name = '') {
  if (typeof name !== 'string') return ''

  // Strip leading non-letters so the suggested key always starts with [A-Z]
  const cleaned = name
    .toUpperCase()
    .replace(/^[^A-Z]+/, '')
    .trim()
  if (!cleaned) return ''

  const words = cleaned.match(/[A-Z0-9]+/g) || []
  if (words.length === 0) return ''

  if (words.length === 1) {
    return words[0].slice(0, Math.min(4, PROJECT_KEY_MAX))
  }

  const acronym = words
    .map((word) => word[0])
    .join('')
    .slice(0, 6)

  if (acronym.length >= PROJECT_KEY_MIN) {
    return acronym
  }

  return words.join('').slice(0, Math.min(4, PROJECT_KEY_MAX))
}

/**
 * Validates and normalizes the Create Project form fields according to backend rules:
 * - name: 2–100 characters (trimmed, internal whitespace collapsed)
 * - key: 2–10 uppercase letters/digits starting with a letter
 * - description: optional, max 2000 characters
 */
export function validateCreateProjectForm({ name = '', key = '', description = '' } = {}) {
  const errors = {}
  const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
  const cleanKey = typeof key === 'string' ? key.trim().toUpperCase() : ''
  const cleanDescription = typeof description === 'string' ? description.trim() : ''

  if (!cleanName) {
    errors.name = 'Project name is required'
  } else if (cleanName.length < PROJECT_NAME_MIN) {
    errors.name = `Project name must be at least ${PROJECT_NAME_MIN} characters`
  } else if (cleanName.length > PROJECT_NAME_MAX) {
    errors.name = `Project name cannot exceed ${PROJECT_NAME_MAX} characters`
  }

  if (!cleanKey) {
    errors.key = 'Project key is required'
  } else if (!PROJECT_KEY_REGEX.test(cleanKey)) {
    errors.key =
      'Project key must be 2–10 characters, start with a letter, and contain only letters and numbers'
  }

  if (cleanDescription.length > PROJECT_DESCRIPTION_MAX) {
    errors.description = `Description cannot exceed ${PROJECT_DESCRIPTION_MAX} characters`
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    values: {
      name: cleanName,
      key: cleanKey,
      description: cleanDescription,
    },
  }
}
