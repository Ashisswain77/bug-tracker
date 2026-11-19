import {
  createProject,
  listUserProjects,
  getProjectForUser,
  updateProjectForUser,
  deleteProjectForUser,
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
} from '../services/project.service.js';

export const create = async (req, res) => {
  const project = await createProject({
    ...req.body,
    ownerId: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: { project },
  });
};

export const list = async (req, res) => {
  const result = await listUserProjects({
    ...req.validatedQuery,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: 'Projects retrieved successfully',
    data: result,
  });
};

export const getById = async (req, res) => {
  const project = await getProjectForUser({
    projectId: req.validatedParams.projectId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: 'Project retrieved successfully',
    data: { project },
  });
};

export const update = async (req, res) => {
  const project = await updateProjectForUser({
    projectId: req.validatedParams.projectId,
    userId: req.user._id,
    updates: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    data: { project },
  });
};

export const remove = async (req, res) => {
  const result = await deleteProjectForUser({
    projectId: req.validatedParams.projectId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully',
    data: result,
  });
};

export const addMember = async (req, res) => {
  const project = await addProjectMember({
    projectId: req.validatedParams.projectId,
    userId: req.user._id,
    ...req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Member added to project successfully',
    data: { project },
  });
};

export const removeMember = async (req, res) => {
  const project = await removeProjectMember({
    projectId: req.validatedParams.projectId,
    actorId: req.user._id,
    targetUserId: req.validatedParams.userId,
  });

  res.status(200).json({
    success: true,
    message: 'Member removed from project successfully',
    data: { project },
  });
};

export const updateMemberRole = async (req, res) => {
  const project = await updateProjectMemberRole({
    projectId: req.validatedParams.projectId,
    actorId: req.user._id,
    targetUserId: req.validatedParams.userId,
    role: req.body.role,
  });

  res.status(200).json({
    success: true,
    message: 'Member role updated successfully',
    data: { project },
  });
};
