import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Seed Tutor
  const tutor = await prisma.user.upsert({
    where: { email: 'tutor@tutorflow.com' },
    update: {},
    create: {
      email: 'tutor@tutorflow.com',
      password: hashedPassword,
      name: 'John Tutor',
      role: 'TUTOR',
    },
  })

  // Seed Student
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@tutorflow.com' },
    update: {},
    create: {
      email: 'student@tutorflow.com',
      password: hashedPassword,
      name: 'Alice Student',
      role: 'STUDENT',
    },
  })

  // Seed Student Profile
  const existingProfile = await prisma.studentProfile.findUnique({
    where: { userId: studentUser.id }
  })

  if (!existingProfile) {
    await prisma.studentProfile.create({
      data: {
        tutorId: tutor.id,
        userId: studentUser.id,
        subject: 'Mathematics',
        level: 'Grade 10',
        learningGoals: 'Improve algebra basics and prepare for exams',
        weakAreas: 'Quadratic equations',
      }
    })
  }

  console.log('Seeding completed successfully!')
  console.log('Test Tutor: tutor@tutorflow.com / password123')
  console.log('Test Student: student@tutorflow.com / password123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
