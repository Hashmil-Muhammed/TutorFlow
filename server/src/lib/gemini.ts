import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
