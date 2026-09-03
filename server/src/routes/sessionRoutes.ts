import express from 'express';
import multer from 'multer';
import path from 'path';
import { scheduleSession, getMySessions, deleteSession, updateSession } from '../controllers/sessionController';
import { getSessionById, updateSessionState, updateNotes } from '../controllers/sessionDetailsController';
import { authenticateToken, isTutor } from '../middlewares/authMiddleware';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

router.use(authenticateToken); // Must be logged in

router.get('/', getMySessions);
router.post('/schedule', isTutor, upload.single('classAssetFile'), scheduleSession); // Only tutors can schedule
router.put('/:id', isTutor, upload.single('classAssetFile'), updateSession); // Edit session
router.get('/:id', isTutor, getSessionById);
router.put('/:id/state', isTutor, updateSessionState);
router.put('/:id/notes', isTutor, updateNotes);
router.delete('/:id', isTutor, deleteSession);

export default router;
