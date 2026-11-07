import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../common/storage/storage.module';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { DocumentProcessorService } from './services/document-processor.service';
import { DocumentChatService } from './services/document-chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentChunk, ChatMessage]),
    StorageModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentProcessorService, DocumentChatService],
})
export class DocumentModule {}
