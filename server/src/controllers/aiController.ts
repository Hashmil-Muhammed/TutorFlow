import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ai } from '../lib/gemini';

const prisma = new PrismaClient();

// 1. Generate Lesson Plan (Before class)
export const generateLessonPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const tutorId = req.user?.id;
    
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findFirst({
      where: { id: sessionId, tutorId },
      include: { studentProfile: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Lesson plan can only be generated for SCHEDULED sessions' });
    }

    // Fetch past completed/reviewed sessions to give context to AI
    const pastSessions = await prisma.session.findMany({
      where: { 
        studentId: session.studentId, 
        tutorId,
        status: { in: ['COMPLETED', 'AI_REVIEWED'] }
      },
      orderBy: { startTime: 'desc' },
      take: 5 // Last 5 sessions
    });

    const pastContext = pastSessions.map(s => 
      `Topic: ${s.topic}\nNotes: ${s.notes}\nAI Review: ${s.aiReview || 'N/A'}`
    ).join('\n---\n');

    const prompt = `
      You are an expert tutor. Create a lesson plan for a tutoring session.
      Student Info:
      - Subject: ${session.studentProfile.subject}
      - Level: ${session.studentProfile.level}
      - Learning Goals: ${session.studentProfile.learningGoals}
      - Weak Areas: ${session.studentProfile.weakAreas}
      - Today's Topic: ${session.topic}

      Past Sessions Context (Use this to avoid repeating topics and focus on past weak points):
      ${pastContext}

      Output MUST be valid JSON in this exact format, with no markdown formatting around it:
      {
        "objectives": ["objective 1", "objective 2"],
        "outline": ["point 1", "point 2", "point 3", "point 4"],
        "practiceQuestions": ["Q1", "Q2", "Q3"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const aiOutput = response.text || "{}";

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: { aiLessonPlan: aiOutput }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error generating lesson plan:', error);
    res.status(500).json({ error: 'Failed to generate AI Lesson Plan' });
  }
};

// 2. Generate Session Review (After class)
export const generateSessionReview = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const tutorId = req.user?.id;
    
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    const session = await prisma.session.findFirst({
      where: { id: sessionId, tutorId },
      include: { studentProfile: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Review can only be generated for COMPLETED sessions' });
    }

    const notesContext = (session.notes && session.notes.trim() !== '') 
      ? `Tutor's Notes during class:\n"${session.notes}"` 
      : "No specific notes were taken by the tutor during this session. Generate a general review and homework based on the topic.";

    const prompt = `
      You are an expert tutor evaluating a just-finished class.
      Session Topic: ${session.topic}
      Student Subject & Level: ${session.studentProfile.subject} - ${session.studentProfile.level}
      
      ${notesContext}

      Based on this context, generate a session review and homework.
      Output MUST be valid JSON in this exact format, with no markdown formatting around it:
      {
        "summary": "Short paragraph summarizing the session.",
        "homework": ["Task 1", "Task 2"],
        "suggestionForNextClass": "One concrete suggestion."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const aiOutput = response.text || "{}";

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: { 
        aiReview: aiOutput,
        status: 'AI_REVIEWED' // Advance state to AI_REVIEWED
      }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error generating session review:', error);
    res.status(500).json({ error: 'Failed to generate AI Review' });
  }
};

// 3. Generate Progress Summary
export const generateProgressSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const tutorId = req.user?.id;
    
    if (!tutorId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch past reviews for this student
    const pastSessions = await prisma.session.findMany({
      where: { studentId, tutorId, status: 'AI_REVIEWED' },
      orderBy: { startTime: 'asc' }
    });

    if (pastSessions.length === 0) {
      return res.status(400).json({ error: 'Not enough AI reviewed sessions to generate a progress summary.' });
    }

    const reviews = pastSessions.map(s => s.aiReview).join('\n---\n');

    const prompt = `
      You are an expert educational counselor. Review the past session reviews for this student:
      
      ${reviews}

      Write a single, encouraging paragraph (3-4 sentences) summarizing their overall progress. Mention where they improved and what they still struggle with. Return plain text only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    res.json({ progressSummary: response.text });
  } catch (error) {
    console.error('Error generating progress summary:', error);
    res.status(500).json({ error: 'Failed to generate Progress Summary' });
  }
};
