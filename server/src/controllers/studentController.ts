import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sendWelcomeStudentEmail } from '../lib/mailer';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

// Create a new student (TUTOR only)
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, subject, level, learningGoals, weakAreas, gender } = req.body;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    // Create user and profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newStudent = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'STUDENT',
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          tutorId,
          userId: newStudent.id,
          subject,
          level,
          learningGoals,
          weakAreas,
          gender: gender || null,
        },
      });

      return { user: newStudent, profile };
    });

    res.status(201).json({
      message: 'Student created successfully',
      student: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        profileId: result.profile.id,
        subject: result.profile.subject,
      }
    });

  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all students for a tutor (TUTOR only)
export const getMyStudents = async (req: AuthRequest, res: Response) => {
  try {
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const students = await prisma.studentProfile.findMany({
      where: { tutorId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a student (TUTOR only)
export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, subject, level, learningGoals, weakAreas, gender } = req.body;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await prisma.studentProfile.findFirst({
      where: { id, tutorId },
      include: { user: true }
    });

    if (!profile) return res.status(404).json({ error: 'Student not found' });

    await prisma.$transaction(async (tx) => {
      if (profile.userId) {
        await tx.user.update({
          where: { id: profile.userId },
          data: { name, email }
        });
      }
      
      await tx.studentProfile.update({
        where: { id },
        data: { subject, level, learningGoals, weakAreas, gender }
      });
    });

    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a student (TUTOR only)
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tutorId = req.user?.id;

    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await prisma.studentProfile.findFirst({
      where: { id, tutorId }
    });

    if (!profile) return res.status(404).json({ error: 'Student not found' });

    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { studentId: id }
      });
      await tx.studentProfile.delete({
        where: { id }
      });
      if (profile.userId) {
        await tx.user.delete({
          where: { id: profile.userId }
        });
      }
    });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send welcome email to a newly onboarded student (TUTOR only)
export const sendWelcomeEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, subject, level, gender, learningGoals, weakAreas } = req.body;
    const tutorId = req.user?.id;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    let tutorName = req.user?.name;
    let tutorEmail = req.user?.email;

    if (tutorId && (!tutorName || !tutorEmail)) {
      const tutorUser = await prisma.user.findUnique({
        where: { id: tutorId },
        select: { name: true, email: true }
      });
      if (tutorUser) {
        tutorName = tutorUser.name;
        tutorEmail = tutorUser.email;
      }
    }

    await sendWelcomeStudentEmail({
      name,
      email,
      password,
      subject,
      level,
      gender,
      learningGoals,
      weakAreas,
      tutorName: tutorName || undefined,
      tutorEmail: tutorEmail || undefined
    });

    return res.status(200).json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
};

