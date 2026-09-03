import express from 'express';
import { scheduleSession, getMySessions } from '../controllers/sessionController';
import { authenticateToken, isTutor } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(authenticateToken); // Must be logged in

router.get('/', getMySessions);
router.post('/schedule', isTutor, scheduleSession); // Only tutors can schedule

export default router;
