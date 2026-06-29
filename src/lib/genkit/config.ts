// src/lib/genkit/config.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { geminiPro } from 'genkit/models';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: geminiPro,
  temperature: 0.2,
});
