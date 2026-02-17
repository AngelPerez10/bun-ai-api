import type { ChatMessage } from '../types';
import { config } from '../config';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateChatRequest(body: any): { messages: ChatMessage[] } {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  if (!Array.isArray(body.messages)) {
    throw new ValidationError('messages must be an array');
  }

  if (body.messages.length === 0) {
    throw new ValidationError('messages array cannot be empty');
  }

  if (body.messages.length > config.maxMessagesPerRequest) {
    throw new ValidationError(`messages array cannot exceed ${config.maxMessagesPerRequest} items`);
  }

  for (let i = 0; i < body.messages.length; i++) {
    const msg = body.messages[i];

    if (!msg || typeof msg !== 'object') {
      throw new ValidationError(`messages[${i}] must be an object`);
    }

    if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
      throw new ValidationError(`messages[${i}].role must be 'user', 'assistant', or 'system'`);
    }

    if (typeof msg.content !== 'string') {
      throw new ValidationError(`messages[${i}].content must be a string`);
    }

    if (msg.content.length > config.maxMessageLength) {
      throw new ValidationError(`messages[${i}].content exceeds maximum length of ${config.maxMessageLength}`);
    }
  }

  return { messages: body.messages };
}
