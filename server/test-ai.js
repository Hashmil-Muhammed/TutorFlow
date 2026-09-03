const { PrismaClient } = require('@prisma/client');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({});

async function test() {
  try {
    const session = await prisma.session.findFirst({
      where: { status: 'SCHEDULED' },
      include: { studentProfile: true }
    });
    console.log('Session found:', session?.id);
    if (!session) return;
    
    const pastSessions = await prisma.session.findMany({
      where: { studentId: session.studentId, tutorId: session.tutorId, status: { in: ['COMPLETED', 'AI_REVIEWED'] } },
      orderBy: { startTime: 'desc' }, take: 5
    });
    const pastContext = pastSessions.map(s => `Topic: ${s.topic}\nNotes: ${s.notes}\nAI Review: ${s.aiReview || 'N/A'}`).join('\n---\n');

    const prompt = `
      You are an expert tutor. Create a lesson plan for a tutoring session.
      Student Info:
      - Subject: ${session.studentProfile.subject}
      - Level: ${session.studentProfile.level}
      - Learning Goals: ${session.studentProfile.learningGoals}
      - Weak Areas: ${session.studentProfile.weakAreas}
      - Today's Topic: ${session.topic}

      Past Sessions Context:
      ${pastContext}

      Output MUST be valid JSON:
      {
        "objectives": ["obj1"],
        "outline": ["pt1"],
        "practiceQuestions": ["Q1"]
      }
    `;

    console.log("Sending to Gemini...");
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    console.log('Response:', response.text);
  } catch (e) {
    console.error('Error in test:', e);
  }
}
test();
