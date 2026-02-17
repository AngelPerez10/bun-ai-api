import type { AIService, ChatMessage } from '../types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const geminiService: AIService = {
  name: 'Gemini 3 Flash',
  async chat(messages: ChatMessage[]) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const userContent = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: userContent },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: any = await response.json();
    const content: string =
      data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';

    return (async function* () {
      if (content) {
        yield content;
      }
    })();
  },
};
