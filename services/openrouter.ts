import type { AIService, ChatMessage } from '../types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export const openrouterService: AIService = {
  name: 'OpenRouter (DeepSeek)',
  async chat(messages: ChatMessage[]) {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const body = response.body;
    if (!body) {
      throw new Error('OpenRouter response has no body');
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();

    return (async function* () {
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const lines = part.split('\n');
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;

            const data = line.slice('data:'.length).trim();
            if (!data) continue;
            if (data === '[DONE]') return;

            let json: any;
            try {
              json = JSON.parse(data);
            } catch {
              continue;
            }

            const delta: string = json.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              yield delta;
            }
          }
        }
      }
    })();
  },
};
