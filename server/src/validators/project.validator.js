import { PROJECT_ROLES, PROJECT_RULES, PROJECT_STATUSES } from '../models/Project.js';
import { EMAIL_REGEX, USER_RULES } from '../utils/validation.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;
// Strict 24-hex-char check. (mongoose.isValidObjectId also accepts any
// 12-character string, which is not a meaningful project ID.)
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const validateName = (name) => {
  const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (typeof name !== 'string' || !cleanName) {
    return { error: 'Project name is required', value: '' };
  }
  if (cleanName.length < PROJECT_RULES.NAME_MIN) {
    return { error: `Project name must be at least ${PROJECT_RULES.NAME_MIN} characters`, value: '' };
  }
  if (cleanName.length > PROJECT_RULES.NAME_MAX) {
    return { error: `Project name cannot exceed ${PROJECT_RULES.NAME_MAX} characters`, value: '' };
  }
  return { error: null, value: cleanName };
};

const validateDescription = (description) => {
  if (typeof description !== 'string') {
    return { error: 'Description must be a string', value: '' };
  }
  const cleanDescription = description.trim();
  if (cleanDescription.length > PROJECT_RULES.DESCRIPTION_MAX) {
    return {
      error: `Description cannot exceed ${PROJECT_RULES.DESCRIPTION_MAX} characters`,
      value: '',
    };
  }
  return { error: null, value: cleanDescription };
};

const validateStatusValue = (status) => {
  if (typeof status !== 'string') {
    return { error: `Status must be one of: ${PROJECT_STATUSES.join(', ')}`, value: '' };
  }
  const normalized = status.trim().toLowerCase();
  if (!PROJECT_STATUSES.includes(normalized)) {
    return { error: `Status must be one of: ${PROJECT_STATUSES.join(', ')}`, value: '' };
  }
  return { error: null, value: normalized };
};

const validateRoleValue = (role) => {
  if (typeof role !== 'string') {
    return { error: `Role must be one of: ${PROJECT_ROLES.join(', ')}`, value: '' };
  }
  const normalized = role.trim().toLowerCase();
  if (!PROJECT_ROLES.includes(normalized)) {
    return { error: `Role must be one of: ${PROJECT_ROLES.join(', ')}`, value: '' };
  }
  return { error: null, value: normalized };
};

/**
 * Validates the `:projectId` route parameter as a MongoDB ObjectId.
 * @returns {{ errors: Record<string, string> | null, value: { projectId: string } }}
 */
export const validateProjectIdParam = (params = {}) => {
  const { projectId } = params;
  if (typeof projectId !== 'string' || !OBJECT_ID_REGEX.test(projectId)) {
    return { errors: { projectId: 'Invalid project ID' }, value: { projectId: '' } };
  }
  return { errors: null, value: { projectId: projectId.toLowerCase() } };
};

/**
 * Validates `:projectId` and `:userId` route parameters as strict 24-hex ObjectIds.
 * @returns {{ errors: Record<string, string> | null, value: { projectId: string, userId: string } }}
 */
export const validateProjectMemberParams = (params = {}) => {
  const errors = {};
  const { projectId, userId } = params;

  const cleanProjectId =
    typeof projectId === 'string' && OBJECT_ID_REGEX.test(projectId)
      ? projectId.toLowerCase()
      : '';
  if (!cleanProjectId) {
    errors.projectId = 'Invalid project ID';
  }

  const cleanUserId =
    typeof userId === 'string' && OBJECT_ID_REGEX.test(userId) ? userId.toLowerCase() : '';
  if (!cleanUserId) {
    errors.userId = 'Invalid user ID';
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    value: { projectId: cleanProjectId, userId: cleanUserId },
  };
};

/**
 * Validates and sanitizes the project creation payload.
 * Strictly whitelists `{ name, description, key }` so client-supplied `owner`,
 * `members`, `role`, `status`, or `_id` fields are ignored.
 *
 * @returns {{ errors: Record<string, string> | null, value: { name: string, description: string, key: string } }}
 */
export const validateCreateProject = (body = {}) => {
  const errors = {};
  const { name, description, key } = body;

  // name
  const nameResult = validateName(name);
  if (nameResult.error) errors.name = nameResult.error;

  // description (optional)
  let cleanDescription = '';
  if (description !== undefined && description !== null) {
    const descResult = validateDescription(description);
    if (descResult.error) errors.description = descResult.error;
    else cleanDescription = descResult.value;
  }

  // key
  const cleanKey = typeof key === 'string' ? key.trim().toUpperCase() : '';
  if (typeof key !== 'string' || !cleanKey) {
    errors.key = 'Project key is required';
  } else if (!PROJECT_RULES.KEY_REGEX.test(cleanKey)) {
    errors.key =
      'Project key must be 2–10 characters, start with a letter, and contain only letters and numbers';
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    value: {
      name: nameResult.value,
      description: cleanDescription,
      key: cleanKey,
    },
  };
};

/**
 * Validates and sanitizes partial updates for `PATCH /api/v1/projects/:projectId`.
 * Strictly whitelists `{ name, description, status }` and rejects empty updates
 * (including payloads containing only protected or unknown fields).
 *
 * @returns {{ errors: Record<string, string> | null, value: { name?: string, description?: string, status?: string } }}
 */
export const validateUpdateProject = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Request body must be a JSON object' }, value: {} };
  }

  const errors = {};
  const value = {};

  if (body.name !== undefined) {
    const nameResult = validateName(body.name);
    if (nameResult.error) errors.name = nameResult.error;
    else value.name = nameResult.value;
  }

  if (body.description !== undefined) {
    const descResult = validateDescription(body.description);
    if (descResult.error) errors.description = descResult.error;
    else value.description = descResult.value;
  }

  if (body.status !== undefined) {
    const statusResult = validateStatusValue(body.status);
    if (statusResult.error) errors.status = statusResult.error;
    else value.status = statusResult.value;
  }

  if (Object.keys(errors).length === 0 && Object.keys(value).length === 0) {
    errors.body = 'At least one updatable field (name, description, status) is required';
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    value,
  };
};

/**
 * Validates and sanitizes the add-member payload for
 * `POST /api/v1/projects/:projectId/members`.
 * Strictly whitelists `{ email, role }` (`role` defaults to `'developer'`).
 * Rejects attempts to supply raw user IDs or extra fields instead of `email`.
 *
 * @returns {{ errors: Record<string, string> | null, value: { email: string, role: string } }}
 */
export const validateAddMember = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Request body must be a JSON object' }, value: {} };
  }

  const errors = {};
  const { email, role } = body;

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (typeof email !== 'string' || !cleanEmail) {
    errors.email = 'Email is required';
  } else if (cleanEmail.length > USER_RULES.EMAIL_MAX || !EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Please provide a valid email address';
  }

  let cleanRole = 'developer';
  if (role !== undefined) {
    const roleResult = validateRoleValue(role);
    if (roleResult.error) errors.role = roleResult.error;
    else cleanRole = roleResult.value;
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    value: {
      email: cleanEmail,
      role: cleanRole,
    },
  };
};

/**
 * Validates and sanitizes the role-change payload for
 * `PATCH /api/v1/projects/:projectId/members/:userId/role`.
 * Strictly whitelists `{ role }` against `PROJECT_ROLES`.
 *
 * @returns {{ errors: Record<string, string> | null, value: { role: string } }}
 */
export const validateUpdateMemberRole = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Request body must be a JSON object' }, value: {} };
  }

  const errors = {};
  let cleanRole = '';

  if (body.role === undefined) {
    errors.role = 'Role is required';
  } else {
    const roleResult = validateRoleValue(body.role);
    if (roleResult.error) errors.role = roleResult.error;
    else cleanRole = roleResult.value;
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    value: { role: cleanRole },
  };
};

/**
 * Validates and normalizes query parameters for `GET /api/v1/projects`.
 * Supports optional `status`, `search`, `page`, and `limit`.
 */
export const validateListProjectsQuery = (query = {}) => {
  const errors = {};
  const { status, search, page, limit } = query;

  // status (optional)
  let cleanStatus;
  if (status !== undefined && status !== '') {
    const statusResult = validateStatusValue(status);
    if (statusResult.error) errors.status = statusResult.error;
    else cleanStatus = statusResult.value;
  }

  // search (optional)
  let cleanSearch = '';
  if (search !== undefined && search !== '') {
    if (typeof search !== 'string') {
      errors.search = 'Search query must be a string';
    } else {
      cleanSearch = search.trim();
      if (cleanSearch.length > MAX_SEARCH_LENGTH) {
        errors.search = `Search query cannot exceed ${MAX_SEARCH_LENGTH} characters`;
      }
    }
  }

  // page (optional, defaults to 1)
  let cleanPage = DEFAULT_PAGE;
  if (page !== undefined && page !== '') {
    const parsed = typeof page === 'string' && /^\d+$/.test(page.trim()) ? Number(page.trim()) : NaN;
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.page = 'Page must be a positive integer';
    } else {
      cleanPage = parsed;
    }
  }

  // limit (optional, defaults to 10, max 100)
  let cleanLimit = DEFAULT_LIMIT;
  if (limit !== undefined && limit !== '') {
    const parsed =
      typeof limit === 'string' && /^\d+$/.test(limit.trim()) ? Number(limit.trim()) : NaN;
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      errors.limit = `Limit must be an integer between 1 and ${MAX_LIMIT}`;
    } else {
      cleanLimit = parsed;
    }
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    value: {
      status: cleanStatus,
      search: cleanSearch,
      page: cleanPage,
      limit: cleanLimit,
    },
  };
};
