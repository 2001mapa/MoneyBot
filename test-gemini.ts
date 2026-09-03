import { GoogleGenerativeAI } from '@google/generative-ai'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd());

async function testGemini() {
  console.log('Testing Gemini API...');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  try {
    const result = await model.generateContent("Hola, esto es una prueba");
    console.log('Response:', result.response.text());
  } catch (err) {
    console.error('Error fetching from Gemini:', err);
  }
}

testGemini();
