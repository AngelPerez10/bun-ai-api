import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { AIService, ChatMessage } from '../types';

const cerebras = new Cerebras();
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'llama3.1-8b';

export const cerebrasService: AIService = {
  name: 'Cerebras',
  async chat(messages: ChatMessage[]) {
    const stream = await cerebras.chat.completions.create({
      messages: messages as any,
      model: CEREBRAS_MODEL,
      stream: true,
      max_completion_tokens: 2048,
      temperature: 0.2,
      top_p: 1
    });

    return (async function* () {
      for await (const chunk of stream) {
        yield (chunk as any).choices[0]?.delta?.content || ''
      }
    })()
  }
}