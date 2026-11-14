import { Router } from 'express';
import { register, login, refresh, getMe, logout } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validateRegister, validateLogin } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validate(validateRegister), register);
// Limiter runs before validation so malformed attempts also count toward the limit.
router.post('/login', loginLimiter, validate(validateLogin), login);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.post('/logout', logout);

export default router;
