import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { StorageService } from '../../common/storage/storage.service';
import { Document } from './entities/document.entity';
import { ListDocumentsDto } from './dto/list-documents.dto';
import { resolveFileType, SUPPORTED_EXTENSIONS } from './document.constants';
import { DocumentProcessorService } from './services/document-processor.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    private readonly storageService: StorageService,
    private readonly processor: DocumentProcessorService,
  ) {}

  async upload(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<Document> {
    if (!file) throw new BadRequestException('Please choose a file to upload');

    // Multer decodes multipart filenames as latin1.
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const fileType = resolveFileType(fileName);
    if (!fileType) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      );
    }

    const storagePath = await this.storageService.upload(
      `documents/${userId}/${randomUUID()}${extname(fileName).toLowerCase()}`,
      file.buffer,
      file.mimetype,
    );

    const document = await this.documents.save(
      this.documents.create({
        userId,
        fileName,
        fileType,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
      }),
    );

    // Extraction and embedding can take a while, so the client polls the status instead of waiting.
    void this.processor.process(document, file.buffer);

    const {
      storagePath: _storagePath,
      isDelete: _isDelete,
      ...uploaded
    } = document;
    return uploaded as Document;
  }

  list(
    userId: string,
    { search, type }: ListDocumentsDto,
  ): Promise<Document[]> {
    return this.documents.find({
      where: {
        userId,
        isDelete: 0,
        ...(search && { fileName: ILike(`%${escapeLikePattern(search)}%`) }),
        ...(type && { fileType: type }),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Document> {
    const document = await this.documents.findOne({
      where: { id, userId, isDelete: 0 },
    });
    if (!document) throw new NotFoundException('Document not found');

    return document;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.documents.update(id, { isDelete: 1 });
  }
}

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');
