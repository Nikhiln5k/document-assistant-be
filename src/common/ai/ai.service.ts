import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouter } from '@openrouter/sdk';
import type { RequestOptions } from '@openrouter/sdk/lib/sdks.js';
import { AiChatOptions, AiMessage } from './ai.types';

// The free embedding endpoint fails ("service inference failed") when a request
// carries more than one input, so each text is sent on its own, a few at a time.
const EMBEDDING_CONCURRENCY = 4;

// Must match the VECTOR(1536) column in document_chunks.
export const EMBEDDING_DIMENSIONS = 1536;

// Free models are rate limited upstream quite often, so 429s are worth retrying too.
const REQUEST_OPTIONS: RequestOptions = { retryCodes: ['429', '5XX'] };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenRouter;
  private readonly chatModels: string[];
  private readonly embeddingModel: string;

  constructor(configService: ConfigService) {
    this.client = new OpenRouter({
      apiKey: configService.getOrThrow<string>('OPENROUTER_API_KEY'),
      timeoutMs: 90_000,
      retryConfig: {
        strategy: 'backoff',
        backoff: {
          initialInterval: 2_000,
          maxInterval: 10_000,
          exponent: 2,
          maxElapsedTime: 30_000,
        },
        retryConnectionErrors: true,
      },
    });

    // OpenRouter tries the models in order, so the second one is a fallback.
    this.chatModels = [
      configService.get<string>('OPENROUTER_CHAT_MODEL') ??
        'google/gemma-4-31b-it:free',
      configService.get<string>('OPENROUTER_FALLBACK_CHAT_MODEL') ??
        'google/gemma-4-26b-a4b-it:free',
    ];
    this.embeddingModel =
      configService.get<string>('OPENROUTER_EMBEDDING_MODEL') ??
      'nvidia/nemotron-3.5-embed-1b:free';
  }

  async chat(
    messages: AiMessage[],
    options: AiChatOptions = {},
  ): Promise<string> {
    const result = await this.call('chat', () =>
      this.client.chat.send(
        {
          chatRequest: {
            models: this.chatModels,
            messages,
            temperature: options.temperature ?? 0.3,
            maxTokens: options.maxTokens,
          },
        },
        REQUEST_OPTIONS,
      ),
    );

    const content = result.choices[0]?.message.content;
    const reply = typeof content === 'string' ? content.trim() : '';
    if (!reply) {
      throw new ServiceUnavailableException('AI returned an empty response');
    }

    return reply;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: (number[] | undefined)[] = new Array(texts.length);
    let next = 0;

    const worker = async () => {
      while (next < texts.length) {
        const index = next++;
        results[index] = await this.embedOne(texts[index]);
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(EMBEDDING_CONCURRENCY, texts.length) },
        worker,
      ),
    );

    const embeddings = results.filter((embedding) => embedding !== undefined);
    if (embeddings.length !== texts.length) {
      throw new ServiceUnavailableException(
        'AI returned an incomplete embedding response',
      );
    }

    return embeddings;
  }

  private async embedOne(text: string): Promise<number[] | undefined> {
    const response = await this.call('embeddings', () =>
      this.client.embeddings.generate(
        {
          requestBody: {
            model: this.embeddingModel,
            input: text,
            dimensions: EMBEDDING_DIMENSIONS,
          },
        },
        REQUEST_OPTIONS,
      ),
    );

    const embedding =
      typeof response === 'string' ? undefined : response.data[0]?.embedding;
    return Array.isArray(embedding) ? embedding : undefined;
  }

  private async call<T>(label: string, request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      this.logger.error(
        `OpenRouter ${label} request failed`,
        error instanceof Error ? error.message : error,
      );
      throw new ServiceUnavailableException(
        'AI service is busy right now, please try again shortly',
      );
    }
  }
}
