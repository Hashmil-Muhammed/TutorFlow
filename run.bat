@echo off
echo Starting TutorFlow Backend Server...
start cmd /k "cd server && npm run dev"

echo Starting TutorFlow Frontend Client...
start cmd /k "cd client && npm run dev"

echo Both servers are starting up! Please wait a few seconds.
