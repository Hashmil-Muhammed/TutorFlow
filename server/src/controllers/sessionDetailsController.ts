import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

// Get single session details
export const getSessionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findFirst({
      where: { id, tutorId },
      include: {
        studentProfile: {
          include: { user: { select: { name: true, email: true } } }
        }
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update session state (enforcing the 4-state lifecycle)
export const updateSessionState = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newState } = req.body;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findFirst({ where: { id, tutorId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const validStates = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AI_REVIEWED'];
    
    // Validate order
    const currentIndex = validStates.indexOf(session.status);
    const newIndex = validStates.indexOf(newState);

    if (newIndex === -1) {
      return res.status(400).json({ error: 'Invalid state' });
    }

    if (newIndex !== currentIndex + 1) {
      return res.status(400).json({ 
        error: `Invalid state transition. Cannot go from ${session.status} directly to ${newState}.` 
      });
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: { status: newState }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error updating state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Autosave session notes
export const updateNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findFirst({ where: { id, tutorId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.status === 'COMPLETED' || session.status === 'AI_REVIEWED') {
      return res.status(403).json({ error: 'Cannot edit notes of a completed session.' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(403).json({ error: 'Session must be IN_PROGRESS to save notes.' });
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: { notes }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
