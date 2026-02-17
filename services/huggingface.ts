import type { AIService, ChatMessage } from '../types';

const HF_TOKEN = process.env.HF_TOKEN;

export const huggingfaceService: AIService = {
  name: 'Hugging Face Llama 3.1 8B',
  async chat(messages: ChatMessage[]) {
    if (!HF_TOKEN) {
      throw new Error('HF_TOKEN is not set');
    }

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify({
        messages,
        model: 'meta-llama/Llama-3.1-8B-Instruct:novita',
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const body = response.body;
    if (!body) {
      throw new Error('Hugging Face response has no body');
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
