import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
import path from "path";
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import sessionRoutes from './routes/sessionRoutes';
import aiRoutes from './routes/aiRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ai', aiRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

import { initMailer } from "./lib/mailer";

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await initMailer();
  console.log(`Server is running on port ${PORT}`);
});
