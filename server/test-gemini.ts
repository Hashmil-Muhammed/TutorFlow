import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log("Testing with API Key:", apiKey);
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

async function test() {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Hello",
    });
    console.log("Success:", response.text);
  } catch (error: any) {
    console.error("Error:", error.message || error);
  }
}
test();
