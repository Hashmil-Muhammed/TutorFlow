import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

// Schedule a new session (TUTOR only)
export const scheduleSession = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, startTime, endTime, topic } = req.body;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Clash prevention: Check if tutor already has a session that overlaps
    // Overlap condition: (existingStart < newEnd) AND (existingEnd > newStart)
    const clashingSession = await prisma.session.findFirst({
      where: {
        tutorId,
        status: { notIn: ['COMPLETED', 'AI_REVIEWED'] }, // Optionally exclude completed ones if they don't matter, but generally time shouldn't clash anyway
        AND: [
          { startTime: { lt: new Date(endTime) } },
          { endTime: { gt: new Date(startTime) } }
        ]
      }
    });

    if (clashingSession) {
      return res.status(409).json({ 
        error: 'Double booking detected. You already have a session scheduled during this time.' 
      });
    }

    // Ensure student exists and belongs to this tutor
    const studentProfile = await prisma.studentProfile.findFirst({
      where: { id: studentId, tutorId }
    });

    if (!studentProfile) {
      return res.status(404).json({ error: 'Student not found or access denied' });
    }

    const session = await prisma.session.create({
      data: {
        tutorId,
        studentId, // This is actually the profile ID based on schema
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        topic,
        status: 'SCHEDULED'
      }
    });

    res.status(201).json({ message: 'Session scheduled successfully', session });
  } catch (error) {
    console.error('Error scheduling session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all sessions for the logged in user
export const getMySessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let sessions;

    if (role === 'TUTOR') {
      sessions = await prisma.session.findMany({
        where: { tutorId: userId },
        include: {
          studentProfile: {
            include: { user: { select: { name: true, email: true } } }
          }
        },
        orderBy: { startTime: 'asc' }
      });
    } else {
      // Student view
      // Find the student profile first
      const profile = await prisma.studentProfile.findUnique({
        where: { userId }
      });

      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      sessions = await prisma.session.findMany({
        where: { studentId: profile.id }, // studentId in Session maps to StudentProfile id
        include: {
          tutor: { select: { name: true, email: true } }
        },
        orderBy: { startTime: 'asc' }
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
