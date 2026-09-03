# TutorFlow

TutorFlow is a comprehensive full-stack web application designed for tutors to manage their daily workflow, schedule sessions with students, and leverage AI to generate personalized lesson plans and session reviews.

## 🚀 Live Demo & Login Credentials

**Test Tutor Account:**
- **Email:** `tutor@tutorflow.com`
- **Password:** `password123`

**Test Student Account:**
- **Email:** `student@tutorflow.com`
- **Password:** `password123`

*(Note: If deployed, ensure you run `npx prisma db seed` on your database to load these accounts).*

---

## 🗄️ Database Schema & Relationships

The application uses **Prisma** with a SQLite database. Here is the breakdown of the three core tables and their relationships:

1. **User:** 
   - Stores authentication details (`email`, `password`, `role: TUTOR | STUDENT`).
   - A User with the `TUTOR` role can have multiple `StudentProfile`s attached to them.
   - A User with the `STUDENT` role has exactly one `StudentProfile` linked via `userId`.
2. **StudentProfile:** 
   - Contains educational metadata about a student (`subject`, `level`, `learningGoals`, `weakAreas`).
   - Belongs to one Tutor (`tutorId`) and is linked to one Student User account (`userId`).
3. **Session:** 
   - Represents a scheduled class between a Tutor and a Student Profile.
   - Follows a strict 4-state lifecycle: `SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED` -> `AI_REVIEWED`.
   - Stores timestamps, topic, rich text notes (autosaved), and JSON outputs from the AI (`aiLessonPlan`, `aiReview`).

**Avoiding N+1 Queries:** 
Relationships are fetched efficiently using Prisma's `include` feature. For example, when fetching a tutor's students, `include: { user: true }` is used in a single query rather than looping over profiles and making sequential queries to the User table.

---

## 🤖 AI Integration & Prompts

We integrated Google's **Gemini 2.5 Flash** model. The prompts were designed to be highly personalized and enforce strict JSON output so the frontend can render them beautifully without parsing errors.

1. **AI Lesson Plan Prompt:**
   - *Why designed this way:* We feed the student's `learningGoals` and `weakAreas` directly into the prompt to ensure the lesson plan isn't generic, but tailored to their current struggles. We enforced a strict JSON format with arrays (`objectives`, `outline`, `practiceQuestions`) so the UI can map over them natively.
2. **AI Session Review Prompt:**
   - *Why designed this way:* Takes the raw `notes` typed by the tutor during the live session as input. The prompt instructs the AI to extract actionable homework and a summary. By using JSON (`summary`, `homework`, `suggestionForNextClass`), the student dashboard can distinctively display the homework items as a clean list.
3. **AI Progress Summary Prompt:**
   - *Why designed this way:* Takes an aggregation of all past AI reviews for a student. The prompt asks for a concise, encouraging paragraph (plain text) to quickly show the tutor if the student is improving over time, rather than forcing the tutor to read every past review.

---

## 🔮 Future Improvements (If I had another day)

If I had one more day to build upon this project, I would implement **Email Notifications**. Using a service like Resend, I would automatically send an email to the student whenever the tutor schedules a new session or changes the time. Secondly, I would add a **Calendar View** to the Tutor Dashboard, using a library like `react-big-calendar`, making it visually easier to spot double-bookings before they happen. I would also implement **File Uploads** in the Live Room, so tutors could share PDF worksheets directly with students. Furthermore, I would upgrade the AI to generate interactive quizzes rather than just text questions. Finally, I would migrate the database from SQLite to **PostgreSQL (Supabase)** for better scalability and real-time WebSocket support for collaborative note-taking.

---

## 🛠️ Deployment Setup

- **Frontend (Vercel):** Create a new Vercel project, point it to the GitHub repository, set the Root Directory to `client`, the Framework Preset to `Vite`, and add your `VITE_API_URL` environment variable.
- **Backend (Render):** A `render.yaml` Blueprint file is provided. You can connect your Render account to the repository, and it will automatically provision a Node.js web service running out of the `server` directory. Ensure you provide a `JWT_SECRET` and `GEMINI_API_KEY` in the Render dashboard.

## Local Setup

1. `cd server` -> `npm install` -> `npx prisma db push` -> `npx prisma db seed` -> `npm run dev`
2. `cd client` -> `npm install` -> `npm run dev`
