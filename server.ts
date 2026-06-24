import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

// Gemini API Route
app.post('/api/gemini/summarize', async (req, res) => {
  try {
    const { prompt, content } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    // Add instruction to use search
    const combinedPrompt = `${prompt}\n\nHere is the content to analyze:\n${content}\n\nIf you use search, provide the explanation based on the search results.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: combinedPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    res.json({ 
      result: response.text,
      sources: chunks.map((c: any) => c.web).filter(Boolean)
    });
  } catch (error: any) {
    console.error('Error with Gemini API:', error);
    let errorMessage = error.message || 'Failed to process AI request';
    
    // Check if it's a 429 quota error and format it nicer
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      errorMessage = 'API quota exceeded. Please wait a moment and try again, or check your API key billing details.';
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/gemini/flashcards', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    const prompt = `Generate a set of flashcards summarizing the key concepts from the following text. Return a JSON array where each object has a 'front' (the question or concept) and a 'back' (the answer or definition).\n\nText: ${content}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });
    
    res.json({ result: JSON.parse(response.text) });
  } catch (error: any) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

app.post('/api/gemini/quiz', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    const prompt = `Generate a multiple choice quiz based on the following text. Return a JSON array where each object has a 'question' (string), 'options' (array of 4 string options), 'correctAnswer' (string, must exactly match one of the options), and 'explanation' (string explaining the correct answer).\n\nText: ${content}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });
    
    res.json({ result: JSON.parse(response.text) });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
