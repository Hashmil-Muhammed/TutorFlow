import express from 'express';
import { generateLessonPlan, generateSessionReview, generateProgressSummary } from '../controllers/aiController';
import { authenticateToken, isTutor } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(authenticateToken, isTutor);

router.post('/lesson-plan/:sessionId', generateLessonPlan);
router.post('/session-review/:sessionId', generateSessionReview);
router.get('/progress-summary/:studentId', generateProgressSummary);

export default router;
