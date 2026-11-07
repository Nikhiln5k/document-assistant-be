import type { ChatMessages } from '@openrouter/sdk/models';

export type AiMessage = ChatMessages;

export interface AiChatOptions {
  temperature?: number;
  maxTokens?: number;
}
