import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

import { sendSessionEmail } from '../lib/mailer';

// Schedule a new session (TUTOR only)
export const scheduleSession = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, startTime, endTime, topic, classMode, classAssetLink } = req.body;
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
      where: { id: studentId, tutorId },
      include: { user: true }
    });

    if (!studentProfile) {
      return res.status(404).json({ error: 'Student not found or access denied' });
    }

    let classAssetUrl = null;
    if (classMode === 'VIDEO_CALL' && classAssetLink) {
      classAssetUrl = classAssetLink;
    } else if (req.file) {
      // Store the relative path so the frontend can append the base URL
      classAssetUrl = `/uploads/${req.file.filename}`;
    }

    const session = await prisma.session.create({
      data: {
        tutorId,
        studentId, // This is actually the profile ID based on schema
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        topic,
        status: 'SCHEDULED',
        classMode: classMode || null,
        classAssetUrl
      }
    });

    // Send email notification
    const joinLink = `http://localhost:5174/session/${session.id}`;
    await sendSessionEmail(
      studentProfile.user.email,
      studentProfile.user.name,
      {
        topic: session.topic,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        classMode: session.classMode || 'Standard Class',
        link: joinLink
      }
    );

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

// Delete a session
export const deleteSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findFirst({
      where: { id, tutorId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    await prisma.session.delete({
      where: { id }
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a session (TUTOR only)
export const updateSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId, startTime, endTime, topic, classMode, classAssetLink } = req.body;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const existingSession = await prisma.session.findFirst({
      where: { id, tutorId }
    });

    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    // Clash prevention, excluding the current session being updated
    const clashingSession = await prisma.session.findFirst({
      where: {
        tutorId,
        id: { not: id },
        status: { notIn: ['COMPLETED', 'AI_REVIEWED'] },
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

    let classAssetUrl = existingSession.classAssetUrl;
    // If a new file is uploaded or a new link is provided, update it.
    if (classMode === 'VIDEO_CALL' && classAssetLink) {
      classAssetUrl = classAssetLink;
    } else if (req.file) {
      classAssetUrl = `/uploads/${req.file.filename}`;
    } else if (classMode !== existingSession.classMode) {
       // If mode changed but no new file/link, we might want to clear it, but let's just leave it or clear it depending on logic.
       // Usually if they change to NOTES from VIDEO_CALL without uploading, they shouldn't. Let's just clear it if mode changed and no new asset provided.
       if (classMode === 'VIDEO_CALL' && !classAssetLink) classAssetUrl = null;
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        studentId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        topic,
        classMode: classMode || null,
        classAssetUrl
      }
    });

    res.json({ message: 'Session updated successfully', session: updatedSession });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
