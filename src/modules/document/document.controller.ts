import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '@nestjs/authentication';
import { ResponseMsg } from '../../common/decorators/response-msg/response-msg.decorator';
import { DocumentService } from './document.service';
import { DocumentChatService } from './services/document-chat.service';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MAX_FILE_SIZE_BYTES } from './document.constants';

@Controller('document')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly chatService: DocumentChatService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  @ResponseMsg('Document uploaded successfully')
  upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.documentService.upload(userId, file);
  }

  @Get()
  list(@CurrentUser('id') userId: string, @Query() filters: ListDocumentsDto) {
    return this.documentService.list(userId, filters);
  }

  @Get(':id')
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentService.findOne(userId, id);
  }

  @Delete(':id')
  @ResponseMsg('Document deleted successfully')
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentService.remove(userId, id);
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.getHistory(userId, id);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { message }: SendMessageDto,
  ) {
    return this.chatService.ask(userId, id, message);
  }

  @Delete(':id/messages')
  @ResponseMsg('Chat cleared successfully')
  clearMessages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.clearHistory(userId, id);
  }
}
