# 🎓 TutorFlow

> **AI-assisted session management for one-to-one online tutoring**

TutorFlow is a full-stack EdTech platform for tutors to manage students,
schedule classes, run live sessions, capture notes with debounced
autosave, and use AI to prepare and review lessons. Students get a
focused portal for their own upcoming sessions, completed-session notes,
and AI-generated homework.

Built for the **TutorFlow Web Developer Internship Task**, the project
prioritizes reliable end-to-end flows, server-side access isolation,
strict session lifecycle rules, personalized AI, and a clear separation
between frontend and backend responsibilities.


## ✨ Core Features

### 👨‍🏫 Tutor Workspace

-   Create and manage student profiles.
-   Store subject, level, learning goals, weak areas, and optional
    gender information.
-   Schedule sessions with server-side clash prevention and time
    validation.
-   Select class mode and attach a class link or uploaded class asset.
-   Generate a personalized AI lesson plan before a scheduled class.
-   Run a live session with notes and debounced autosave.
-   Enforce `SCHEDULED → IN_PROGRESS → COMPLETED → AI_REVIEWED`.
-   Lock notes after completion.
-   Generate AI session reviews, homework, and next-session suggestions.
-   Generate a longitudinal AI progress summary from past reviewed
    sessions.
-   Send student welcome and session-scheduling emails.

### 👨‍🎓 Student Workspace

-   Login with tutor-created credentials.
-   View only the student's own session data.
-   View upcoming sessions.
-   View completed-session notes in read-only form.
-   View AI-generated homework and review information.
-   Open tutor-provided class assets/links.

### 🤖 AI Workflows

| Workflow | Context | Output |
|---|---|---|
| **Lesson Plan** | Student profile + today's topic + last five completed/reviewed sessions | Learning objectives, 4-point lesson outline, 3 practice questions |
| **Session Review** | Topic + subject/level + tutor notes | Session summary, 2–3 homework tasks, next-class suggestion |
| **Progress Summary** | All AI-reviewed sessions for a student | Short improvement/struggle summary |

------------------------------------------------------------------------

## 🎯 Internship Task Alignment

The task requires two roles, personalized AI, a database, strict session
states, server-side access isolation, debounced autosave, a working
student view, and a README documenting the database and prompts. The
implementation plan specifies React/Vite + TypeScript,
Express/TypeScript, Prisma + SQLite, Gemini, and deployment through
Vercel/Render. 

 ### 🛡️ Requirement → Implementation

| Requirement | Implementation |
|---|---|
| **Two roles** | `TUTOR` and `STUDENT` |
| **Server-side isolation** | JWT authentication + ownership-scoped Prisma queries |
| **Student creation** | Tutor-only student creation API |
| **Student profile** | Subject, level, learning goals, weak areas, gender |
| **Scheduling** | Start/end validation + overlap detection |
| **Double-booking** | Server-side overlap query returns `409` |
| **AI lesson plan** | Gemini + student profile + recent session context |
| **Autosave** | 1000 ms debounce + notes API |
| **Lifecycle** | Strict four-state backend transition validation |
| **Session locking** | Backend rejects note edits after completion |
| **AI review** | Completed notes → summary + homework + next step |
| **Progress view** | Past AI reviews → progress paragraph |
| **Student view** | Upcoming sessions + read-only notes + homework |
| **Email** | Gmail SMTP via Nodemailer |
| **Database** | SQLite + Prisma |
  -----------------------------------------------------------------------




## 🏗️ Architecture

``` mermaid
flowchart LR
    T[👨‍🏫 Tutor] --> C[React Client]
    S[👨‍🎓 Student] --> C
    C -->|JWT REST API| E[Express + TypeScript]
    E --> A[Auth / Role Checks]
    E --> CT[Controllers]
    CT --> P[Prisma ORM]
    P --> DB[(SQLite)]
    CT --> G[Google Gemini]
    CT --> M[Nodemailer]
    M --> SMTP[Gmail SMTP]
```

### Request flow

``` text
Browser
  │
  ├── JWT in Authorization header
  ▼
Express API
  │
  ├── Authentication middleware
  ├── Tutor/student authorization
  ├── Controller validation
  │
  ├── Prisma ───────► SQLite
  ├── Gemini ───────► AI output
  └── Nodemailer ───► Email
  │
  ▼
JSON response → React UI
```

The server entry point mounts `/api/auth`, `/api/students`,
`/api/sessions`, `/api/ai`, and `/api/health`, and initializes the
mailer when the server starts. 


## 🧰 Tech Stack

### Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS


### Backend

-   Node.js
-   Express 5
-   TypeScript
-   JWT


### Data & AI

-   SQLite
-   Prisma ORM
-   Google Gemini via `@google/genai`
-   Current AI controller model: `gemini-3.6-flash`

### Deployment

-   Vercel target for the client
-   Render Blueprint for the server
-   Gmail SMTP for email delivery

The current package manifests confirm the React/Vite/Tailwind frontend
stack and Express/Prisma/Gemini/JWT/Multer/Nodemailer backend stack.



## 👤 Authentication & Role Isolation

TutorFlow uses JWT authentication. On login, the server verifies the
bcrypt password and signs a token containing the user's ID and role with
a one-day expiry. The client stores the token and Axios adds it to
protected requests.
### Roles

### 👥 Role-Based Access

| Role | Access |
|---|---|
| **`TUTOR`** | Students, scheduling, sessions, AI tools, progress |
| **`STUDENT`** | Own dashboard and own sessions/data |

There is **no public student signup**; student accounts are created by
tutors. Tutor-only student APIs are protected with authentication and
tutor middleware. 

The frontend also uses role-aware private routes, but backend ownership
checks remain the actual data-security boundary. 


## 🔐 Test Accounts

Use these credentials for the **deployed evaluation environment**:

### 👨‍🏫 Tutor

``` text
Email:    hazim@gmail.com
Password: Hazim@123
Role:     Tutor
```

### 👨‍🎓 Student

``` text
Email:    hmpibnurnh3@gmail.com
Password: hashmil@123
Role:     Student
```

> These are the requested evaluator credentials. Do not expose real
> production secrets or API keys in the repository.


## 🔄 Strict Session Lifecycle

``` text
┌──────────────┐
│  SCHEDULED   │
└──────┬───────┘
       │ Start Class
       ▼
┌──────────────┐
│ IN_PROGRESS  │
└──────┬───────┘
       │ End Class
       ▼
┌──────────────┐
│  COMPLETED   │
└──────┬───────┘
       │ AI Review
       ▼
┌──────────────┐
│ AI_REVIEWED  │
└──────────────┘
```

The backend stores the status and only accepts the next state in the
ordered list. A state can never skip directly to a later state.
Completed and AI-reviewed sessions are also locked for note editing.


### State rules

``` text
SCHEDULED   → IN_PROGRESS   only
IN_PROGRESS → COMPLETED     only
COMPLETED   → AI_REVIEWED   only
```

The frontend reflects the same states and exposes `Start Class` /
`End Class` actions according to the current state, while the backend
remains the source of truth.



## 📅 Scheduling & Double-Booking Prevention

Before creating or updating a session, the backend validates that:

1.  `startTime < endTime`.
2.  The selected student belongs to the authenticated tutor.
3.  The tutor has no overlapping active session.

The overlap rule is:

``` text
existingStart < newEnd
AND
existingEnd > newStart
```

A conflict returns `409` instead of creating the session. Updates
perform the same check while excluding the session being edited.




## 📝 Live Notes & Debounced Autosave

``` text
Tutor types
    ↓
React state
    ↓
useDebounce(notes, 1000)
    ↓
PUT /api/sessions/:id/notes
    ↓
Prisma → SQLite
```

The custom `useDebounce` hook waits for a 1000 ms quiet period before
updating the debounced value. The Live Session Room sends the debounced
value to the backend only while the session is `IN_PROGRESS`.


The page also uses `beforeunload` to warn when notes are still different
from the last saved value. `localStorage` is used for the live-session
timer start timestamp; persisted notes themselves come from the
database. 

Backend protection prevents: - Saving notes before `IN_PROGRESS`. -
Editing notes after `COMPLETED`. - Editing notes after `AI_REVIEWED`.



## 🤖 AI Integration & Prompts

TutorFlow uses Google Gemini through `@google/genai`. The AI controller
explicitly loads the student profile and recent session context rather
than sending generic prompts. Lesson-plan and review responses request
`application/json` so the UI can consume structured data.


### 1. AI Lesson Plan

**Input:** subject, level, learning goals, weak areas, today's topic,
and the last five completed/reviewed sessions.

**Prompt:**

``` text
You are an expert tutor. Create a lesson plan for a tutoring session.

Student Info:
- Subject: ${subject}
- Level: ${level}
- Learning Goals: ${learningGoals}
- Weak Areas: ${weakAreas}
- Today's Topic: ${topic}

Past Sessions Context (Use this to avoid repeating topics and focus on past weak points):
${pastContext}

Output MUST be valid JSON in this exact format, with no markdown formatting around it:

{
  "objectives": ["objective 1", "objective 2"],
  "outline": ["point 1", "point 2", "point 3", "point 4"],
  "practiceQuestions": ["Q1", "Q2", "Q3"]
}
```

**Why:** The profile makes the plan student-specific, while the last
five sessions provide history so the model can avoid unnecessary
repetition and focus on weak points. The explicit JSON shape makes the
result predictable for the frontend. 


### 2. AI Session Review

**Input:** session topic, student subject/level, and tutor notes.

**Prompt:**

``` text
You are an expert tutor evaluating a just-finished class.

Session Topic: ${topic}
Student Subject & Level: ${subject} - ${level}

Tutor's Notes during class:
"${notes}"

Based on this context, generate a session review and homework.

Output MUST be valid JSON in this exact format, with no markdown formatting around it:

{
  "summary": "Short paragraph summarizing the session.",
  "homework": ["Task 1", "Task 2"],
  "suggestionForNextClass": "One concrete suggestion."
}
```

If no notes were recorded, the implementation explicitly tells Gemini
that no specific notes are available and asks for a general review based
on the topic. A successful review stores the output and advances the
session to `AI_REVIEWED`.

### 3. AI Progress Summary

**Input:** student name + every `AI_REVIEWED` session's stored AI
review.

**Prompt:**

``` text
You are an expert educational counselor. Review the past session reviews for this student named ${studentName}:

${reviews}

Write a single, encouraging paragraph (3-4 sentences) summarizing ${studentName}'s overall progress. Mention where they improved and what they still struggle with. Return plain text only. Use the exact name '${studentName}' in your summary.
```

**Why:** The tutor gets a concise longitudinal view of improvement and
remaining struggles without manually reading every past review.


### AI failure handling

AI calls are wrapped in `try/catch`. If Gemini fails, the API returns a
controlled error response instead of crashing the request, and the
frontend displays a failure message/loading state.




## 🗄️ Database Schema

TutorFlow uses **SQLite + Prisma** with three core models: `User`,
`StudentProfile`, and `Session`. 

``` mermaid
erDiagram
    USER ||--o{ STUDENT_PROFILE : creates
    USER ||--o| STUDENT_PROFILE : owns
    USER ||--o{ SESSION : tutors
    STUDENT_PROFILE ||--o{ SESSION : has

    USER {
        string id PK
        string email UK
        string password
        string name
        string role
    }
    STUDENT_PROFILE {
        string id PK
        string tutorId FK
        string userId FK
        string subject
        string level
        string learningGoals
        string weakAreas
        string gender
    }
    SESSION {
        string id PK
        string tutorId FK
        string studentId FK
        datetime startTime
        datetime endTime
        string topic
        string status
        string notes
        string aiLessonPlan
        string aiReview
        string classMode
        string classAssetUrl
    }
```

### `User`

Authentication and role data: `id`, unique `email`, bcrypt password,
`name`, and `role`.

### `StudentProfile`

Educational context owned by a tutor and optionally linked to a student
user: `subject`, `level`, `learningGoals`, `weakAreas`, and `gender`.

### `Session`

Class scheduling and learning data: tutor, student profile, start/end
time, topic, lifecycle status, notes, AI lesson plan, AI review, class
mode, and class asset URL.

### Query design

Tutor student listings use Prisma relation loading to retrieve linked
user information rather than repeatedly querying users inside a loop.
Session queries similarly use `include` / `select` to load related tutor
and student information efficiently. 



## ✉️ Email System

Email is implemented as an additional feature using **Nodemailer + Gmail
SMTP**.

### Session scheduled email

The student receives: - Tutor name/email - Topic - Subject and level -
Date/time - Class mode - Attached class link/file when available -
Button to open the session

### Student welcome email

When a tutor creates a student account, TutorFlow can send the student's
login information together with tutor details and the student's
educational profile.

The mailer reads `EMAIL_USER` and `EMAIL_APP_PASSWORD`, verifies the
Gmail transporter at startup, and sends HTML/text email templates.




## 📁 Project Structure

``` text
TutorFlow/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   └── useDebounce.ts
│   │   ├── lib/
│   │   │   └── axios.ts
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── TutorDashboard.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   └── SessionLiveRoom.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── public/uploads/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── aiController.ts
│   │   │   ├── authController.ts
│   │   │   ├── sessionController.ts
│   │   │   ├── sessionDetailsController.ts
│   │   │   └── studentController.ts
│   │   ├── lib/
│   │   │   ├── gemini.ts
│   │   │   └── mailer.ts
│   │   ├── middlewares/
│   │   │   └── authMiddleware.ts
│   │   ├── routes/
│   │   │   ├── aiRoutes.ts
│   │   │   ├── authRoutes.ts
│   │   │   ├── sessionRoutes.ts
│   │   │   └── studentRoutes.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── render.yaml
├── package.json
└── README.md
```

The repository separates the React client from the Express server and
further separates backend routes, controllers, middleware, Prisma, AI,
and mailer concerns.



## 🔌 API Overview

### 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Login and receive JWT |
| `POST` | `/api/auth/register` | Tutor registration endpoint |
| `GET` | `/api/auth/me` | Get authenticated user |
| `POST` | `/api/students` | Create student |
| `GET` | `/api/students` | List tutor's students |
| `PUT` | `/api/students/:id` | Update student |
| `DELETE` | `/api/students/:id` | Delete student |
| `POST` | `/api/students/send-welcome-email` | Send welcome email |
| `GET` | `/api/sessions` | Get role-scoped sessions |
| `POST` | `/api/sessions/schedule` | Schedule session |
| `PUT` | `/api/sessions/:id` | Update session |
| `DELETE` | `/api/sessions/:id` | Delete session |
| `GET` | `/api/sessions/:id` | Get tutor session details |
| `PUT` | `/api/sessions/:id/state` | Advance lifecycle state |
| `PUT` | `/api/sessions/:id/notes` | Autosave notes |
| `POST` | `/api/ai/lesson-plan/:sessionId` | Generate lesson plan |
| `POST` | `/api/ai/session-review/:sessionId` | Generate session review |
| `GET` | `/api/ai/progress-summary/:studentId` | Generate progress summary |
| `GET` | `/api/health` | Health check |


The route files apply authentication globally to protected resources and
tutor-only middleware to student management, session management, and AI
endpoints. 


## 🖥️ Frontend Routes

``` text
/                    → role-based redirect
/login               → login
/tutor-dashboard     → tutor-only dashboard
/session/:id         → tutor-only live session room
/student-dashboard   → student-only dashboard
```

The React `PrivateRoute` checks authentication and role before rendering
protected pages.


## ⚙️ Environment Variables

### Backend

Create `server/.env`:

``` env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_jwt_secret"
GEMINI_API_KEY="your_gemini_api_key"
EMAIL_USER="your_gmail_address"
EMAIL_APP_PASSWORD="your_gmail_app_password"
PORT=5000
```

Prisma reads `DATABASE_URL`, Gemini reads `GEMINI_API_KEY`, and the
mailer reads the Gmail credentials.


### Frontend API URL

The current Axios client points to:

``` text
http://localhost:5000/api
```

For production, update `client/src/lib/axios.ts` to the deployed backend
URL or refactor it to a Vite environment variable such as
`VITE_API_URL`.



## 🚀 Local Development

### 1. Clone

``` bash
git clone https://github.com/Hashmil-Muhammed/TutorFlow.git
cd TutorFlow
```

### 2. Backend

``` bash
cd server
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

### 3. Frontend

In another terminal:

``` bash
cd client
npm install
npm run dev
```

### Local URLs

``` text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/api/health
```



## ☁️ Deployment

### Frontend --- Vercel

Recommended configuration:

``` text
Root Directory: client
Framework:      Vite
Build Command:  npm run build
Output:         dist
```

The deployed frontend must point to the deployed backend instead of the
current localhost Axios URL.

### Backend --- Render

`render.yaml` configures: - Node runtime - `server` root directory -
`npm install && npx prisma generate` build - `npm start` start command -
`DATABASE_URL` - `JWT_SECRET` - `GEMINI_API_KEY`

The current Blueprint uses `file:./dev.db`. For durable production
persistence, PostgreSQL should replace the current SQLite deployment
configuration.

### Production checklist

``` text
[ ] Configure JWT_SECRET
[ ] Configure GEMINI_API_KEY
[ ] Configure Gmail SMTP credentials
[ ] Configure production database
[ ] Update frontend API base URL
[ ] Update session email/asset localhost URLs
[ ] Provision evaluator accounts
[ ] Verify CORS
[ ] Test Tutor login
[ ] Test Student login
[ ] Test full session lifecycle
[ ] Test AI failure handling
[ ] Test email delivery
```



## 🛡️ Security & Data Isolation

-   Passwords are hashed with bcryptjs.
-   JWT contains user ID and role.
-   Protected APIs require authentication.
-   Tutor student queries are scoped by `tutorId`.
-   Student profiles are linked to their owning tutor.
-   Session creation verifies student ownership.
-   Student session retrieval is resolved through the student's own
    profile.
-   Lifecycle transitions are validated server-side.
-   Completed/AI-reviewed notes cannot be changed through the API.
-   AI requests verify tutor/session ownership before generation.

These controls directly address the task's requirement that role
isolation and session rules be enforced by the server, not only by
hiding frontend controls. 



## 🧪 Validation Rules at a Glance

``` text
Scheduling
  startTime < endTime
  + no overlapping active tutor session
  + student belongs to tutor

Lifecycle
  SCHEDULED → IN_PROGRESS → COMPLETED → AI_REVIEWED

Notes
  SCHEDULED   → locked
  IN_PROGRESS → autosave allowed
  COMPLETED   → locked
  AI_REVIEWED → locked

AI Lesson Plan
  SCHEDULED only

AI Session Review
  COMPLETED only

Progress Summary
  AI-reviewed history required
```



## 📋 Evaluation Mapping
### 📊 Evaluation Criteria

| Area | Weight | TutorFlow Focus |
|---|---:|---|
| **Login & Access** | 15 | JWT, roles, ownership checks |
| **Session States** | 15 | Strict lifecycle + clash prevention |
| **AI Features** | 25 | Personalized prompts + structured output + error handling |
| **Database & Backend** | 20 | Prisma relations + scoped queries + debounced autosave |
| **Frontend** | 15 | Tutor/Student screens + loading/error feedback |
| **README** | 10 | Schema + prompts + setup + future direction |
| **Total** | **100** | **End-to-end implementation** |
  

The weights follow the supplied internship brief. 



## 📌 Project Status

### Implemented

-   Two-role authentication
-   Tutor/student data isolation
-   Tutor-created student accounts
-   Student profile management
-   Session scheduling and conflict prevention
-   Strict four-state lifecycle
-   Live session room
-   Debounced note autosave
-   Before-unload unsaved-note warning
-   AI lesson planning
-   AI session review
-   AI progress summary
-   Student dashboard
-   Tutor dashboard
-   Class links/assets
-   Student welcome emails
-   Session scheduling emails
-   Prisma + SQLite persistence
-   Render backend configuration

### Deployment considerations

-   The repository contains a Render Blueprint, but the current
    deployment database configuration is SQLite.
-   The current Axios client uses a localhost backend URL and must be
    changed for a deployed frontend.
-   Session email links and relative asset URLs also contain localhost
    fallbacks and should be configured for production URLs.
-   The requested evaluator accounts must exist in the deployed
    database.

This status section is intentionally transparent because the internship
brief asks candidates to state what works and what remains if anything
is incomplete. 



## 👨‍💻 Author

**Hashmil Muhammed**

-   GitHub: https://github.com/Hashmil-Muhammed
-   TutorFlow: https://github.com/Hashmil-Muhammed/TutorFlow



## 🔮 What I Would Build Next If I Had Another Day

If I had another day, I would migrate the production database from
SQLite to PostgreSQL so deployed data is durable and the system can
scale beyond a single-instance MVP.\
I would add a full calendar view with stronger timezone-aware scheduling
and clearer visual conflict detection for tutors.\
I would improve the live session experience with reliable
tab-close/local draft recovery and stronger offline/connection-loss
handling for notes.\
I would extend the AI layer with interactive quizzes and richer progress
analytics while keeping the existing structured-output approach.\
I would add automated tests and CI checks covering authentication
isolation, scheduling conflicts, lifecycle transitions, autosave
locking, and AI failure paths.
