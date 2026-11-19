import mongoose from 'mongoose';
import Project, { PROJECT_RULES } from '../models/Project.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const DUPLICATE_KEY = 11000;
const USER_PUBLIC_FIELDS = 'name email avatar';
const PROJECT_USER_POPULATE = [
  { path: 'owner', select: USER_PUBLIC_FIELDS },
  { path: 'members.user', select: USER_PUBLIC_FIELDS },
];
const PROJECT_MANAGEMENT_ROLES = new Set(['admin', 'manager']);
const MANAGER_REMOVABLE_ROLES = new Set(['developer', 'viewer']);

const hasManagementPermission = (project, userId) => {
  const isOwner = String(project.owner?._id ?? project.owner) === String(userId);
  const memberRole = project.getMemberRole(userId);
  return isOwner || PROJECT_MANAGEMENT_ROLES.has(memberRole);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatProjectForUser = (projectDoc, userId) => {
  const json = projectDoc.toJSON();
  const role =
    projectDoc.getMemberRole(userId) ||
    (String(projectDoc.owner?._id ?? projectDoc.owner) === String(userId) ? 'admin' : null);
  return {
    ...json,
    userRole: role,
  };
};

/**
 * Loads a project only when `userId` is its owner or a member.
 * Nonexistent and inaccessible projects both throw the identical 404 to
 * prevent project ID enumeration.
 */
const findMemberProject = async ({ projectId, userId, populate = false }) => {
  const query = Project.findOne({
    _id: projectId,
    $or: [{ owner: userId }, { 'members.user': userId }],
  });
  if (populate) {
    query.populate(PROJECT_USER_POPULATE);
  }
  const project = await query;

  if (!project) {
    throw new ApiError(404, 'Project not found', undefined, { code: 'PROJECT_NOT_FOUND' });
  }

  return project;
};

/**
 * Creates a new project owned by `ownerId`.
 * The Project model's pre-validate hook automatically adds the owner to
 * `members` with the `admin` role.
 *
 * @returns {Promise<object>} populated project as safe JSON
 */
export const createProject = async ({ name, description, key, ownerId }) => {
  if (await Project.exists({ key })) {
    throw new ApiError(409, 'A project with this key already exists', {
      key: 'Project key is already in use',
    });
  }

  let project;
  try {
    project = await Project.create({
      name,
      description,
      key,
      owner: ownerId,
    });
  } catch (err) {
    if (err?.code === DUPLICATE_KEY) {
      throw new ApiError(409, 'A project with this key already exists', {
        key: 'Project key is already in use',
      });
    }
    throw err;
  }

  await project.populate(PROJECT_USER_POPULATE);

  return formatProjectForUser(project, ownerId);
};

/**
 * Retrieves paginated projects where `userId` is either the owner or a member.
 * Supports optional status filter and case-insensitive name/key search.
 * Sorted by most recently updated (`updatedAt: -1, _id: -1`).
 */
export const listUserProjects = async ({
  userId,
  status,
  search = '',
  page = 1,
  limit = 10,
}) => {
  const conditions = [
    {
      $or: [{ owner: userId }, { 'members.user': userId }],
    },
  ];

  if (status) {
    conditions.push({ status });
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    conditions.push({
      $or: [{ name: regex }, { key: regex }],
    });
  }

  const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };
  const skip = (page - 1) * limit;

  const [projectDocs, total] = await Promise.all([
    Project.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate(PROJECT_USER_POPULATE),
    Project.countDocuments(filter),
  ]);

  const projects = projectDocs.map((doc) => formatProjectForUser(doc, userId));
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    projects,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1 && totalPages > 0,
    },
  };
};

/**
 * Retrieves a single project if `userId` is its owner or a member.
 * Access control is part of the query itself, so a project that doesn't exist
 * and one the user can't access produce the identical 404 — this prevents
 * discovering other teams' project IDs.
 *
 * @returns {Promise<object>} populated project with `userRole`
 */
export const getProjectForUser = async ({ projectId, userId }) => {
  const project = await findMemberProject({ projectId, userId, populate: true });
  return formatProjectForUser(project, userId);
};

/**
 * Updates allowed project details (`name`, `description`, `status`) if `userId`
 * is the owner or a member with the `admin` or `manager` role.
 * Nonexistent or inaccessible projects return 404; members without permission
 * (e.g. `developer`, `viewer`) return 403.
 *
 * @returns {Promise<object>} updated, populated project with `userRole`
 */
export const updateProjectForUser = async ({ projectId, userId, updates }) => {
  const project = await findMemberProject({ projectId, userId });

  if (!hasManagementPermission(project, userId)) {
    throw new ApiError(403, 'You do not have permission to update this project', undefined, {
      code: 'FORBIDDEN',
    });
  }

  if ('name' in updates) project.name = updates.name;
  if ('description' in updates) project.description = updates.description;
  if ('status' in updates) project.status = updates.status;

  await project.save();
  await project.populate(PROJECT_USER_POPULATE);

  return formatProjectForUser(project, userId);
};

/**
 * Permanently deletes a project when requested by its owner.
 * Nonexistent or non-member requests return 404; non-owner project members
 * (including `admin` and `manager`) return 403.
 *
 * Future work: once Issue, Comment, and Activity collections are introduced,
 * either cascade-delete all child records referencing this project inside a
 * MongoDB transaction or switch to soft deletion (`deletedAt` / `isDeleted`)
 * to prevent orphaned documents and preserve audit history.
 *
 * @returns {Promise<{ projectId: string }>}
 */
export const deleteProjectForUser = async ({ projectId, userId }) => {
  const project = await findMemberProject({ projectId, userId });

  const isOwner = String(project.owner?._id ?? project.owner) === String(userId);
  if (!isOwner) {
    throw new ApiError(403, 'Only the project owner can delete this project', undefined, {
      code: 'FORBIDDEN',
    });
  }

  // Scope deleteOne to both _id and owner; if a concurrent delete already removed
  // the document, treat the second call consistently as 404.
  const { deletedCount } = await Project.deleteOne({ _id: project._id, owner: userId });
  if (deletedCount === 0) {
    throw new ApiError(404, 'Project not found', undefined, { code: 'PROJECT_NOT_FOUND' });
  }

  return { projectId: String(project._id) };
};

/**
 * Adds an existing user (looked up by normalized email) as a project member.
 * Only the project owner or members with `admin`/`manager` roles may add members.
 * Uses an atomic conditional `findOneAndUpdate` so simultaneous requests cannot
 * create duplicate memberships or exceed `PROJECT_RULES.MEMBERS_MAX` (500).
 *
 * @returns {Promise<object>} updated, populated project with `userRole`
 */
export const addProjectMember = async ({ projectId, userId, email, role }) => {
  const project = await findMemberProject({ projectId, userId });

  if (!hasManagementPermission(project, userId)) {
    throw new ApiError(403, 'You do not have permission to add project members', undefined, {
      code: 'FORBIDDEN',
    });
  }

  const targetUser = await User.findOne({ email }).select('_id');
  if (!targetUser) {
    throw new ApiError(404, 'User not found', undefined, { code: 'USER_NOT_FOUND' });
  }

  const updated = await Project.findOneAndUpdate(
    {
      $and: [
        { _id: project._id },
        {
          $or: [
            { owner: userId },
            { members: { $elemMatch: { user: userId, role: { $in: [...PROJECT_MANAGEMENT_ROLES] } } } },
          ],
        },
        { owner: { $ne: targetUser._id } },
        { 'members.user': { $ne: targetUser._id } },
        { [`members.${PROJECT_RULES.MEMBERS_MAX - 1}`]: { $exists: false } },
      ],
    },
    {
      $push: {
        members: {
          user: targetUser._id,
          role,
          addedAt: new Date(),
        },
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  ).populate(PROJECT_USER_POPULATE);

  if (updated) {
    return formatProjectForUser(updated, userId);
  }

  // Atomic update did not match — reload to report the exact conflict/state.
  const latest = await findMemberProject({ projectId, userId });
  if (!hasManagementPermission(latest, userId)) {
    throw new ApiError(403, 'You do not have permission to add project members', undefined, {
      code: 'FORBIDDEN',
    });
  }

  const isTargetOwner = String(latest.owner?._id ?? latest.owner) === String(targetUser._id);
  if (isTargetOwner || latest.getMemberRole(targetUser._id)) {
    throw new ApiError(409, 'User is already a member of this project', {
      email: 'User is already a member of this project',
    });
  }

  if (latest.members.length >= PROJECT_RULES.MEMBERS_MAX) {
    throw new ApiError(
      400,
      `A project cannot have more than ${PROJECT_RULES.MEMBERS_MAX} members`,
      { members: `A project cannot have more than ${PROJECT_RULES.MEMBERS_MAX} members` }
    );
  }

  throw new ApiError(409, 'Could not add member to project');
};

const assertCanRemoveMember = (project, actorId, targetUserId) => {
  const ownerId = String(project.owner?._id ?? project.owner);
  if (ownerId === String(targetUserId)) {
    throw new ApiError(403, 'Project owner cannot be removed from the project', undefined, {
      code: 'FORBIDDEN',
    });
  }

  const isOwner = ownerId === String(actorId);
  const isSelf = String(actorId) === String(targetUserId);
  const actorRole = project.getMemberRole(actorId);

  if (!isSelf && !isOwner && !PROJECT_MANAGEMENT_ROLES.has(actorRole)) {
    throw new ApiError(403, 'You do not have permission to remove project members', undefined, {
      code: 'FORBIDDEN',
    });
  }

  const targetRole = project.getMemberRole(targetUserId);
  if (!targetRole) {
    throw new ApiError(404, 'Member not found in this project', undefined, {
      code: 'MEMBER_NOT_FOUND',
    });
  }

  if (!isSelf && !isOwner && actorRole === 'manager' && !MANAGER_REMOVABLE_ROLES.has(targetRole)) {
    throw new ApiError(403, 'Managers can only remove developers or viewers', undefined, {
      code: 'FORBIDDEN',
    });
  }

  return { isOwner, isSelf, actorRole };
};

/**
 * Removes a member from a project using an atomic conditional `$pull`.
 * - Project owner cannot be removed (including via self-removal).
 * - Owner and `admin` members may remove any non-owner member.
 * - `manager` members may remove `developer` and `viewer` members only.
 * - Any non-owner member may remove themselves (leave project).
 *
 * Authorization and owner protection are re-enforced inside the MongoDB query
 * filter so concurrent permission or role changes cannot bypass access control.
 *
 * @returns {Promise<object>} updated, populated project with `userRole`
 */
export const removeProjectMember = async ({ projectId, actorId, targetUserId }) => {
  const project = await findMemberProject({ projectId, userId: actorId });
  const { isOwner, isSelf, actorRole } = assertCanRemoveMember(project, actorId, targetUserId);

  const conditions = [{ _id: project._id }, { owner: { $ne: targetUserId } }];

  if (isSelf) {
    conditions.push({ 'members.user': actorId });
  } else if (isOwner) {
    conditions.push({ owner: actorId }, { 'members.user': targetUserId });
  } else if (actorRole === 'admin') {
    conditions.push(
      {
        $or: [
          { owner: actorId },
          { members: { $elemMatch: { user: actorId, role: 'admin' } } },
        ],
      },
      { 'members.user': targetUserId }
    );
  } else {
    // Manager: enforce both actor authority and removable target role at update time.
    conditions.push(
      {
        $or: [
          { owner: actorId },
          {
            members: {
              $elemMatch: { user: actorId, role: { $in: [...PROJECT_MANAGEMENT_ROLES] } },
            },
          },
        ],
      },
      {
        members: {
          $elemMatch: { user: targetUserId, role: { $in: [...MANAGER_REMOVABLE_ROLES] } },
        },
      }
    );
  }

  const updated = await Project.findOneAndUpdate(
    { $and: conditions },
    { $pull: { members: { user: targetUserId } } },
    { returnDocument: 'after' }
  ).populate(PROJECT_USER_POPULATE);

  if (updated) {
    return formatProjectForUser(updated, actorId);
  }

  // Atomic update did not match — reload to surface the exact 404 or 403 reason.
  const latest = await findMemberProject({ projectId, userId: actorId });
  assertCanRemoveMember(latest, actorId, targetUserId);

  throw new ApiError(409, 'Could not remove member from project');
};

const assertCanUpdateMemberRole = (project, actorId, targetUserId, newRole) => {
  const ownerId = String(project.owner?._id ?? project.owner);
  if (ownerId === String(targetUserId)) {
    throw new ApiError(403, 'Project owner role cannot be changed', undefined, {
      code: 'FORBIDDEN',
    });
  }

  const isOwner = ownerId === String(actorId);
  const actorRole = project.getMemberRole(actorId);

  if (!isOwner && !PROJECT_MANAGEMENT_ROLES.has(actorRole)) {
    throw new ApiError(403, 'You do not have permission to update member roles', undefined, {
      code: 'FORBIDDEN',
    });
  }

  const targetRole = project.getMemberRole(targetUserId);
  if (!targetRole) {
    throw new ApiError(404, 'Member not found in this project', undefined, {
      code: 'MEMBER_NOT_FOUND',
    });
  }

  if (!isOwner && actorRole === 'manager') {
    if (!MANAGER_REMOVABLE_ROLES.has(targetRole)) {
      throw new ApiError(
        403,
        'Managers can only update roles of developers or viewers',
        undefined,
        { code: 'FORBIDDEN' }
      );
    }
    if (!MANAGER_REMOVABLE_ROLES.has(newRole)) {
      throw new ApiError(403, 'Managers can only assign developer or viewer roles', undefined, {
        code: 'FORBIDDEN',
      });
    }
  }

  return { isOwner, actorRole };
};

/**
 * Updates a non-owner member's project role using an atomic conditional `$set`
 * with `arrayFilters` so actor permissions, target role constraints, and owner
 * protection are enforced atomically at update time.
 *
 * @returns {Promise<object>} updated, populated project with `userRole`
 */
export const updateProjectMemberRole = async ({ projectId, actorId, targetUserId, role }) => {
  const project = await findMemberProject({ projectId, userId: actorId });
  const { isOwner, actorRole } = assertCanUpdateMemberRole(project, actorId, targetUserId, role);

  const targetObjectId = new mongoose.Types.ObjectId(targetUserId);
  const conditions = [{ _id: project._id }, { owner: { $ne: targetObjectId } }];
  const targetFilter = { 'target.user': targetObjectId };

  if (isOwner) {
    conditions.push({ owner: actorId }, { 'members.user': targetObjectId });
  } else if (actorRole === 'admin') {
    conditions.push(
      {
        $or: [
          { owner: actorId },
          { members: { $elemMatch: { user: actorId, role: 'admin' } } },
        ],
      },
      { 'members.user': targetObjectId }
    );
  } else {
    // Manager: enforce actor authority and developer/viewer-only restriction at write time.
    conditions.push(
      {
        $or: [
          { owner: actorId },
          {
            members: {
              $elemMatch: { user: actorId, role: { $in: [...PROJECT_MANAGEMENT_ROLES] } },
            },
          },
        ],
      },
      {
        members: {
          $elemMatch: { user: targetObjectId, role: { $in: [...MANAGER_REMOVABLE_ROLES] } },
        },
      }
    );
    targetFilter['target.role'] = { $in: [...MANAGER_REMOVABLE_ROLES] };
  }

  const updated = await Project.findOneAndUpdate(
    { $and: conditions },
    { $set: { 'members.$[target].role': role } },
    {
      arrayFilters: [targetFilter],
      returnDocument: 'after',
      runValidators: true,
    }
  ).populate(PROJECT_USER_POPULATE);

  if (updated) {
    return formatProjectForUser(updated, actorId);
  }

  // Atomic update did not match — reload to surface the exact 404 or 403 reason.
  const latest = await findMemberProject({ projectId, userId: actorId });
  assertCanUpdateMemberRole(latest, actorId, targetUserId, role);

  throw new ApiError(409, 'Could not update member role');
};
