import express from 'express';
import { createStudent, getMyStudents, updateStudent, deleteStudent, sendWelcomeEmail } from '../controllers/studentController';
import { authenticateToken, isTutor } from '../middlewares/authMiddleware';

const router = express.Router();

// Apply auth and isTutor middleware to all routes in this file
router.use(authenticateToken, isTutor);

router.post('/', createStudent);
router.get('/', getMyStudents);
router.post('/send-welcome-email', sendWelcomeEmail);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;

