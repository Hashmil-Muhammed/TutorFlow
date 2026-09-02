import express from 'express';
import { login, getMe } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateToken, getMe);

export default router;
