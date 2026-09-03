import express from 'express';
import { scheduleSession, getMySessions } from '../controllers/sessionController';
import { getSessionById, updateSessionState, updateNotes } from '../controllers/sessionDetailsController';
import { authenticateToken, isTutor } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(authenticateToken); // Must be logged in

router.get('/', getMySessions);
router.post('/schedule', isTutor, scheduleSession); // Only tutors can schedule
router.get('/:id', isTutor, getSessionById);
router.put('/:id/state', isTutor, updateSessionState);
router.put('/:id/notes', isTutor, updateNotes);

export default router;
