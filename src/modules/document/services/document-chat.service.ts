import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../../common/ai/ai.service';
import { ChatMessage } from '../entities/chat-message.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { DocumentStatus } from '../entities/document.entity';
import { DocumentService } from '../document.service';

const CONTEXT_CHUNK_LIMIT = 6;
const HISTORY_LIMIT = 10;

export interface ChatExchange {
  question: ChatMessage;
  answer: ChatMessage;
}

@Injectable()
export class DocumentChatService {
  constructor(
    private readonly aiService: AiService,
    private readonly documentService: DocumentService,
    @InjectRepository(ChatMessage)
    private readonly messages: Repository<ChatMessage>,
    @InjectRepository(DocumentChunk)
    private readonly chunks: Repository<DocumentChunk>,
  ) {}

  async getHistory(userId: string, documentId: string): Promise<ChatMessage[]> {
    await this.documentService.findOne(userId, documentId);

    return this.messages.find({
      where: { userId, documentId },
      order: { createdAt: 'ASC' },
    });
  }

  async clearHistory(userId: string, documentId: string): Promise<void> {
    await this.documentService.findOne(userId, documentId);
    await this.messages.delete({ userId, documentId });
  }

  async ask(
    userId: string,
    documentId: string,
    question: string,
  ): Promise<ChatExchange> {
    const askedAt = new Date();
    const document = await this.documentService.findOne(userId, documentId);

    if (document.status === DocumentStatus.Processing) {
      throw new BadRequestException(
        'This document is still being processed, please try again in a moment',
      );
    }
    if (document.status === DocumentStatus.Failed) {
      throw new BadRequestException(
        'This document could not be processed, please upload it again',
      );
    }

    const [questionEmbedding] = await this.aiService.embed([question]);
    const [excerpts, history] = await Promise.all([
      this.findRelevantExcerpts(documentId, questionEmbedding),
      this.messages.find({
        where: { userId, documentId },
        order: { createdAt: 'DESC' },
        take: HISTORY_LIMIT,
      }),
    ]);

    const reply = await this.aiService.chat([
      {
        role: 'system',
        content: buildSystemPrompt(document.fileName, excerpts),
      },
      ...history
        .reverse()
        .map((item) => ({ role: item.role, content: item.message })),
      { role: 'user', content: question },
    ]);

    // Explicit timestamps keep the question ordered before the answer.
    const [savedQuestion, savedAnswer] = await this.messages.save([
      this.messages.create({
        userId,
        documentId,
        role: 'user',
        message: question,
        createdAt: askedAt,
      }),
      this.messages.create({
        userId,
        documentId,
        role: 'assistant',
        message: reply,
        createdAt: new Date(),
      }),
    ]);

    return { question: savedQuestion, answer: savedAnswer };
  }

  private async findRelevantExcerpts(
    documentId: string,
    embedding: number[],
  ): Promise<string[]> {
    const rows: { content: string; chunk_index: number }[] =
      await this.chunks.query(
        `SELECT content, chunk_index
           FROM document_chunks
          WHERE document_id = $1
          ORDER BY embedding <=> $2::vector
          LIMIT $3`,
        [documentId, `[${embedding.join(',')}]`, CONTEXT_CHUNK_LIMIT],
      );

    // Present the excerpts in reading order rather than by similarity.
    return rows
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map((row) => row.content);
  }
}

function buildSystemPrompt(fileName: string, excerpts: string[]): string {
  return [
    `You are DocuMind, an assistant that answers questions about the document "${fileName}".`,
    'Answer using only the document excerpts below. If the answer is not in them, say that you could not find it in the document.',
    'Be concise, and use markdown lists or bold figures when it makes the answer easier to read.',
    '',
    'Document excerpts:',
    excerpts.join('\n---\n'),
  ].join('\n');
}
