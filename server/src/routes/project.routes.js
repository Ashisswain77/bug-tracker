import { Router } from 'express';
import {
  create,
  list,
  getById,
  update,
  remove,
  addMember,
  removeMember,
  updateMemberRole,
} from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import {
  validateCreateProject,
  validateUpdateProject,
  validateListProjectsQuery,
  validateProjectIdParam,
  validateProjectMemberParams,
  validateAddMember,
  validateUpdateMemberRole,
} from '../validators/project.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(validateListProjectsQuery), list);
router.post('/', validate(validateCreateProject), create);
router.get('/:projectId', validateParams(validateProjectIdParam), getById);
router.patch(
  '/:projectId',
  validateParams(validateProjectIdParam),
  validate(validateUpdateProject),
  update
);
router.delete('/:projectId', validateParams(validateProjectIdParam), remove);
router.post(
  '/:projectId/members',
  validateParams(validateProjectIdParam),
  validate(validateAddMember),
  addMember
);
router.delete(
  '/:projectId/members/:userId',
  validateParams(validateProjectMemberParams),
  removeMember
);
router.patch(
  '/:projectId/members/:userId/role',
  validateParams(validateProjectMemberParams),
  validate(validateUpdateMemberRole),
  updateMemberRole
);

export default router;
