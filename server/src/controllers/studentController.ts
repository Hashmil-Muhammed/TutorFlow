import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

// Create a new student (TUTOR only)
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, subject, level, learningGoals, weakAreas } = req.body;
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
