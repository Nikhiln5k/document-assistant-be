import {
  HttpException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFParse } from 'pdf-parse';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import { AiService } from '../../../common/ai/ai.service';
import {
  Document,
  DocumentFileType,
  DocumentStatus,
} from '../entities/document.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';
import { splitIntoChunks } from '../utils/text-chunker';

const IMAGE_PROMPT =
  'Transcribe all readable text in this image, then describe its content in detail ' +
  '(tables, charts, diagrams, figures and their values) so questions can be answered about it later. ' +
  'Reply in plain text only.';

/**
 * Turns an uploaded file into searchable chunks: extract text, split it, embed each piece.
 * Runs in the background after upload and records the outcome on the document's status.
 */
@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
  ) {}

  async process(document: Document, file: Buffer): Promise<void> {
    try {
      const text = await this.extractText(document, file);
      const contents = splitIntoChunks(text);
      if (!contents.length) {
        throw new UnprocessableEntityException(
          'No readable text was found in this document',
        );
      }

      const embeddings = await this.aiService.embed(contents);

      await this.documents.manager.transaction(async (manager) => {
        await manager.insert(
          DocumentChunk,
          contents.map((content, index) => ({
            documentId: document.id,
            chunkIndex: index,
            content,
            embedding: embeddings[index],
          })),
        );
        await manager.update(Document, document.id, {
          status: DocumentStatus.Processed,
          errorMessage: null,
        });
      });
    } catch (error) {
      this.logger.error(
        `Processing failed for document ${document.id}`,
        error instanceof Error ? error.stack : error,
      );

      // Only messages we raised ourselves are safe to show to the user.
      const errorMessage =
        error instanceof HttpException
          ? error.message
          : 'This file could not be read';
      await this.documents
        .update(document.id, { status: DocumentStatus.Failed, errorMessage })
        .catch(() => undefined);
    }
  }

  private async extractText(document: Document, file: Buffer): Promise<string> {
    switch (document.fileType) {
      case DocumentFileType.Pdf:
        return this.readPdf(file);
      case DocumentFileType.Excel:
        return document.fileName.toLowerCase().endsWith('.csv')
          ? file.toString('utf8')
          : this.readSpreadsheet(file);
      case DocumentFileType.Word:
        return (await mammoth.extractRawText({ buffer: file })).value;
      case DocumentFileType.Image:
        return this.describeImage(file, document.mimeType ?? 'image/png');
      case DocumentFileType.Text:
        return file.toString('utf8');
    }
  }

  private async readPdf(file: Buffer): Promise<string> {
    const parser = new PDFParse({ data: file });
    try {
      const { text } = await parser.getText();
      return text;
    } finally {
      await parser.destroy();
    }
  }

  private async readSpreadsheet(file: Buffer): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file as unknown as ExcelJS.Buffer);

    return workbook.worksheets
      .map((sheet) => {
        const rows: string[] = [];
        sheet.eachRow((row) => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.text));
          rows.push(cells.join(' | '));
        });
        return `Sheet: ${sheet.name}\n${rows.join('\n')}`;
      })
      .join('\n\n');
  }

  private describeImage(file: Buffer, mimeType: string): Promise<string> {
    return this.aiService.chat(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: IMAGE_PROMPT },
            {
              type: 'image_url',
              imageUrl: {
                url: `data:${mimeType};base64,${file.toString('base64')}`,
              },
            },
          ],
        },
      ],
      { temperature: 0 },
    );
  }
}
